import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import { createLiveKitToken, getLiveKitUrl } from "./livekit.js";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listRooms,
} from "./rooms.js";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", (_req, res) => {
  res.json({ livekitUrl: getLiveKitUrl() });
});

app.post("/api/rooms", (req, res) => {
  const { hostName, capacity } = req.body as {
    hostName?: string;
    capacity?: number;
  };

  if (!hostName?.trim()) {
    res.status(400).json({ error: "hostName is required" });
    return;
  }

  const cap = capacity ?? 8;
  if (cap < 2 || cap > 50) {
    res.status(400).json({ error: "capacity must be between 2 and 50" });
    return;
  }

  const room = createRoom(hostName.trim(), cap);
  res.status(201).json({
    room,
    invitePath: `/room/${room.id}`,
  });
});

app.get("/api/rooms", (_req, res) => {
  res.json({ rooms: listRooms() });
});

app.get("/api/rooms/:roomId", (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json({ room });
});

app.post("/api/rooms/:roomId/join", async (req, res) => {
  const { participantName } = req.body as { participantName?: string };

  if (!participantName?.trim()) {
    res.status(400).json({ error: "participantName is required" });
    return;
  }

  const result = joinRoom(req.params.roomId);
  if ("error" in result) {
    res.status(result.error === "Room not found" ? 404 : 403).json({
      error: result.error,
    });
    return;
  }

  const participantId = randomUUID();
  const token = await createLiveKitToken(
    req.params.roomId,
    participantName.trim(),
    participantId
  );

  res.json({
    room: result.room,
    token,
    participantId,
    livekitUrl: getLiveKitUrl(),
  });
});

const socketRooms = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  let currentRoomId: string | null = null;

  socket.on("join-room", (roomId: string) => {
    if (currentRoomId) {
      socket.leave(currentRoomId);
      socketRooms.get(currentRoomId)?.delete(socket.id);
    }

    currentRoomId = roomId;
    socket.join(roomId);

    if (!socketRooms.has(roomId)) {
      socketRooms.set(roomId, new Set());
    }
    socketRooms.get(roomId)!.add(socket.id);

    const room = getRoom(roomId);
    io.to(roomId).emit("room-update", { room });
  });

  socket.on("leave-room", () => {
    if (!currentRoomId) return;

    socket.leave(currentRoomId);
    socketRooms.get(currentRoomId)?.delete(socket.id);

    leaveRoom(currentRoomId);
    const room = getRoom(currentRoomId);
    if (room) {
      io.to(currentRoomId).emit("room-update", { room });
    }

    currentRoomId = null;
  });

  socket.on("disconnect", () => {
    if (!currentRoomId) return;

    socketRooms.get(currentRoomId)?.delete(socket.id);
    leaveRoom(currentRoomId);
    const room = getRoom(currentRoomId);
    if (room) {
      io.to(currentRoomId).emit("room-update", { room });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

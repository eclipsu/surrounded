import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import { createLiveKitToken, getLiveKitUrl, getAppUrl, getPublicHost } from "./livekit.js";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveSession,
  listRooms,
} from "./rooms.js";

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_URLS = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (CLIENT_URLS.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && LAN_ORIGIN.test(origin)) {
    return true;
  }
  return false;
}

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    callback(null, isAllowedOrigin(origin));
  },
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { ...corsOptions, methods: ["GET", "POST"] },
});

app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  let livekit = false;
  try {
    const r = await fetch("http://127.0.0.1:7880/");
    livekit = r.ok;
  } catch {
    livekit = false;
  }
  res.json({ ok: true, livekit });
});

app.get("/api/config", (req, res) => {
  res.json({
    livekitUrl: getLiveKitUrl(req),
    appUrl: getAppUrl(req),
    publicHost: getPublicHost(req),
  });
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
  const { participantName, sessionId } = req.body as {
    participantName?: string;
    sessionId?: string;
  };

  if (!participantName?.trim()) {
    res.status(400).json({ error: "participantName is required" });
    return;
  }

  if (!sessionId?.trim()) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const result = joinRoom(req.params.roomId, sessionId.trim());
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
    livekitUrl: getLiveKitUrl(req),
  });
});

app.post("/api/rooms/:roomId/leave", (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };

  if (!sessionId?.trim()) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const room = leaveSession(req.params.roomId, sessionId.trim());
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  io.to(req.params.roomId).emit("room-update", { room });
  res.json({ room });
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
    if (room) {
      io.to(roomId).emit("room-update", { room });
    }
  });

  socket.on("disconnect", () => {
    if (!currentRoomId) return;

    socketRooms.get(currentRoomId)?.delete(socket.id);
    currentRoomId = null;
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (CLIENT_URLS[0] && !CLIENT_URLS[0].includes("localhost")) {
    console.log(`LAN clients: ${CLIENT_URLS[0].replace(/:\d+$/, `:${PORT}`)} (API)`);
  }
});

import { randomUUID } from "crypto";

export interface Room {
  id: string;
  capacity: number;
  hostName: string;
  participantCount: number;
  createdAt: number;
}

interface RoomRecord {
  capacity: number;
  hostName: string;
  sessions: Set<string>;
  createdAt: number;
}

const rooms = new Map<string, RoomRecord>();

export function createRoom(hostName: string, capacity: number): Room {
  const id = randomUUID().slice(0, 8);
  const record: RoomRecord = {
    capacity,
    hostName,
    sessions: new Set(),
    createdAt: Date.now(),
  };
  rooms.set(id, record);
  return toPublicRoom(id, record);
}

export function getRoom(id: string): Room | null {
  const record = rooms.get(id);
  if (!record) return null;
  return toPublicRoom(id, record);
}

export function joinRoom(
  id: string,
  sessionId: string
): { room: Room } | { error: string } {
  const record = rooms.get(id);
  if (!record) return { error: "Room not found" };

  if (record.sessions.has(sessionId)) {
    return { room: toPublicRoom(id, record) };
  }

  if (record.sessions.size >= record.capacity) {
    return { error: "Room is full" };
  }

  record.sessions.add(sessionId);
  return { room: toPublicRoom(id, record) };
}

export function leaveSession(id: string, sessionId: string): Room | null {
  const record = rooms.get(id);
  if (!record) return null;

  record.sessions.delete(sessionId);
  return toPublicRoom(id, record);
}

export function listRooms(): Room[] {
  return Array.from(rooms.entries())
    .filter(([, record]) => record.sessions.size > 0)
    .map(([id, record]) => toPublicRoom(id, record));
}

function toPublicRoom(id: string, record: RoomRecord): Room {
  return {
    id,
    capacity: record.capacity,
    hostName: record.hostName,
    participantCount: record.sessions.size,
    createdAt: record.createdAt,
  };
}

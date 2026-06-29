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
  participantCount: number;
  createdAt: number;
}

const rooms = new Map<string, RoomRecord>();

export function createRoom(hostName: string, capacity: number): Room {
  const id = randomUUID().slice(0, 8);
  const record: RoomRecord = {
    capacity,
    hostName,
    participantCount: 0,
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

export function joinRoom(id: string): { room: Room } | { error: string } {
  const record = rooms.get(id);
  if (!record) return { error: "Room not found" };
  if (record.participantCount >= record.capacity) {
    return { error: "Room is full" };
  }
  record.participantCount += 1;
  return { room: toPublicRoom(id, record) };
}

export function leaveRoom(id: string): void {
  const record = rooms.get(id);
  if (!record) return;
  record.participantCount = Math.max(0, record.participantCount - 1);
  if (record.participantCount === 0) {
    rooms.delete(id);
  }
}

export function listRooms(): Room[] {
  return Array.from(rooms.entries()).map(([id, record]) =>
    toPublicRoom(id, record)
  );
}

function toPublicRoom(id: string, record: RoomRecord): Room {
  return {
    id,
    capacity: record.capacity,
    hostName: record.hostName,
    participantCount: record.participantCount,
    createdAt: record.createdAt,
  };
}

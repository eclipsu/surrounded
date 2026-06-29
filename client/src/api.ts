export interface Room {
  id: string;
  capacity: number;
  hostName: string;
  participantCount: number;
  createdAt: number;
}

export interface JoinResponse {
  room: Room;
  token: string;
  participantId: string;
  livekitUrl: string;
}

const API_BASE = "/api";

export async function createRoom(
  hostName: string,
  capacity: number
): Promise<{ room: Room; invitePath: string }> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostName, capacity }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to create room");
  }
  return res.json();
}

export async function getRoom(roomId: string): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Room not found");
  }
  const data = await res.json();
  return data.room;
}

export async function joinRoom(
  roomId: string,
  participantName: string
): Promise<JoinResponse> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantName }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to join room");
  }
  return res.json();
}

export async function listRooms(): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/rooms`);
  const data = await res.json();
  return data.rooms;
}

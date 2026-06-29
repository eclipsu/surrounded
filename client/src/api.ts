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

export interface AppConfig {
  livekitUrl: string;
  appUrl: string;
  publicHost: string;
}

/** Trust server hostname; only align ws/wss protocol with the page. */
export function resolveLiveKitUrl(serverUrl: string): string {
  if (typeof window === "undefined") return serverUrl;

  const proto = window.location.protocol === "https:" ? "wss" : "ws";

  try {
    const url = new URL(serverUrl);
    url.protocol = proto + ":";
    url.pathname = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return serverUrl.replace(/\/$/, "");
  }
}

export async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error("Failed to load app config");
  return res.json();
}

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
  participantName: string,
  sessionId: string
): Promise<JoinResponse> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantName, sessionId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to join room");
  }
  return res.json();
}

export async function leaveRoom(
  roomId: string,
  sessionId: string
): Promise<void> {
  await fetch(`${API_BASE}/rooms/${roomId}/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
    keepalive: true,
  });
}

export async function listRooms(): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/rooms`);
  const data = await res.json();
  return data.rooms;
}

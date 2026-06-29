import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY ?? "devkey";
const apiSecret = process.env.LIVEKIT_API_SECRET ?? "secret";

export async function createLiveKitToken(
  roomName: string,
  participantName: string,
  participantId: string
): Promise<string> {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}

export function getLiveKitUrl(): string {
  return process.env.LIVEKIT_URL ?? "ws://localhost:7880";
}

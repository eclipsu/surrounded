import { AccessToken } from "livekit-server-sdk";
import type { Request } from "express";
import { isDockerIp } from "./network.js";

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

function hostnameFromRequest(req?: Request): string | null {
  if (!req) return null;

  const forwarded = req.headers["x-forwarded-host"];
  const hostHeader =
    (typeof forwarded === "string" ? forwarded : req.headers.host) ?? "";
  const hostname = hostHeader.split(":")[0];
  if (!hostname) return null;

  return hostname === "localhost" ? "127.0.0.1" : hostname;
}

function isSecureRequest(req?: Request): boolean {
  if (process.env.USE_HTTPS === "true") return true;
  if (req?.headers["x-forwarded-proto"] === "https") return true;
  return false;
}

/** Authoritative public host — never a Docker bridge IP like 172.18.0.1 */
export function getPublicHost(req?: Request): string {
  const envHost = process.env.PUBLIC_HOST?.trim();
  if (envHost) {
    return envHost === "localhost" ? "127.0.0.1" : envHost;
  }

  const fromRequest = hostnameFromRequest(req);
  if (fromRequest && !isDockerIp(fromRequest)) {
    return fromRequest;
  }

  return "127.0.0.1";
}

const CLIENT_PORT = process.env.CLIENT_PORT ?? "5173";

/** LiveKit signaling URL */
export function getLiveKitUrl(req?: Request): string {
  const host = getPublicHost(req);

  // HTTPS → proxy LiveKit through Vite on same port (paths /rtc/*)
  if (isSecureRequest(req)) {
    return `wss://${host}:${CLIENT_PORT}`;
  }

  return `ws://${host}:7880`;
}

/** Public app URL for invite links */
export function getAppUrl(req?: Request): string {
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL.replace(/\/$/, "");
  }

  const host = getPublicHost(req);
  const proto = isSecureRequest(req) ? "https" : "http";
  return `${proto}://${host}:5173`;
}

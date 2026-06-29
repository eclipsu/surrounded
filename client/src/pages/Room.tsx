import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  joinRoom,
  leaveRoom,
  getRoom,
  resolveLiveKitUrl,
  fetchAppConfig,
  type Room as RoomInfo,
} from "../api";
import { getSocketUrl } from "../socket";
import { createSessionId } from "../session";
import { isBadClientHost } from "../network";
import RoomLiveKit from "../components/RoomLiveKit";

interface Props {
  displayName: string;
}

function LiveKitConnectionError({
  onRetry,
  livekitUrl,
  detail,
}: {
  onRetry: () => void;
  livekitUrl?: string | null;
  detail?: string | null;
}) {
  return (
    <div className="card">
      <p className="error" style={{ marginTop: 0 }}>
        Could not connect to voice/video.
      </p>
      {livekitUrl && (
        <p className="muted" style={{ wordBreak: "break-all" }}>
          Server: <code>{livekitUrl}</code>
        </p>
      )}
      {detail && (
        <p className="muted" style={{ wordBreak: "break-word" }}>
          {detail}
        </p>
      )}
      <p className="muted">
        Restart everything:{" "}
        <code>
          docker compose down livekit && docker compose up livekit -d && npm run
          dev:lan
        </code>
        . Open the <code>https://10.x.x.x:5173</code> URL (not :7880).
      </p>
      <button type="button" className="secondary" onClick={onRetry}>
        Retry connection
      </button>
    </div>
  );
}

export default function Room({ displayName }: Props) {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [livekitFailed, setLivekitFailed] = useState(false);
  const [livekitError, setLivekitError] = useState<string | null>(null);
  const [livekitKey, setLivekitKey] = useState(0);
  const [appBaseUrl, setAppBaseUrl] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const intentionalLeaveRef = useRef(false);

  const wrongHost =
    typeof window !== "undefined" &&
    isBadClientHost(window.location.hostname);

  const inviteUrl =
    roomId && appBaseUrl
      ? `${appBaseUrl}/room/${roomId}`
      : typeof window !== "undefined" && roomId
        ? `${window.location.origin}/room/${roomId}`
        : "";

  useEffect(() => {
    fetchAppConfig()
      .then((cfg) => setAppBaseUrl(cfg.appUrl))
      .catch(() => setAppBaseUrl(null));
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const sessionId = createSessionId();
    let cancelled = false;
    let joined = false;
    intentionalLeaveRef.current = false;

    async function connect() {
      setLoading(true);
      setError("");
      setLivekitFailed(false);
      setLivekitError(null);

      try {
        await getRoom(roomId!);
        const result = await joinRoom(roomId!, displayName, sessionId);

        if (cancelled) {
          await leaveRoom(roomId!, sessionId);
          return;
        }

        joined = true;
        sessionIdRef.current = sessionId;
        setRoomInfo(result.room);
        setToken(result.token);
        setLivekitUrl(resolveLiveKitUrl(result.livekitUrl));
        setLivekitKey((k) => k + 1);

        const s = io(getSocketUrl(), {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
        });
        s.emit("join-room", roomId);
        s.on("room-update", ({ room }: { room: RoomInfo }) => {
          setRoomInfo(room);
        });
        socketRef.current = s;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to join room");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (joined && !intentionalLeaveRef.current) {
        leaveRoom(roomId, sessionId);
      }
    };
  }, [roomId, displayName]);

  const handleLiveKitConnected = useCallback(() => {
    setLivekitFailed(false);
    setLivekitError(null);
  }, []);

  const handleLiveKitFailed = useCallback((message: string) => {
    setLivekitFailed(true);
    setLivekitError(message);
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLeave() {
    intentionalLeaveRef.current = true;
    if (roomId && sessionIdRef.current) {
      leaveRoom(roomId, sessionIdRef.current);
      sessionIdRef.current = null;
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    navigate("/");
  }

  function handleRetry() {
    setLivekitFailed(false);
    setLivekitError(null);
    setLivekitKey((k) => k + 1);
  }

  if (!roomId) {
    return (
      <div className="page">
        <p className="error">Invalid room link.</p>
        <Link to="/" style={{ color: "var(--accent)" }}>
          ← Back home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Joining room…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h1>Can&apos;t join</h1>
          <p className="error">{error}</p>
          <Link to="/" style={{ color: "var(--accent)" }}>
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div className="room-header">
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            {roomInfo?.hostName ?? "Room"}&apos;s circle
          </h1>
          <div className="room-meta">
            <span>
              {roomInfo?.participantCount ?? 0}/{roomInfo?.capacity ?? "?"} in
              room
            </span>
            <span>·</span>
            <span>ID {roomId}</span>
          </div>
        </div>
        <button type="button" className="secondary" onClick={handleLeave}>
          Leave
        </button>
      </div>

      {wrongHost && appBaseUrl && (
        <div className="card" style={{ marginBottom: "1.5rem", borderColor: "var(--danger)" }}>
          <p className="error" style={{ marginTop: 0 }}>
            Wrong address — you opened a Docker IP ({window.location.hostname}), not
            your Wi‑Fi IP.
          </p>
          <p className="muted">
            Open{" "}
            <a href={appBaseUrl} style={{ color: "var(--accent)" }}>
              {appBaseUrl}
            </a>{" "}
            instead, then rejoin this room.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <label>Invite link</label>
        <div className="invite-box">
          <input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
          <button type="button" className="secondary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Share this link — anyone can open it and talk (up to room capacity).
        </p>
      </div>

      {livekitFailed ? (
        <LiveKitConnectionError
          onRetry={handleRetry}
          livekitUrl={livekitUrl}
          detail={livekitError}
        />
      ) : token && livekitUrl ? (
        <RoomLiveKit
          key={livekitKey}
          token={token}
          livekitUrl={livekitUrl}
          onConnected={handleLiveKitConnected}
          onFailed={handleLiveKitFailed}
        />
      ) : null}
    </div>
  );
}

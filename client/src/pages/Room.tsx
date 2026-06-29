import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { io, Socket } from "socket.io-client";
import { joinRoom, getRoom, type Room as RoomInfo } from "../api";

interface Props {
  displayName: string;
}

function VideoGrid() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  return (
    <GridLayout tracks={tracks} style={{ height: "auto" }}>
      <ParticipantTile />
    </GridLayout>
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
  const socketRef = useRef<Socket | null>(null);

  const inviteUrl =
    typeof window !== "undefined" && roomId
      ? `${window.location.origin}/room/${roomId}`
      : "";

  const connect = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError("");
    try {
      await getRoom(roomId);
      const result = await joinRoom(roomId, displayName);
      setRoomInfo(result.room);
      setToken(result.token);
      setLivekitUrl(result.livekitUrl);

      const s = io({ path: "/socket.io" });
      s.emit("join-room", roomId);
      s.on("room-update", ({ room }: { room: RoomInfo }) => {
        setRoomInfo(room);
      });
      socketRef.current = s;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }, [roomId, displayName]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.emit("leave-room");
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLeave() {
    socketRef.current?.emit("leave-room");
    socketRef.current?.disconnect();
    socketRef.current = null;
    navigate("/");
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

  if (!token || !livekitUrl || !roomId) return null;

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

      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect
        audio
        video
        onDisconnected={handleLeave}
        style={{ display: "contents" }}
      >
        <div className="video-grid">
          <VideoGrid />
        </div>
        <RoomAudioRenderer />
        <div className="controls-bar">
          <ControlBar controls={{ chat: false, screenShare: false }} />
        </div>
      </LiveKitRoom>
    </div>
  );
}

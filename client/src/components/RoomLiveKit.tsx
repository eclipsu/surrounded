import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
  useConnectionState,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { canUseMediaDevices, mediaDevicesHint } from "../media";

const LIVEKIT_OPTIONS = { webAudioMix: false };
const CONNECT_TIMEOUT_MS = 20_000;

interface Props {
  token: string;
  livekitUrl: string;
  onConnected: () => void;
  onFailed: (message: string) => void;
}

function ConnectTimeout({ onTimeout }: { onTimeout: () => void }) {
  const state = useConnectionState();
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (state === ConnectionState.Connected) return;

    const timer = setTimeout(() => {
      onTimeoutRef.current();
    }, CONNECT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [state]);

  return null;
}

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  if (tracks.length === 0) {
    return (
      <p className="muted" style={{ textAlign: "center", padding: "2rem 0" }}>
        No video tracks yet — enable your camera or wait for others.
      </p>
    );
  }

  return (
    <GridLayout tracks={tracks} style={{ minHeight: 240, width: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function RoomStatus() {
  const participants = useParticipants();
  const state = useConnectionState();
  const room = useRoomContext();
  const local = room.localParticipant;
  const camOn = local.isCameraEnabled;
  const micOn = local.isMicrophoneEnabled;

  if (state !== ConnectionState.Connected) return null;

  return (
    <p className="muted" style={{ textAlign: "center", marginBottom: "1rem" }}>
      {participants.length} in call
      {camOn || micOn
        ? ` · you: ${camOn ? "camera" : ""}${camOn && micOn ? " + " : ""}${micOn ? "mic" : ""}`
        : ""}
    </p>
  );
}

function EnableMediaButton() {
  const room = useRoomContext();
  const [enabling, setEnabling] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const mediaAvailable = canUseMediaDevices();

  async function enableMedia() {
    if (!canUseMediaDevices()) {
      setMediaError(mediaDevicesHint());
      return;
    }

    setEnabling(true);
    setMediaError(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : "Camera/mic permission denied"
      );
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div style={{ textAlign: "center", marginBottom: "1rem" }}>
      <p className="muted">Connected — enable your camera and microphone.</p>
      {!mediaAvailable && (
        <p className="error" style={{ marginBottom: "1rem" }}>
          {mediaDevicesHint()}
        </p>
      )}
      <button
        type="button"
        className="primary"
        onClick={enableMedia}
        disabled={enabling || !mediaAvailable}
      >
        {enabling ? "Enabling…" : "Enable camera & mic"}
      </button>
      {mediaError && <p className="error">{mediaError}</p>}
    </div>
  );
}

function LiveKitInner({ onTimeout }: { onTimeout: () => void }) {
  const state = useConnectionState();
  const room = useRoomContext();
  const [mediaOn, setMediaOn] = useState(false);

  useEffect(() => {
    const check = () => {
      const p = room.localParticipant;
      setMediaOn(p.isCameraEnabled || p.isMicrophoneEnabled);
    };
    check();
    room.localParticipant.on("trackPublished", check);
    room.localParticipant.on("trackUnpublished", check);
    return () => {
      room.localParticipant.off("trackPublished", check);
      room.localParticipant.off("trackUnpublished", check);
    };
  }, [room]);

  if (state !== ConnectionState.Connected) {
    return (
      <>
        <ConnectTimeout onTimeout={onTimeout} />
        <p className="muted" style={{ textAlign: "center", marginBottom: "1rem" }}>
          {state === ConnectionState.Connecting
            ? "Connecting to voice/video…"
            : state === ConnectionState.Reconnecting
              ? "Reconnecting…"
              : "Starting voice/video…"}
        </p>
      </>
    );
  }

  return (
    <>
      <RoomAudioRenderer />
      <RoomStatus />
      {!mediaOn ? (
        <EnableMediaButton />
      ) : (
        <>
          <div className="video-grid">
            <VideoGrid />
          </div>
          <div className="controls-bar">
            <ControlBar controls={{ chat: false, screenShare: false }} />
          </div>
        </>
      )}
    </>
  );
}

function RoomLiveKit({ token, livekitUrl, onConnected, onFailed }: Props) {
  const connectedRef = useRef(false);
  const failedRef = useRef(false);
  const onConnectedRef = useRef(onConnected);
  const onFailedRef = useRef(onFailed);
  onConnectedRef.current = onConnected;
  onFailedRef.current = onFailed;

  const handleConnected = useCallback(() => {
    connectedRef.current = true;
    onConnectedRef.current();
  }, []);

  const handleDisconnected = useCallback(() => {
    if (connectedRef.current && !failedRef.current) {
      failedRef.current = true;
      onFailedRef.current("Connection lost.");
    }
  }, []);

  const handleError = useCallback((err: Error) => {
    if (err.message?.includes("Client initiated disconnect")) return;
    if (failedRef.current) return;
    failedRef.current = true;
    const msg = err.message?.includes("getUserMedia")
      ? mediaDevicesHint() || err.message
      : err.message || "Connection failed";
    onFailedRef.current(msg);
  }, []);

  const handleTimeout = useCallback(() => {
    if (connectedRef.current || failedRef.current) return;
    failedRef.current = true;
    onFailedRef.current(
      "Timed out connecting. Is LiveKit running? Run: docker compose up livekit -d"
    );
  }, []);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect
      audio={false}
      video={false}
      options={LIVEKIT_OPTIONS}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onError={handleError}
    >
      <LiveKitInner onTimeout={handleTimeout} />
    </LiveKitRoom>
  );
}

export default memo(RoomLiveKit);

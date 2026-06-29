export function canUseMediaDevices(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function mediaDevicesHint(): string {
  if (canUseMediaDevices()) return "";

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";

  if (!window.isSecureContext && !isLocal) {
    return (
      "Camera and microphone require HTTPS on a LAN IP. " +
      "Run npm run dev:lan (not npm run dev) and open the https:// URL. " +
      "Accept the browser security warning for the self-signed certificate."
    );
  }

  return "Camera and microphone are not available in this browser.";
}

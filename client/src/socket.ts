/** Socket.io URL — use Vite origin in dev (proxies WS; required for HTTPS pages). */
export function getSocketUrl(): string {
  return window.location.origin;
}

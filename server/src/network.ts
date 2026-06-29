/** Docker bridge networks use 172.17.0.0–172.31.255.255 */
export function isDockerIp(ip: string): boolean {
  const m = /^172\.(\d+)\./.exec(ip);
  if (!m) return false;
  const second = parseInt(m[1], 10);
  return second >= 17 && second <= 31;
}

export function isBadClientHost(hostname: string): boolean {
  if (!hostname) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  return isDockerIp(hostname);
}

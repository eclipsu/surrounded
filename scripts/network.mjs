import os from "os";

/** Docker bridge networks use 172.17.0.0–172.31.255.255 */
export function isDockerIp(ip) {
  const m = /^172\.(\d+)\./.exec(ip);
  if (!m) return false;
  const second = parseInt(m[1], 10);
  return second >= 17 && second <= 31;
}

function isVirtualInterface(name) {
  return /^(docker|veth|br-|virbr|lo|tun|tap|cni|flannel)/i.test(name);
}

function interfaceScore(name) {
  if (/wlan|wlp|wifi/i.test(name)) return 0;
  if (/^(eth|enp|eno|ens)/i.test(name)) return 1;
  return 2;
}

/** Real LAN IP — skips Docker/virtual interfaces (e.g. 172.18.0.1). */
export function getLanIp() {
  const candidates = [];

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (isVirtualInterface(name)) continue;
    for (const net of addrs ?? []) {
      const family = String(net.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (net.internal) continue;
      if (isDockerIp(net.address)) continue;
      candidates.push({ name, ip: net.address });
    }
  }

  candidates.sort((a, b) => interfaceScore(a.name) - interfaceScore(b.name));

  const wifiOrEth = candidates.find(
    (c) => c.ip.startsWith("192.168.") || c.ip.startsWith("10.")
  );
  return wifiOrEth?.ip ?? candidates[0]?.ip ?? "127.0.0.1";
}

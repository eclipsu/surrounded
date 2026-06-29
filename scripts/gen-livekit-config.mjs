import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getLanIp } from "./network.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "livekit.yaml");

function resolveNodeIp() {
  const fromEnv = process.env.PUBLIC_HOST?.trim() || process.env.NODE_IP?.trim();
  if (fromEnv) {
    return fromEnv === "localhost" ? "127.0.0.1" : fromEnv;
  }
  if (process.env.USE_HTTPS === "true") {
    return getLanIp();
  }
  return "127.0.0.1";
}

const nodeIp = resolveNodeIp();

const config = `port: 7880
bind_addresses:
  - "0.0.0.0"
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
  node_ip: ${nodeIp}
keys:
  devkey: secret
`;

fs.writeFileSync(outPath, config);
console.log(`Wrote ${outPath} (rtc.node_ip: ${nodeIp})`);

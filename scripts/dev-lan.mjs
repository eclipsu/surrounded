import { execSync } from "child_process";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { getLanIp } from "./network.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

execSync("node scripts/gen-certs.mjs", { cwd: root, stdio: "inherit" });

const ip = getLanIp();
const clientUrl = `https://${ip}:5173`;
const livekitUrl = `wss://${ip}:5173`;

execSync("node scripts/gen-livekit-config.mjs", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PUBLIC_HOST: ip, USE_HTTPS: "true" },
});

try {
  execSync("docker compose up livekit -d --force-recreate", {
    cwd: root,
    stdio: "inherit",
  });
} catch {
  console.warn("");
  console.warn("  Could not restart LiveKit via docker — run manually:");
  console.warn("  sudo docker compose up livekit -d --force-recreate");
  console.warn("");
}

console.log("");
console.log("  Circle — LAN mode (HTTPS)");
console.log("  ─────────────────────────────────────");
console.log(`  Open this URL:    ${clientUrl}`);
console.log(`  On your phone:    ${clientUrl}  (same Wi‑Fi)`);
console.log(`  LiveKit (proxied): ${livekitUrl}`);
console.log(`  WebRTC media UDP:  ${ip}:7882 and ${ip}:50000-60000`);
console.log("  ─────────────────────────────────────");
console.log("  Do NOT use 172.x.x.x URLs — those are Docker, not your Wi‑Fi.");
console.log("  Accept the certificate warning on each device.");
console.log("");

const env = {
  ...process.env,
  USE_HTTPS: "true",
  PUBLIC_HOST: ip,
  CLIENT_URL: clientUrl,
};

const child = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));

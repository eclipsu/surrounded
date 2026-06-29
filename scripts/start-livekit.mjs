import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

execSync("node scripts/gen-livekit-config.mjs", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log("Starting LiveKit (host network, UDP 7882 + 50000-60000)…");
execSync("docker compose up livekit -d --force-recreate", {
  cwd: root,
  stdio: "inherit",
});

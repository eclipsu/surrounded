import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getLanIp } from "./network.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const certDir = path.join(root, "certs");
const certFile = path.join(certDir, "cert.pem");
const keyFile = path.join(certDir, "key.pem");

const ip = getLanIp();
const san = `DNS:localhost,IP:127.0.0.1,IP:${ip}`;

fs.mkdirSync(certDir, { recursive: true });

console.log(`Generating dev TLS certs for LAN IP ${ip} (SAN: ${san})…`);

execSync(
  `openssl req -x509 -newkey rsa:2048 -keyout "${keyFile}" -out "${certFile}" -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=${san}"`,
  { stdio: "inherit" }
);

console.log(`Certs written to ${certDir}`);

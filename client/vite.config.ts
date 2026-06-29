import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.resolve(__dirname, "../certs");
const useHttps =
  process.env.USE_HTTPS === "true" &&
  fs.existsSync(path.join(certDir, "cert.pem"));

const httpsConfig = useHttps
  ? {
      key: fs.readFileSync(path.join(certDir, "key.pem")),
      cert: fs.readFileSync(path.join(certDir, "cert.pem")),
    }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: httpsConfig,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const host = req.headers.host;
            if (host) {
              proxyReq.setHeader("x-forwarded-host", host);
            }
            if (useHttps) {
              proxyReq.setHeader("x-forwarded-proto", "https");
            }
          });
        },
      },
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
        changeOrigin: true,
      },
      // LiveKit signaling: client hits wss://HOST:5173/rtc/v1 → localhost:7880/rtc/v1
      "/rtc": {
        target: "http://127.0.0.1:7880",
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});

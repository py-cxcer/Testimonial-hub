import type { NextConfig } from "next";
import tls from "node:tls";

// Prevent TLS 1.3 Post-Quantum Kyber key exchange packet fragmentation (MTU > 1500)
// which causes dropped packets and ConnectTimeoutError on Cloudflare/Wi-Fi
if (tls.DEFAULT_ECDH_CURVE === "auto") {
  tls.DEFAULT_ECDH_CURVE = "X25519:P-256";
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.179.235",
    "192.168.179.235:3000",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;


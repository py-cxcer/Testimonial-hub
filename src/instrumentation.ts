export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const tls = await import("node:tls");
    if (tls.DEFAULT_ECDH_CURVE === "auto") {
      tls.DEFAULT_ECDH_CURVE = "X25519:P-256";
    }
  }
}

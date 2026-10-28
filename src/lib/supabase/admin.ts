import "server-only";
import tls from "node:tls";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

if (tls.DEFAULT_ECDH_CURVE === "auto") {
  tls.DEFAULT_ECDH_CURVE = "X25519:P-256";
}

export function createAdminClient() {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase server configuration: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

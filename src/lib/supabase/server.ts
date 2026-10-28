import "server-only";
import tls from "node:tls";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

if (tls.DEFAULT_ECDH_CURVE === "auto") {
  tls.DEFAULT_ECDH_CURVE = "X25519:P-256";
}

export async function createClient() {

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot always write cookies.
          // Session is refreshed in middleware.
        }
      },
    },
  });
}

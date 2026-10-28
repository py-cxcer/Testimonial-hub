import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const isPlaceholder =
    !url || url.includes("placeholder") || url.includes("your-project");

  let user = null;
  if (!isPlaceholder) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      user = null;
    }
  }


  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/spaces") ||
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/wall-of-love") ||
    pathname.startsWith("/embeds") ||
    pathname.startsWith("/billing");

  // For RSC / prefetch requests on protected routes, let Server Components handle the redirect
  // via requireUser() so that Next.js client router receives native RSC redirect payloads
  // instead of a 307 HTTP redirect that causes Flight stream parse errors (chunk.reason.enqueueModel).
  const isRSCRequest =
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") !== null ||
    request.headers.get("purpose") === "prefetch";

  if (!user && isProtectedRoute && !isRSCRequest) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (user && isAuthRoute && !isRSCRequest) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}


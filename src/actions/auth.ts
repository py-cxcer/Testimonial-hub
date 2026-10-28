"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=Email%20and%20password%20are%20required");
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

  if (isPlaceholder) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Supabase credentials not configured yet. Please add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
        )
    );
  }

  let redirectTarget = "/dashboard";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirectTarget = `/login?error=${encodeURIComponent(error.message)}`;
    } else {
      revalidatePath("/", "layout");
      redirectTarget = "/dashboard";
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to sign in. Please verify your connection.";
    redirectTarget = `/login?error=${encodeURIComponent(message)}`;
  }

  redirect(redirectTarget);
}

export async function signupAction(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = (formData.get("displayName") as string) || "";

  if (!email || !password) {
    redirect("/signup?error=Email%20and%20password%20are%20required");
  }

  if (password.length < 6) {
    redirect("/signup?error=Password%20must%20be%20at%20least%206%20characters%20long");
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

  if (isPlaceholder) {
    redirect(
      "/signup?error=" +
        encodeURIComponent(
          "Supabase credentials not configured yet. Please add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
        )
    );
  }

  let redirectTarget = "/dashboard";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      redirectTarget = `/signup?error=${encodeURIComponent(error.message)}`;
    } else {
      revalidatePath("/", "layout");
      redirectTarget = "/dashboard";
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create account. Please verify your connection.";
    redirectTarget = `/signup?error=${encodeURIComponent(message)}`;
  }

  redirect(redirectTarget);
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Silent fail on sign out network error; clear cache and redirect anyway
  }
  revalidatePath("/", "layout");
  redirect("/login");
}


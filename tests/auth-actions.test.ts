import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Auth Server Actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("redirects with validation error if email or password missing in loginAction", async () => {
    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const { loginAction } = await import("@/actions/auth");
    const formData = new FormData();
    formData.set("email", "");
    formData.set("password", "");

    await loginAction(formData);
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=Email%20and%20password%20are%20required"
    );
  });

  it("redirects with helpful error if Supabase credentials are placeholder", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "placeholder-key");

    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const { loginAction } = await import("@/actions/auth");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "secret123");

    await loginAction(formData);
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("Supabase%20credentials%20not%20configured")
    );
  });

  it("gracefully catches network failure / fetch failed and redirects to /login with error", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithPassword: async () => {
            throw new TypeError("fetch failed");
          },
        },
      }),
    }));

    const { loginAction } = await import("@/actions/auth");
    const formData = new FormData();
    formData.set("email", "test@example.com");
    formData.set("password", "secret123");

    await loginAction(formData);
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=fetch%20failed")
    );
  });

  it("redirects to /login with Supabase error message when credentials are invalid", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithPassword: async () => ({
            data: { user: null },
            error: { message: "Invalid login credentials" },
          }),
        },
      }),
    }));

    const { loginAction } = await import("@/actions/auth");
    const formData = new FormData();
    formData.set("email", "wrong@example.com");
    formData.set("password", "wrongpass");

    await loginAction(formData);
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=Invalid%20login%20credentials"
    );
  });

  it("redirects to /dashboard on successful login", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

    const mockRedirect = vi.fn();
    const mockRevalidate = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: mockRevalidate,
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signInWithPassword: async () => ({
            data: { user: { id: "user-1", email: "user@example.com" } },
            error: null,
          }),
        },
      }),
    }));

    const { loginAction } = await import("@/actions/auth");
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "correctpass");

    await loginAction(formData);
    expect(mockRevalidate).toHaveBeenCalledWith("/", "layout");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("validates short password on signup", async () => {
    const mockRedirect = vi.fn();
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));

    const { signupAction } = await import("@/actions/auth");
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "123");

    await signupAction(formData);
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("Password%20must%20be%20at%20least%206%20characters")
    );
  });

  it("logs out and redirects to /login", async () => {
    const mockRedirect = vi.fn();
    const mockSignOut = vi.fn().mockResolvedValue({});
    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: {
          signOut: mockSignOut,
        },
      }),
    }));

    const { logoutAction } = await import("@/actions/auth");
    await logoutAction();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

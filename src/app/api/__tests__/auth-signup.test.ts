import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/signup/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";

describe("POST /api/auth/signup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects missing email", async () => {
    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "pw" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects weak password (< 8 chars)", async () => {
    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "short" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects malformed email", async () => {
    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "Strong1234!" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("calls supabase.auth.signUp on valid input", async () => {
    const signUp = vi.fn(async () => ({ data: { user: { id: "u-1", email: "a@b.com" } }, error: null }));
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ auth: { signUp } });

    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "Strong1234!", full_name: "Alice" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(signUp).toHaveBeenCalledOnce();
    const firstCallArg = (signUp.mock.calls as unknown[][])[0]?.[0];
    expect(firstCallArg).toMatchObject({ email: "a@b.com" });
  });

  it("returns 400 with error message when supabase rejects", async () => {
    const signUp = vi.fn(async () => ({ data: null, error: { message: "User already registered" } }));
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ auth: { signUp } });

    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "Strong1234!" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("signup_failed");
  });
});

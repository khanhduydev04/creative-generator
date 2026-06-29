import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/user-api-keys/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

describe("GET /api/user-api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-api-keys")));
    expect(res.status).toBe(401);
  });

  it("returns array of providers with masked keys for authenticated user", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                { provider: "anthropic", updated_at: "t" },
                { provider: "google", updated_at: "t" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-api-keys")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(2);
    expect(body.keys[0]).toEqual({ provider: "anthropic", masked: "•••••••• (set)", updated_at: "t" });
  });
});

describe("PUT /api/user-api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encrypts and upserts key, returns masked", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const upsertMock = vi.fn(async () => ({ error: null }));
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: () => ({ upsert: upsertMock }),
    });

    const req = new NextRequest(new Request("http://x/api/user-api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", key: "sk-ant-1234567890abcdef" }),
    }));
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u-1", provider: "anthropic" }),
    );
    // Verify encryption: the stored value must not contain the plaintext prefix
    const firstCall = (upsertMock.mock.calls as unknown as [[Record<string, string>]])[0];
    const upsertArg = firstCall[0];
    expect(upsertArg.encrypted_key).not.toContain("sk-ant"); // encrypted
  });

  it("rejects invalid key format", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const req = new NextRequest(new Request("http://x/api/user-api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", key: "" }),
    }));
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation");
  });

  it("rejects unknown provider", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const req = new NextRequest(new Request("http://x/api/user-api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai", key: "sk-something" }),
    }));
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});

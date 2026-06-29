import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/user-concepts/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/user-concepts", () => {
  it("returns 401 unauthenticated", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-concepts")));
    expect(res.status).toBe(401);
  });

  it("returns concepts owned by user", async () => {
    const order = vi.fn(async () => ({
      data: [{ id: "c-1", label: "My Concept", prompt: "...", owner_user_id: "u-1" }],
      error: null,
    }));
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
      from: () => ({ select: () => ({ eq: () => ({ order }) }) }),
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-concepts")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.concepts).toHaveLength(1);
    expect(body.concepts[0].owner_user_id).toBe("u-1");
  });
});

describe("POST /api/user-concepts", () => {
  it("creates with owner_user_id = current user", async () => {
    const single = vi.fn(async () => ({ data: { id: "c-new", label: "X", owner_user_id: "u-1" }, error: null }));
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
      from: () => ({ insert }),
    });

    const req = new NextRequest(new Request("http://x/api/user-concepts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "X", prompt: "do the thing" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
    const firstCallArg = (insert.mock.calls as unknown[][])[0]?.[0];
    expect(firstCallArg).toMatchObject({ owner_user_id: "u-1", label: "X", prompt: "do the thing" });
  });

  it("rejects missing label or prompt", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const req = new NextRequest(new Request("http://x/api/user-concepts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

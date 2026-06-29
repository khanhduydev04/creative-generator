import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { requireUser, ApiError, handleApiError, MissingApiKeyError } from "../user-context";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("requireUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns userId for authenticated + email-verified user", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "2026-04-30T00:00:00Z" } } }) },
    });
    const req = new NextRequest(new Request("http://x"));
    const result = await requireUser(req);
    expect(result.userId).toBe("u-1");
  });

  it("throws ApiError 401 if not authenticated", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const req = new NextRequest(new Request("http://x"));
    await expect(requireUser(req)).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("throws ApiError 403 if email not verified", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: null } } }) },
    });
    const req = new NextRequest(new Request("http://x"));
    await expect(requireUser(req)).rejects.toMatchObject({ status: 403, code: "email_not_verified" });
  });
});

describe("handleApiError", () => {
  it("maps ApiError to NextResponse with status + code", async () => {
    const err = new ApiError(400, "validation", { issues: ["bad"] });
    const res = handleApiError(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "validation", details: { issues: ["bad"] } });
  });

  it("maps MissingApiKeyError to 400 with provider", async () => {
    const err = new MissingApiKeyError("anthropic");
    const res = handleApiError(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "missing_api_key", provider: "anthropic" });
  });

  it("maps unknown error to 500 internal", async () => {
    const res = handleApiError(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "internal" });
  });
});

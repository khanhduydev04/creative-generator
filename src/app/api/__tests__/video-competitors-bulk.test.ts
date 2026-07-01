import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockBulkUpdateStatus, mockBulkDelete, mockStorageRemove } = vi.hoisted(() => ({
  mockBulkUpdateStatus: vi.fn(),
  mockBulkDelete: vi.fn(),
  mockStorageRemove: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "test-user-id" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/services/competitorVideoService", () => ({
  CompetitorVideoService: class {
    bulkUpdateStatus = mockBulkUpdateStatus;
    bulkDelete = mockBulkDelete;
  },
}));

vi.mock("@/services/storageService", () => ({
  StorageService: class {
    remove = mockStorageRemove;
  },
}));

import { PATCH, DELETE } from "../video/competitors/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockStorageRemove.mockResolvedValue(undefined);
});

function makeRequest(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/video/competitors", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/video/competitors (bulk status)", () => {
  it("rejects an empty ids array", async () => {
    const res = await PATCH(makeRequest("PATCH", { ids: [], status: "winner" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid status", async () => {
    const res = await PATCH(makeRequest("PATCH", { ids: ["v1"], status: "pending" }));
    expect(res.status).toBe(400);
  });

  it("updates the given ids and returns the count", async () => {
    mockBulkUpdateStatus.mockResolvedValue(2);
    const res = await PATCH(makeRequest("PATCH", { ids: ["v1", "v2"], status: "rejected" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(2);
    expect(mockBulkUpdateStatus).toHaveBeenCalledWith(["v1", "v2"], "rejected");
  });
});

describe("DELETE /api/video/competitors (bulk delete)", () => {
  it("rejects an empty ids array", async () => {
    const res = await DELETE(makeRequest("DELETE", { ids: [] }));
    expect(res.status).toBe(400);
  });

  it("deletes videos and cleans up storage paths", async () => {
    mockBulkDelete.mockResolvedValue(["generated-audio/v1/a.mp3"]);
    const res = await DELETE(makeRequest("DELETE", { ids: ["v1"] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(1);
    expect(mockStorageRemove).toHaveBeenCalledWith("generated-audio", ["generated-audio/v1/a.mp3"]);
  });

  it("skips storage cleanup when no audio files are attached", async () => {
    mockBulkDelete.mockResolvedValue([]);
    await DELETE(makeRequest("DELETE", { ids: ["v1"] }));
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it("still succeeds if storage cleanup fails", async () => {
    mockBulkDelete.mockResolvedValue(["generated-audio/v1/a.mp3"]);
    mockStorageRemove.mockRejectedValue(new Error("storage down"));
    const res = await DELETE(makeRequest("DELETE", { ids: ["v1"] }));
    expect(res.status).toBe(200);
  });
});

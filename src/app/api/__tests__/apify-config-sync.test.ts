import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  mockGetByBrand,
  mockMarkSynced,
  mockMarkError,
  mockFetchLastSucceededRun,
  mockFetchDatasetItems,
  mockUpsertVideos,
} = vi.hoisted(() => ({
  mockGetByBrand: vi.fn(),
  mockMarkSynced: vi.fn(),
  mockMarkError: vi.fn(),
  mockFetchLastSucceededRun: vi.fn(),
  mockFetchDatasetItems: vi.fn(),
  mockUpsertVideos: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-1" }),
  handleApiError: vi.fn((e: unknown) =>
    NextResponse.json({ error: (e as Error).message }, { status: 500 })
  ),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/brandApifyConfigService", () => ({
  BrandApifyConfigService: class {
    getByBrand = mockGetByBrand;
    markSynced = mockMarkSynced;
    markError = mockMarkError;
  },
}));

vi.mock("@/services/apifySyncService", () => ({
  fetchLastSucceededRun: mockFetchLastSucceededRun,
  fetchDatasetItems: mockFetchDatasetItems,
}));

vi.mock("@/services/competitorVideoService", () => ({
  CompetitorVideoService: class {
    upsertVideos = mockUpsertVideos;
  },
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, APIFY_TOKEN: "tok" };
  vi.clearAllMocks();
  mockGetByBrand.mockResolvedValue({
    apify_task_id: "task-abc",
    is_enabled: true,
  });
  mockMarkSynced.mockResolvedValue(undefined);
  mockMarkError.mockResolvedValue(undefined);
  mockFetchLastSucceededRun.mockResolvedValue({ runId: "run-1", datasetId: "ds-1" });
  mockFetchDatasetItems.mockResolvedValue([]);
  mockUpsertVideos.mockResolvedValue(3);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/video/apify-config/sync", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

import { POST } from "../video/apify-config/sync/route";

describe("POST /api/video/apify-config/sync", () => {
  it("returns 400 when brandId is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 with upserted count on success", async () => {
    const res = await POST(makeReq({ brandId: "brand-1" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; upserted: number };
    expect(body.ok).toBe(true);
    expect(body.upserted).toBe(3);
  });

  it("returns 404 when no succeeded run exists", async () => {
    mockFetchLastSucceededRun.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ brandId: "brand-1" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when config has is_enabled false", async () => {
    mockGetByBrand.mockResolvedValueOnce({ apify_task_id: "t", is_enabled: false });
    const res = await POST(makeReq({ brandId: "brand-1" }));
    expect(res.status).toBe(400);
  });
});

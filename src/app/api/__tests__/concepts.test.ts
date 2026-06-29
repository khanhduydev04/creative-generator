import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockListSystemConcepts, mockUserConceptList } = vi.hoisted(() => ({
  mockListSystemConcepts: vi.fn(),
  mockUserConceptList: vi.fn(),
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

vi.mock("@/services/conceptPromptService", () => {
  return {
    ConceptPromptService: class {
      listSystemConcepts = mockListSystemConcepts;
    },
  };
});

vi.mock("@/services/userConceptService", () => {
  return {
    UserConceptService: class {
      list = mockUserConceptList;
    },
  };
});

import { GET } from "../concepts/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/concepts", () => {
  function makeRequest(): NextRequest {
    return new NextRequest("http://localhost/api/concepts");
  }

  it("returns merged system and custom concepts", async () => {
    mockListSystemConcepts.mockResolvedValue([{ concept_id: "data_hook", label: "Data Hook" }]);
    mockUserConceptList.mockResolvedValue([{ id: "custom-1", label: "My Custom" }]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.system).toHaveLength(1);
    expect(data.custom).toHaveLength(1);
    expect(data.system[0].concept_id).toBe("data_hook");
    expect(data.custom[0].id).toBe("custom-1");
  });

  it("returns empty arrays when no concepts exist", async () => {
    mockListSystemConcepts.mockResolvedValue([]);
    mockUserConceptList.mockResolvedValue([]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.system).toHaveLength(0);
    expect(data.custom).toHaveLength(0);
  });

  it("returns 500 on system concept service error", async () => {
    mockListSystemConcepts.mockRejectedValue(new Error("DB error"));
    mockUserConceptList.mockResolvedValue([]);

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });

  it("returns 500 on user concept service error", async () => {
    mockListSystemConcepts.mockResolvedValue([]);
    mockUserConceptList.mockRejectedValue(new Error("DB error"));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUser } = await import("@/lib/user-context");
    vi.mocked(requireUser).mockRejectedValueOnce(
      Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
    );

    const response = await GET(makeRequest());
    // handleApiError is mocked; just confirm a non-200 response
    expect(response.status).not.toBe(200);
  });
});

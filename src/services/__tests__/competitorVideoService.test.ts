import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import * as tiktokOembedService from "@/services/tiktokOembedService";

describe("CompetitorVideoService.addVideo", () => {
  function supabaseCapturingInsert(capture: (row: Record<string, unknown>) => void): SupabaseClient {
    return {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          capture(row);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "v1", ...row }, error: null }),
            }),
          };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;
  }

  it("populates author_handle and cover_url from TikTok oEmbed when available", async () => {
    vi.spyOn(tiktokOembedService, "fetchTikTokOembed").mockResolvedValue({
      authorHandle: "somehandle",
      coverUrl: "https://cdn/cover.jpeg",
    });

    let insertedRow: Record<string, unknown> | undefined;
    const supabase = supabaseCapturingInsert((row) => {
      insertedRow = row;
    });

    const service = new CompetitorVideoService(supabase, "user-1");
    const video = await service.addVideo("brand-1", "https://www.tiktok.com/@somehandle/video/123");

    expect(insertedRow).toMatchObject({
      author_handle: "somehandle",
      cover_url: "https://cdn/cover.jpeg",
    });
    expect(video.author_handle).toBe("somehandle");
    expect(video.cover_url).toBe("https://cdn/cover.jpeg");
  });

  it("inserts with null author_handle/cover_url when the oEmbed lookup fails", async () => {
    vi.spyOn(tiktokOembedService, "fetchTikTokOembed").mockResolvedValue(null);

    let insertedRow: Record<string, unknown> | undefined;
    const supabase = supabaseCapturingInsert((row) => {
      insertedRow = row;
    });

    const service = new CompetitorVideoService(supabase, "user-1");
    await service.addVideo("brand-1", "https://www.tiktok.com/@somehandle/video/123");

    expect(insertedRow).toMatchObject({ author_handle: null, cover_url: null });
  });

  it("sets scraped_at to the current time on insert", async () => {
    vi.spyOn(tiktokOembedService, "fetchTikTokOembed").mockResolvedValue(null);

    let insertedRow: Record<string, unknown> | undefined;
    const supabase = supabaseCapturingInsert((row) => {
      insertedRow = row;
    });

    const before = Date.now();
    const service = new CompetitorVideoService(supabase, "user-1");
    await service.addVideo("brand-1", "https://www.tiktok.com/@somehandle/video/123");
    const after = Date.now();

    const scrapedAt = insertedRow?.scraped_at;
    expect(typeof scrapedAt).toBe("string");
    // Safe: the preceding assertion confirms scrapedAt is a string at runtime;
    // TS can't narrow `unknown` from a Vitest expect() call.
    const scrapedAtMs = new Date(scrapedAt as string).getTime();
    expect(scrapedAtMs).toBeGreaterThanOrEqual(before);
    expect(scrapedAtMs).toBeLessThanOrEqual(after);
  });
});

describe("CompetitorVideoService.listVideos — sort & source", () => {
  interface RecordedCall {
    method: string;
    args: unknown[];
  }

  function makeListVideosSupabase(result: {
    data: unknown[] | null;
    error: { message: string } | null;
    count: number | null;
  }): { supabase: SupabaseClient; calls: RecordedCall[] } {
    const calls: RecordedCall[] = [];
    const builder = {
      select: (...args: unknown[]) => {
        calls.push({ method: "select", args });
        return builder;
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: "eq", args });
        return builder;
      },
      order: (...args: unknown[]) => {
        calls.push({ method: "order", args });
        return builder;
      },
      range: (...args: unknown[]) => {
        calls.push({ method: "range", args });
        return builder;
      },
      or: (...args: unknown[]) => {
        calls.push({ method: "or", args });
        return builder;
      },
      is: (...args: unknown[]) => {
        calls.push({ method: "is", args });
        return builder;
      },
      not: (...args: unknown[]) => {
        calls.push({ method: "not", args });
        return builder;
      },
      // Safe: real PostgrestFilterBuilder is thenable; this fake mirrors that
      // so `await query` resolves without a real Supabase client.
      then: (resolve: (value: typeof result) => void) => resolve(result),
    };
    // Safe: fake only implements the from().select().eq().order().range().or().is().not()
    // chain this method calls.
    const supabase = { from: () => builder } as unknown as SupabaseClient;
    return { supabase, calls };
  }

  it("orders by scraped_at desc by default (sort omitted = 'recent')", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1");

    const orderCalls = calls.filter((c) => c.method === "order");
    expect(orderCalls[0]).toEqual({ method: "order", args: ["scraped_at", { ascending: false, nullsFirst: false }] });
    expect(orderCalls[1]).toEqual({ method: "order", args: ["created_at", { ascending: false }] });
  });

  it("orders by views desc when sort='views'", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1", undefined, 1, 20, undefined, "views");

    const orderCalls = calls.filter((c) => c.method === "order");
    expect(orderCalls[0]).toEqual({ method: "order", args: ["views", { ascending: false, nullsFirst: false }] });
    expect(orderCalls[1]).toEqual({ method: "order", args: ["created_at", { ascending: false }] });
  });

  it("filters apify_run_id IS NOT NULL when source='apify'", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1", undefined, 1, 20, undefined, "recent", "apify");

    expect(calls).toContainEqual({ method: "not", args: ["apify_run_id", "is", null] });
  });

  it("filters apify_run_id IS NULL when source='manual'", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1", undefined, 1, 20, undefined, "recent", "manual");

    expect(calls).toContainEqual({ method: "is", args: ["apify_run_id", null] });
  });

  it("applies no extra source filter when source='all' (default)", async () => {
    const { supabase, calls } = makeListVideosSupabase({ data: [], error: null, count: 0 });
    const service = new CompetitorVideoService(supabase, "user-1");

    await service.listVideos("brand-1");

    expect(calls.some((c) => c.method === "is" || c.method === "not")).toBe(false);
  });
});

describe("CompetitorVideoService.bulkUpdateStatus", () => {
  it("updates all given ids and returns the updated count", async () => {
    const selectResult = { data: [{ id: "v1" }, { id: "v2" }], error: null };
    const supabase = {
      from: () => ({ update: () => ({ in: () => ({ select: () => Promise.resolve(selectResult) }) }) }),
      // Safe: fake only implements the from().update().in().select() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const updated = await service.bulkUpdateStatus(["v1", "v2"], "winner");

    expect(updated).toBe(2);
  });

  it("throws when the update fails", async () => {
    const selectResult = { data: null, error: { message: "boom" } };
    const supabase = {
      from: () => ({ update: () => ({ in: () => ({ select: () => Promise.resolve(selectResult) }) }) }),
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    await expect(service.bulkUpdateStatus(["v1"], "rejected")).rejects.toThrow("boom");
  });
});

describe("CompetitorVideoService.bulkDelete", () => {
  it("collects storage paths from cascaded generated_audios and deletes the videos", async () => {
    const audioRows = {
      data: [
        { brand_scripts: [{ generated_audios: [{ storage_path: "generated-audio/v1/a.mp3" }] }] },
        { brand_scripts: [{ generated_audios: [] }] },
      ],
      error: null,
    };
    const supabase = {
      from: (table: string) => {
        if (table === "transcripts") {
          return { select: () => ({ in: () => Promise.resolve(audioRows) }) };
        }
        return {
          delete: () => ({
            in: (_col: string, ids: string[]) => {
              expect(ids).toEqual(["v1", "v2"]);
              return Promise.resolve({ error: null });
            },
          }),
        };
      },
      // Safe: fake only implements the from()/select()/in()/delete() chains this method calls.
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const paths = await service.bulkDelete(["v1", "v2"]);

    expect(paths).toEqual(["generated-audio/v1/a.mp3"]);
  });

  it("returns an empty array when no video has generated audio", async () => {
    const audioRows = { data: [{ brand_scripts: [] }], error: null };
    const supabase = {
      from: (table: string) => {
        if (table === "transcripts") {
          return { select: () => ({ in: () => Promise.resolve(audioRows) }) };
        }
        return { delete: () => ({ in: () => Promise.resolve({ error: null }) }) };
      },
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const paths = await service.bulkDelete(["v1"]);

    expect(paths).toEqual([]);
  });

  it("throws when the delete fails", async () => {
    const audioRows = { data: [], error: null };
    const supabase = {
      from: (table: string) => {
        if (table === "transcripts") {
          return { select: () => ({ in: () => Promise.resolve(audioRows) }) };
        }
        return { delete: () => ({ in: () => Promise.resolve({ error: { message: "delete failed" } }) }) };
      },
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    await expect(service.bulkDelete(["v1"])).rejects.toThrow("delete failed");
  });
});

describe("CompetitorVideoService.getVideoById", () => {
  it("returns the video with derived flags when found", async () => {
    const row = {
      data: {
        id: "v1",
        brand_id: "brand-1",
        status: "winner",
        transcripts: {
          whisper_status: "done",
          brand_scripts: [{ generated_audios: [{ id: "a1" }] }],
        },
      },
      error: null,
    };
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(row) }) }) }),
      }),
      // Safe: fake only implements the from().select().eq().eq().maybeSingle() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const video = await service.getVideoById("v1", "brand-1");

    expect(video).toMatchObject({
      id: "v1",
      brand_id: "brand-1",
      status: "winner",
      hasGeneratedAudio: true,
      transcriptionFailed: false,
    });
  });

  it("returns null when the video does not exist or isn't visible to this brand", async () => {
    const row = { data: null, error: null };
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(row) }) }) }),
      }),
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    const video = await service.getVideoById("missing", "brand-1");

    expect(video).toBeNull();
  });

  it("throws when the query fails", async () => {
    const row = { data: null, error: { message: "boom" } };
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(row) }) }) }),
      }),
    } as unknown as SupabaseClient;

    const service = new CompetitorVideoService(supabase, "user-1");
    await expect(service.getVideoById("v1", "brand-1")).rejects.toThrow("boom");
  });
});

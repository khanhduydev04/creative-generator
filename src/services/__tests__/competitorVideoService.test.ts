import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CompetitorVideoService } from "@/services/competitorVideoService";

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

import { describe, it, expect, vi } from "vitest";
import { MiniMaxClonedVoiceService } from "../minimaxClonedVoiceService";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("MiniMaxClonedVoiceService.create", () => {
  it("inserts a row with mapped column names", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "row-1", brand_id: "b1", voice_id: "brandvoice01" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new MiniMaxClonedVoiceService(supabase);
    const row = await svc.create({
      brandId: "b1",
      voiceId: "brandvoice01",
      displayName: "Brand Voice",
      model: "speech-2.6-hd",
      sourceStoragePath: "clone-src/b1/x.mp3",
    });

    expect(from).toHaveBeenCalledWith("minimax_cloned_voices");
    expect(insert).toHaveBeenCalledWith({
      brand_id: "b1",
      voice_id: "brandvoice01",
      display_name: "Brand Voice",
      model: "speech-2.6-hd",
      status: "ready",
      source_storage_path: "clone-src/b1/x.mp3",
      preview_storage_path: null,
    });
    expect(row.id).toBe("row-1");
  });

  it("throws on supabase error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new MiniMaxClonedVoiceService(supabase);
    await expect(
      svc.create({ brandId: "b1", voiceId: "v", displayName: "d", model: "speech-2.6-hd" }),
    ).rejects.toThrow("boom");
  });
});

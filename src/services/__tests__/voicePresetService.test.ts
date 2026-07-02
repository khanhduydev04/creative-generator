import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VoicePresetService } from "@/services/voicePresetService";

describe("VoicePresetService.create", () => {
  it("stores the given stability value on the inserted row", async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { ...row, id: "preset-1" }, error: null }) }) };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new VoicePresetService(supabase);
    const preset = await service.create({
      brandId: "brand-1",
      displayName: "Adam - Firm",
      voiceCode: "",
      speed: 1.0,
      pitch: 1.0,
      stability: 0.3,
      provider: "elevenlabs",
      providerVoiceId: "voice-1",
      elevenLabsModel: "eleven_flash_v2_5",
    });

    expect(preset.stability).toBe(0.3);
    expect(insertedRows[0]).toMatchObject({ stability: 0.3 });
  });

  it("throws when the insert fails", async () => {
    const supabase = {
      from: () => ({
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "boom" } }) }) }),
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new VoicePresetService(supabase);
    await expect(
      service.create({
        brandId: "brand-1",
        displayName: "X",
        voiceCode: "",
        speed: 1.0,
        pitch: 1.0,
        stability: 0.5,
        provider: "elevenlabs",
        providerVoiceId: "voice-1",
        elevenLabsModel: "eleven_flash_v2_5",
      }),
    ).rejects.toThrow("boom");
  });
});

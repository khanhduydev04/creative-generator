import { describe, it, expect, vi } from "vitest";
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

  it("persists provider_config for a minimax preset", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "p1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn((_row: Record<string, unknown>) => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new VoicePresetService(supabase);
    await svc.create({
      brandId: "b1",
      displayName: "MM preset",
      voiceCode: "",
      speed: 1.1,
      pitch: 1.0,
      stability: 0.5,
      provider: "minimax",
      providerVoiceId: "Wise_Woman",
      elevenLabsModel: null,
      providerConfig: {
        kind: "minimax",
        model: "speech-2.6-hd",
        audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      },
    });

    const inserted = insert.mock.calls[0][0];
    expect(inserted.provider).toBe("minimax");
    expect(inserted.provider_voice_id).toBe("Wise_Woman");
    expect(inserted.provider_config).toEqual({
      kind: "minimax",
      model: "speech-2.6-hd",
      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
    });
  });

  it("writes null provider_config for non-minimax presets", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "p2" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn((_row: Record<string, unknown>) => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new VoicePresetService(supabase);
    await svc.create({
      brandId: "b1",
      displayName: "Vbee preset",
      voiceCode: "hn_male",
      speed: 1,
      pitch: 1,
      stability: 0.5,
      provider: "vbee",
      providerVoiceId: null,
      elevenLabsModel: null,
    });
    expect(insert.mock.calls[0][0].provider_config).toBeNull();
  });
});

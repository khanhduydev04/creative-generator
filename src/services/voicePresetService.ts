import type { SupabaseClient } from "@supabase/supabase-js";
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
import type { VoicePreset } from "@/features/video/types";

export interface CreateVoicePresetInput {
  brandId: string;
  displayName: string;
  voiceCode: string;
  speed: number;
  pitch: number;
  stability: number;
  pauseConfig?: Record<string, unknown> | null;
  isDefault?: boolean;
  provider: TtsProvider;
  providerVoiceId: string | null;
  elevenLabsModel: ElevenLabsModel | null;
}

export class VoicePresetService {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(brandId: string): Promise<VoicePreset[]> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns voice_presets rows matching VoicePreset shape
    return (data ?? []) as VoicePreset[];
  }

  async create(input: CreateVoicePresetInput): Promise<VoicePreset> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .insert({
        brand_id: input.brandId,
        display_name: input.displayName,
        voice_code: input.voiceCode,
        speed: input.speed,
        pitch: input.pitch,
        stability: input.stability,
        pause_config: input.pauseConfig ?? null,
        is_default: input.isDefault ?? false,
        provider: input.provider,
        provider_voice_id: input.providerVoiceId,
        elevenlabs_model: input.elevenLabsModel,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the inserted voice_preset row
    return data as VoicePreset;
  }

  async update(
    id: string,
    updates: Partial<Pick<VoicePreset, "display_name" | "speed" | "pitch" | "pause_config" | "is_default">>,
  ): Promise<VoicePreset> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the updated voice_preset row
    return data as VoicePreset;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("voice_presets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }
}

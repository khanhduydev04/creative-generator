import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedAudio } from "@/features/video/types";

export class GeneratedAudioService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByBrand(brandId: string): Promise<GeneratedAudio[]> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .select("*, voice_preset:voice_presets(display_name, voice_code, speed), brand_script:brand_scripts(final_text, raw_text)")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns generated_audios rows with joined voice_preset and brand_script
    return (data ?? []) as GeneratedAudio[];
  }

  async listByScript(scriptId: string): Promise<GeneratedAudio[]> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .select("*, voice_preset:voice_presets(display_name, voice_code, speed)")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns generated_audios rows with joined voice_preset
    return (data ?? []) as GeneratedAudio[];
  }

  async create(input: {
    scriptId: string;
    brandId: string;
    voicePresetId: string;
    storagePath: string;
    vbeeAudioUrl: string;
    durationSecs: number | null;
  }): Promise<GeneratedAudio> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .insert({
        script_id: input.scriptId,
        brand_id: input.brandId,
        voice_preset_id: input.voicePresetId,
        storage_path: input.storagePath,
        vbee_audio_url: input.vbeeAudioUrl,
        duration_secs: input.durationSecs,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the inserted generated_audio row
    return data as GeneratedAudio;
  }

  async delete(id: string): Promise<{ storagePath: string | null }> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .delete()
      .eq("id", id)
      .select("storage_path")
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the deleted row with storage_path column
    return { storagePath: (data as { storage_path: string | null }).storage_path };
  }
}

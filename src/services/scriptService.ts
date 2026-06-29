import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandScript, PromptConfig } from "@/features/video/types";

export class ScriptService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByTranscript(transcriptId: string): Promise<BrandScript[]> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .select("*")
      .eq("transcript_id", transcriptId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns rows matching the brand_scripts schema, which aligns with BrandScript
    return (data ?? []) as BrandScript[];
  }

  async create(
    transcriptId: string,
    brandId: string,
    rawText: string,
    promptConfig: PromptConfig,
    llmModel: string,
  ): Promise<BrandScript> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .insert({
        transcript_id: transcriptId,
        brand_id: brandId,
        raw_text: rawText,
        prompt_config: promptConfig,
        llm_model: llmModel,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: .single() guarantees a single brand_scripts row matching BrandScript
    return data as BrandScript;
  }

  async saveFinalText(id: string, finalText: string): Promise<BrandScript> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .update({ final_text: finalText })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: .single() guarantees a single brand_scripts row matching BrandScript
    return data as BrandScript;
  }
}

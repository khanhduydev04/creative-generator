import type { SupabaseClient } from "@supabase/supabase-js";
import type { MiniMaxClonedVoice } from "@/features/video/types";

export interface CreateClonedVoiceInput {
  brandId: string;
  voiceId: string;
  displayName: string;
  model: string;
  status?: "pending" | "ready" | "failed";
  sourceStoragePath?: string | null;
  previewStoragePath?: string | null;
}

export class MiniMaxClonedVoiceService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByBrand(brandId: string): Promise<MiniMaxClonedVoice[]> {
    const { data, error } = await this.supabase
      .from("minimax_cloned_voices")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns minimax_cloned_voices rows matching MiniMaxClonedVoice
    return (data ?? []) as MiniMaxClonedVoice[];
  }

  async create(input: CreateClonedVoiceInput): Promise<MiniMaxClonedVoice> {
    const { data, error } = await this.supabase
      .from("minimax_cloned_voices")
      .insert({
        brand_id: input.brandId,
        voice_id: input.voiceId,
        display_name: input.displayName,
        model: input.model,
        status: input.status ?? "ready",
        source_storage_path: input.sourceStoragePath ?? null,
        preview_storage_path: input.previewStoragePath ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the inserted minimax_cloned_voices row
    return data as MiniMaxClonedVoice;
  }
}

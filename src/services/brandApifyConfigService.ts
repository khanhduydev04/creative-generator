import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandApifyConfig } from "@/features/video/types";

export class BrandApifyConfigService {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Tất cả config đang bật — dùng bởi cron (admin client, bypass RLS). */
  async listEnabled(): Promise<BrandApifyConfig[]> {
    const { data, error } = await this.supabase
      .from("brand_apify_config")
      .select("*")
      .eq("is_enabled", true);
    if (error) throw new Error(error.message);
    return (data ?? []) as BrandApifyConfig[];
  }

  async getByBrand(brandId: string): Promise<BrandApifyConfig | null> {
    const { data, error } = await this.supabase
      .from("brand_apify_config")
      .select("*")
      .eq("brand_id", brandId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as BrandApifyConfig | null;
  }

  async upsertConfig(
    brandId: string,
    apifyTaskId: string,
    isEnabled: boolean,
  ): Promise<BrandApifyConfig> {
    const { data, error } = await this.supabase
      .from("brand_apify_config")
      .upsert(
        { brand_id: brandId, apify_task_id: apifyTaskId, is_enabled: isEnabled },
        { onConflict: "brand_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BrandApifyConfig;
  }

  async markSynced(brandId: string, runId: string, datasetId: string): Promise<void> {
    const { error } = await this.supabase
      .from("brand_apify_config")
      .update({
        last_run_id: runId,
        last_dataset_id: datasetId,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("brand_id", brandId);
    if (error) throw new Error(error.message);
  }

  async markError(brandId: string, message: string): Promise<void> {
    const { error } = await this.supabase
      .from("brand_apify_config")
      .update({ last_error: message })
      .eq("brand_id", brandId);
    if (error) throw new Error(error.message);
  }
}

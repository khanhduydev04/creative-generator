import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import { ApiError } from "@/lib/user-context";

type StealthSceneRow = Database["public"]["Tables"]["stealth_scenes"]["Row"];
type StealthSceneInsert = Database["public"]["Tables"]["stealth_scenes"]["Insert"];
type StealthSceneUpdate = Database["public"]["Tables"]["stealth_scenes"]["Update"];

export type { StealthSceneRow };

export class StealthSceneService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private userId: string,
  ) {}

  /** Verify the parent brand exists (not soft-deleted). RLS handles authz. */
  private async verifyBrandExists(brandId: string): Promise<void> {
    const { data } = await this.supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .is("deleted_at", null)
      .single();
    if (!data) throw new ApiError(404, "brand_not_found");
  }

  /**
   * List stealth scenes for a brand.
   */
  async getByBrandId(brandId: string): Promise<StealthSceneRow[]> {
    const { data, error } = await this.supabase
      .from("stealth_scenes")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true });

    if (error) throw new ApiError(500, "db_error", error.message);
    return data ?? [];
  }

  /**
   * Fetch a single stealth scene by id.
   */
  async getById(id: string): Promise<StealthSceneRow | null> {
    const { data, error } = await this.supabase
      .from("stealth_scenes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new ApiError(500, "db_error", error.message);
    }
    return data ?? null;
  }

  /**
   * Create a stealth scene. Pre-flight verifies the parent brand exists.
   */
  async create(input: StealthSceneInsert): Promise<StealthSceneRow> {
    await this.verifyBrandExists(input.brand_id);

    const { data, error } = await this.supabase
      .from("stealth_scenes")
      .insert(input)
      .select()
      .single();

    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  /**
   * Update a stealth scene, scoped to current user via pre-flight ownership check.
   */
  async update(id: string, updates: StealthSceneUpdate): Promise<StealthSceneRow> {
    const existing = await this.getById(id);
    if (!existing) throw new ApiError(404, "stealth_scene_not_found");

    const updateData: StealthSceneUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("stealth_scenes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  /**
   * Delete a stealth scene, scoped to current user via pre-flight ownership check.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new ApiError(404, "stealth_scene_not_found");

    const { error } = await this.supabase
      .from("stealth_scenes")
      .delete()
      .eq("id", id);

    if (error) throw new ApiError(500, "db_error", error.message);
  }
}

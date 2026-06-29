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

  /**
   * Verify the current user owns the parent brand. Throws if not found.
   */
  private async verifyBrandOwnership(brandId: string): Promise<void> {
    const { data } = await this.supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("owner_user_id", this.userId)
      .single();
    if (!data) throw new ApiError(404, "brand_not_found");
  }

  /**
   * List stealth scenes for a brand, scoped via JOIN to brands.owner_user_id.
   */
  async getByBrandId(brandId: string): Promise<StealthSceneRow[]> {
    const { data, error } = await this.supabase
      .from("stealth_scenes")
      .select("*, brands!inner(owner_user_id)")
      .eq("brand_id", brandId)
      .eq("brands.owner_user_id", this.userId)
      .order("created_at", { ascending: true });

    if (error) throw new ApiError(500, "db_error", error.message);
    if (!data) return [];

    // Strip the joined brands column before returning typed rows
    return data.map(({ brands: _brands, ...row }) => row as StealthSceneRow);
  }

  /**
   * Fetch a single stealth scene by id, scoped via JOIN to brands.owner_user_id.
   */
  async getById(id: string): Promise<StealthSceneRow | null> {
    const { data, error } = await this.supabase
      .from("stealth_scenes")
      .select("*, brands!inner(owner_user_id)")
      .eq("id", id)
      .eq("brands.owner_user_id", this.userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new ApiError(500, "db_error", error.message);
    }
    if (!data) return null;

    const { brands: _brands, ...row } = data as StealthSceneRow & { brands: unknown };
    return row as StealthSceneRow;
  }

  /**
   * Create a stealth scene. Pre-flight verifies current user owns the parent brand.
   */
  async create(input: StealthSceneInsert): Promise<StealthSceneRow> {
    await this.verifyBrandOwnership(input.brand_id);

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

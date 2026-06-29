import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import { ApiError } from "@/lib/user-context";

type SavedAdRow = Database["public"]["Tables"]["saved_ads"]["Row"];
type SavedAdInsert = Database["public"]["Tables"]["saved_ads"]["Insert"];

export class SavedAdService {
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
   * List saved ads for a brand, optionally filtered by product.
   * Scoped via JOIN to brands.owner_user_id. Returns newest first.
   */
  async getByBrandId(
    brandId: string,
    productId?: string | null,
  ): Promise<SavedAdRow[]> {
    let query = this.supabase
      .from("saved_ads")
      .select("*, brands!inner(owner_user_id)")
      .eq("brand_id", brandId)
      .eq("brands.owner_user_id", this.userId)
      .order("created_at", { ascending: false });

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;
    if (error) throw new ApiError(500, "db_error", error.message);
    if (!data) return [];

    // Strip the joined brands column before returning typed rows
    return data.map(({ brands: _brands, ...row }) => row as SavedAdRow);
  }

  /**
   * Create a saved ad. Pre-flight verifies current user owns the parent brand.
   */
  async create(ad: SavedAdInsert): Promise<SavedAdRow> {
    await this.verifyBrandOwnership(ad.brand_id);

    const { data, error } = await this.supabase
      .from("saved_ads")
      .insert(ad)
      .select()
      .single();

    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  /**
   * Resolve brand IDs owned by the current user (used for scoping deletes).
   */
  private async getOwnedBrandIds(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("brands")
      .select("id")
      .eq("owner_user_id", this.userId);
    if (error) throw new ApiError(500, "db_error", error.message);
    return (data ?? []).map((b) => b.id);
  }

  /**
   * Delete a saved ad by storage path, scoped to the current user via brand ownership.
   */
  async deleteByStoragePath(storagePath: string): Promise<void> {
    const brandIds = await this.getOwnedBrandIds();
    if (brandIds.length === 0) return;

    const { error } = await this.supabase
      .from("saved_ads")
      .delete()
      .eq("storage_path", storagePath)
      .in("brand_id", brandIds);

    if (error) throw new ApiError(500, "db_error", error.message);
  }

  /**
   * Bulk delete saved ads by storage paths, scoped to the current user via brand ownership.
   */
  async bulkDeleteByStoragePaths(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const brandIds = await this.getOwnedBrandIds();
    if (brandIds.length === 0) return;

    const { error } = await this.supabase
      .from("saved_ads")
      .delete()
      .in("storage_path", paths)
      .in("brand_id", brandIds);

    if (error) throw new ApiError(500, "db_error", error.message);
  }
}

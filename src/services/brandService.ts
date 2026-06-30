import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { ApiError } from '@/lib/user-context'

type BrandRow = Database['public']['Tables']['brands']['Row']

export class BrandService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private userId: string,
  ) {}

  /**
   * Fetch all active brands accessible to any authenticated user (RLS enforces access).
   */
  async listBrands(): Promise<BrandRow[]> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }

  /**
   * Fetch a single brand by id (RLS enforces access control).
   */
  async getBrandById(id: string): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw new ApiError(404, 'brand_not_found')
    return data
  }

  /**
   * Create a new brand owned by the current user.
   */
  async createBrand(name: string, description?: string): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .insert({ owner_user_id: this.userId, name, description: description ?? null })
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data
  }

  /**
   * Update brand name and/or description (RLS enforces access control).
   */
  async updateBrand(
    id: string,
    updates: { name?: string; description?: string },
  ): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new ApiError(404, 'brand_not_found')
    return data
  }

  /**
   * Soft delete a brand. Admin-only: the DELETE route gates on verifyAdmin(),
   * and DB RLS (brands_delete_admin) + the guard_brand_admin_columns trigger
   * enforce that only admins may set deleted_at. We intentionally do NOT scope
   * by owner_user_id — an admin may delete any brand, not just their own.
   */
  async deleteBrand(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data || data.length === 0) throw new ApiError(404, 'brand_not_found')
    return true
  }
}

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { ApiError } from '@/lib/user-context'

type BrandProductRow = Database['public']['Tables']['brand_products']['Row']
type BrandProductInsert = Database['public']['Tables']['brand_products']['Insert']
type BrandProductUpdate = Database['public']['Tables']['brand_products']['Update']

export class BrandProductService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private userId: string,
  ) {}

  /**
   * Verify the current user owns the parent brand. Throws if not found.
   */
  private async verifyBrandOwnership(brandId: string): Promise<void> {
    const { data } = await this.supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('owner_user_id', this.userId)
      .single()
    if (!data) throw new ApiError(404, 'brand_not_found')
  }

  /**
   * List products for a brand, scoped via JOIN to brands.owner_user_id.
   */
  async getByBrandId(brandId: string): Promise<BrandProductRow[]> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*, brands!inner(owner_user_id)')
      .eq('brand_id', brandId)
      .eq('brands.owner_user_id', this.userId)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data) return []

    // Strip the joined brands column before returning typed rows
    return data.map(({ brands: _brands, ...row }) => row as BrandProductRow)
  }

  /**
   * Fetch a single product by id, scoped via JOIN to brands.owner_user_id.
   */
  async getById(id: string): Promise<BrandProductRow | null> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*, brands!inner(owner_user_id)')
      .eq('id', id)
      .eq('brands.owner_user_id', this.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new ApiError(500, 'db_error', error.message)
    }
    if (!data) return null

    const { brands: _brands, ...row } = data as BrandProductRow & { brands: unknown }
    return row as BrandProductRow
  }

  /**
   * Create a product. Pre-flight verifies current user owns the parent brand.
   */
  async create(product: BrandProductInsert): Promise<BrandProductRow> {
    await this.verifyBrandOwnership(product.brand_id)

    const { data, error } = await this.supabase
      .from('brand_products')
      .insert(product)
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data
  }

  /**
   * Update a product, scoped via JOIN to brands.owner_user_id.
   */
  async update(id: string, updates: BrandProductUpdate): Promise<BrandProductRow> {
    // Verify ownership via the existing getById check
    const existing = await this.getById(id)
    if (!existing) throw new ApiError(404, 'product_not_found')

    const { data, error } = await this.supabase
      .from('brand_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data
  }

  /**
   * Delete a product, scoped to current user via pre-flight ownership check.
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) throw new ApiError(404, 'product_not_found')

    const { error } = await this.supabase
      .from('brand_products')
      .delete()
      .eq('id', id)

    if (error) throw new ApiError(500, 'db_error', error.message)
  }
}

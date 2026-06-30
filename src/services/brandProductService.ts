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

  /** Verify the parent brand exists (not soft-deleted). RLS handles authz. */
  private async verifyBrandExists(brandId: string): Promise<void> {
    const { data } = await this.supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .is('deleted_at', null)
      .single()
    if (!data) throw new ApiError(404, 'brand_not_found')
  }

  /**
   * List products for a brand.
   */
  async getByBrandId(brandId: string): Promise<BrandProductRow[]> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }

  /**
   * Fetch a single product by id.
   */
  async getById(id: string): Promise<BrandProductRow | null> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new ApiError(500, 'db_error', error.message)
    }
    return data ?? null
  }

  /**
   * Create a product. Pre-flight verifies the parent brand exists.
   */
  async create(product: BrandProductInsert): Promise<BrandProductRow> {
    await this.verifyBrandExists(product.brand_id)

    const { data, error } = await this.supabase
      .from('brand_products')
      .insert(product)
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data
  }

  /**
   * Update a product. Pre-flight verifies the product exists via RLS-scoped getById.
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

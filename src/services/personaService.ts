import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { ApiError } from '@/lib/user-context'

type PersonaRow = Database['public']['Tables']['persona_profiles']['Row']

export class PersonaService {
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
   * Fetch all active personas for a brand, scoped via JOIN to brands.owner_user_id.
   */
  async getPersonasByBrand(brandId: string): Promise<PersonaRow[]> {
    const { data, error } = await this.supabase
      .from('persona_profiles')
      .select('*, brands!inner(owner_user_id)')
      .eq('brand_id', brandId)
      .eq('brands.owner_user_id', this.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data) return []

    // Strip the joined brands column before returning typed rows
    return data.map(({ brands: _brands, ...row }) => row as PersonaRow)
  }

  /**
   * Fetch a single persona by id, scoped via JOIN to brands.owner_user_id.
   */
  async getPersonaById(id: string): Promise<PersonaRow> {
    const { data, error } = await this.supabase
      .from('persona_profiles')
      .select('*, brands!inner(owner_user_id)')
      .eq('id', id)
      .eq('brands.owner_user_id', this.userId)
      .is('deleted_at', null)
      .single()

    if (error) throw new ApiError(404, 'persona_not_found')

    const { brands: _brands, ...row } = data as PersonaRow & { brands: unknown }
    return row as PersonaRow
  }

  /**
   * Create a manual persona. Pre-flight verifies current user owns the parent brand.
   */
  async createPersona(
    brandId: string,
    fields: {
      title: string
      pain?: string
      angle?: string
      emotion?: string
      researchSummaryId?: string
    },
  ): Promise<PersonaRow> {
    await this.verifyBrandOwnership(brandId)

    const { data, error } = await this.supabase
      .from('persona_profiles')
      .insert({
        brand_id: brandId,
        research_summary_id: fields.researchSummaryId ?? null,
        title: fields.title,
        pain: fields.pain ?? null,
        angle: fields.angle ?? null,
        emotion: fields.emotion ?? null,
        source: 'manual',
      })
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data) throw new ApiError(500, 'db_error', 'Failed to create persona')
    return data
  }

  /**
   * Update an existing persona, scoped to current user via pre-flight ownership check.
   */
  async updatePersona(
    id: string,
    fields: {
      title?: string
      pain?: string
      angle?: string
      emotion?: string
    },
  ): Promise<PersonaRow> {
    // Fetch the record first to confirm ownership
    const existing = await this.getPersonaById(id)
    if (!existing) throw new ApiError(404, 'persona_not_found')

    const { data, error } = await this.supabase
      .from('persona_profiles')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data) throw new ApiError(404, 'persona_not_found')
    return data
  }

  /**
   * Soft delete a persona, scoped to current user via pre-flight ownership check.
   */
  async deletePersona(id: string): Promise<boolean> {
    // Fetch the record first to confirm ownership
    const existing = await this.getPersonaById(id)
    if (!existing) throw new ApiError(404, 'persona_not_found')

    const { error } = await this.supabase
      .from('persona_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new ApiError(500, 'db_error', error.message)
    return true
  }
}

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { ApiError } from '@/lib/user-context'

type ConceptPromptRow = Database['public']['Tables']['concept_prompts']['Row']
type ConceptPromptInsert = Database['public']['Tables']['concept_prompts']['Insert']
type ConceptPromptUpdate = Database['public']['Tables']['concept_prompts']['Update']

export class ConceptPromptService {
  // No userId: concept_prompts is system IP — admin-only writes, all auth users can read.
  // RLS handles write restriction (platform_admin only); reads are unrestricted for any auth user.
  constructor(private supabase: SupabaseClient<Database>) {}

  async getAll(): Promise<ConceptPromptRow[]> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }

  /** Alias for getAll — returns all system concept prompts. */
  async listSystemConcepts(): Promise<ConceptPromptRow[]> {
    return this.getAll()
  }

  async getByConceptId(conceptId: string): Promise<ConceptPromptRow | null> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .select('*')
      .eq('concept_id', conceptId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new ApiError(500, 'db_error', error.message)
    }
    return data
  }

  async getByConceptIds(conceptIds: string[]): Promise<ConceptPromptRow[]> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .select('*')
      .in('concept_id', conceptIds)

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }

  async create(input: ConceptPromptInsert): Promise<ConceptPromptRow> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .insert(input)
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data
  }

  async update(conceptId: string, input: ConceptPromptUpdate): Promise<ConceptPromptRow> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .update(input)
      .eq('concept_id', conceptId)
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data
  }

  async delete(conceptId: string): Promise<void> {
    const { error } = await this.supabase
      .from('concept_prompts')
      .delete()
      .eq('concept_id', conceptId)

    if (error) throw new ApiError(500, 'db_error', error.message)
  }
}

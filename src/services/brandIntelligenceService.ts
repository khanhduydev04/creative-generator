import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { claudeTextGenerate } from './claudeClient'

type ResearchSummaryRow = Database['public']['Tables']['brand_research_summaries']['Row']
type PersonaRow = Database['public']['Tables']['persona_profiles']['Row']

interface GeneratedPersona {
  title: string
  pain: string
  angle: string
  emotion: string
}

export class BrandIntelligenceService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private userId: string,
  ) {}

  /**
   * Fetch the latest research summary for a brand.
   */
  async getResearchSummary(brandId: string): Promise<ResearchSummaryRow | null> {
    const { data, error } = await this.supabase
      .from('brand_research_summaries')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Save or update the research summary for a brand.
   * If one exists, updates it. Otherwise creates a new one.
   */
  async saveResearchSummary(brandId: string, content: string): Promise<ResearchSummaryRow> {
    const existing = await this.getResearchSummary(brandId)

    if (existing) {
      const { data, error } = await this.supabase
        .from('brand_research_summaries')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      if (!data) throw new Error('Failed to update research summary')
      return data
    }

    const { data, error } = await this.supabase
      .from('brand_research_summaries')
      .insert({ brand_id: brandId, content })
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Failed to create research summary')
    return data
  }

  /**
   * Generate 10 persona profiles using Claude AI from a research summary.
   * Stores them in persona_profiles linked to the summary.
   */
  async generatePersonas(
    brandId: string,
    researchSummaryId: string,
    researchContent: string,
  ): Promise<PersonaRow[]> {
    const prompt = buildPersonaGenerationPrompt(researchContent)

    const rawText = await claudeTextGenerate(
      this.userId,
      "You are a strategic marketing AI. Return ONLY valid JSON arrays, no markdown fences or explanation.",
      prompt,
      4096,
    )
    const personas = parsePersonasFromResponse(rawText)

    // Soft-delete any existing AI personas for this brand
    await this.supabase
      .from('persona_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('brand_id', brandId)
      .eq('source', 'ai')
      .is('deleted_at', null)

    // Insert new personas
    const inserts = personas.map((p) => ({
      brand_id: brandId,
      research_summary_id: researchSummaryId,
      title: p.title,
      pain: p.pain,
      angle: p.angle,
      emotion: p.emotion,
      source: 'ai' as const,
    }))

    const { data, error } = await this.supabase
      .from('persona_profiles')
      .insert(inserts)
      .select()

    if (error) throw new Error(error.message)
    return data || []
  }
}

function buildPersonaGenerationPrompt(researchContent: string): string {
  return `You are a strategic marketing AI. Based on the following brand research, generate exactly 10 distinct customer persona profiles.

BRAND RESEARCH:
${researchContent}

Generate 10 personas. Each persona must be a customer segment the brand should target in ads.

Return ONLY a valid JSON array with exactly 10 objects. Each object must have these exact fields:
- title: short persona name (e.g., "The Busy Professional")
- pain: the core pain point or frustration this persona has
- angle: the marketing angle / message that would resonate most
- emotion: the primary emotion to trigger in the ad (e.g., "relief", "excitement", "confidence")

Example format:
[
  {
    "title": "The Overworked Parent",
    "pain": "No time for self-care between work and family",
    "angle": "Give yourself 10 minutes back every day",
    "emotion": "relief"
  }
]

Return ONLY the JSON array, no markdown, no explanation.`
}

function parsePersonasFromResponse(raw: string): GeneratedPersona[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Could not parse personas from AI response')

  const parsed: unknown = JSON.parse(jsonMatch[0])

  if (!Array.isArray(parsed)) throw new Error('AI response is not an array')

  return parsed.map((item, index) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).title !== 'string'
    ) {
      throw new Error(`Invalid persona at index ${index}`)
    }
    const p = item as Record<string, unknown>
    return {
      title: String(p.title ?? ''),
      pain: String(p.pain ?? ''),
      angle: String(p.angle ?? ''),
      emotion: String(p.emotion ?? ''),
    }
  })
}

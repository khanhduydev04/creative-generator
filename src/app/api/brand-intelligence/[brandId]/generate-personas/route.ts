import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandIntelligenceService } from '@/services/brandIntelligenceService'

// POST /api/brand-intelligence/[brandId]/generate-personas
// Generates 10 AI personas from the brand's latest research summary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const supabase = await createClient()
    const service = new BrandIntelligenceService(supabase, userId)

    const summary = await service.getResearchSummary(brandId)
    if (!summary) {
      return NextResponse.json(
        { error: 'No research summary found. Save a research summary first.' },
        { status: 400 },
      )
    }

    const personas = await service.generatePersonas(brandId, summary.id, summary.content)
    return NextResponse.json({ personas }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

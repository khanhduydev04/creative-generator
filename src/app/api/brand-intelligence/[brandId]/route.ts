import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandIntelligenceService } from '@/services/brandIntelligenceService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const supabase = await createClient()
    const service = new BrandIntelligenceService(supabase, userId)
    const summary = await service.getResearchSummary(brandId)
    return NextResponse.json({ summary })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const body: unknown = await request.json()
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).content !== 'string'
    ) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const { content } = body as { content: string }
    const supabase = await createClient()
    const service = new BrandIntelligenceService(supabase, userId)
    const summary = await service.saveResearchSummary(brandId, content)
    return NextResponse.json({ summary })
  } catch (e) {
    return handleApiError(e)
  }
}

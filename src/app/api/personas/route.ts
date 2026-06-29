import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { PersonaService } from '@/services/personaService'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request)
    const brandId = request.nextUrl.searchParams.get('brandId')
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const service = new PersonaService(supabase, userId)
    const personas = await service.getPersonasByBrand(brandId)
    return NextResponse.json({ personas })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request)
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { brandId, title, pain, angle, emotion, researchSummaryId } =
      body as Record<string, unknown>

    if (typeof brandId !== 'string' || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'brandId and title are required' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const service = new PersonaService(supabase, userId)
    const persona = await service.createPersona(brandId, {
      title: title.trim(),
      pain: typeof pain === 'string' ? pain : undefined,
      angle: typeof angle === 'string' ? angle : undefined,
      emotion: typeof emotion === 'string' ? emotion : undefined,
      researchSummaryId: typeof researchSummaryId === 'string' ? researchSummaryId : undefined,
    })
    return NextResponse.json({ persona }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

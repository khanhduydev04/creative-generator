import { createClient } from '@/lib/supabase/server'
import { requireAdmin, handleApiError } from '@/lib/user-context'
import { ConceptPromptService } from '@/services/conceptPromptService'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> },
) {
  const { conceptId } = await params
  try {
    await requireAdmin(request)
    const body = await request.json() as {
      label?: string
      description?: string
      requires_competitor?: boolean
      prompt?: string
      reference_images?: string[]
    }

    if (body.reference_images) {
      body.reference_images = body.reference_images.slice(0, 2)
    }

    const supabase = await createClient()
    const service = new ConceptPromptService(supabase)
    const concept = await service.update(conceptId, body)
    return NextResponse.json({ concept })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> },
) {
  const { conceptId } = await params
  try {
    await requireAdmin(request)
    const supabase = await createClient()
    const service = new ConceptPromptService(supabase)
    await service.delete(conceptId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e)
  }
}

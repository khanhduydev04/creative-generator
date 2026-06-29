import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { PersonaService } from '@/services/personaService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { id } = await params
    const supabase = await createClient()
    const service = new PersonaService(supabase, userId)
    const persona = await service.getPersonaById(id)
    return NextResponse.json({ persona })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { id } = await params
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { title, pain, angle, emotion } = body as Record<string, unknown>
    const updates: { title?: string; pain?: string; angle?: string; emotion?: string } = {}
    if (typeof title === 'string') updates.title = title.trim()
    if (typeof pain === 'string') updates.pain = pain
    if (typeof angle === 'string') updates.angle = angle
    if (typeof emotion === 'string') updates.emotion = emotion

    const supabase = await createClient()
    const service = new PersonaService(supabase, userId)
    const persona = await service.updatePersona(id, updates)
    return NextResponse.json({ persona })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { id } = await params
    const supabase = await createClient()
    const service = new PersonaService(supabase, userId)
    await service.deletePersona(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { verifyAdmin, isVerifyError } from '@/lib/auth/verify-admin'
import { BrandService } from '@/services/brandService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { id } = await params
    const supabase = await createClient()
    const service = new BrandService(supabase, userId)
    const brand = await service.getBrandById(id)
    return NextResponse.json({ brand })
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

    const { name, description } = body as Record<string, unknown>
    const updates: { name?: string; description?: string } = {}
    if (typeof name === 'string') updates.name = name.trim()
    if (typeof description === 'string') updates.description = description

    const supabase = await createClient()
    const service = new BrandService(supabase, userId)
    const brand = await service.updateBrand(id, updates)
    return NextResponse.json({ brand })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await verifyAdmin()
    if (isVerifyError(guard)) return guard
    const { userId } = guard
    const { id } = await params
    const supabase = await createClient()
    const service = new BrandService(supabase, userId)
    await service.deleteBrand(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e)
  }
}

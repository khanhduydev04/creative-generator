import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandService } from '@/services/brandService'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request)
    const supabase = await createClient()
    const service = new BrandService(supabase, userId)
    const brands = await service.listBrands()
    return NextResponse.json({ brands })
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

    const { name, description } = body as Record<string, unknown>
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const service = new BrandService(supabase, userId)
    const brand = await service.createBrand(
      name.trim(),
      typeof description === 'string' ? description : undefined,
    )
    return NextResponse.json({ brand }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

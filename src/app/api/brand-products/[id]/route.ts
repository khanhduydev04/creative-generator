import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandProductService } from '@/services/brandProductService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { id } = await params
    const supabase = await createClient()
    const service = new BrandProductService(supabase, userId)
    const product = await service.getById(id)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { id } = await params
    // Safe: request.json() returns unknown at runtime; shape validated by required fields before use
    const body = await request.json() as {
      name?: string
      description?: string | null
      images?: string[]
      attributes?: string | null
      target_audience?: string | null
      selling_points?: string | null
      price?: string | null
    }

    if (body.images && body.images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed' },
        { status: 400 },
      )
    }

    if (body.images && body.images.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 image is required' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const service = new BrandProductService(supabase, userId)
    const product = await service.update(id, body)
    return NextResponse.json({ product })
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
    const service = new BrandProductService(supabase, userId)
    await service.delete(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e)
  }
}

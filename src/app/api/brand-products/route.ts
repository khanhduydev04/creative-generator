import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandProductService } from '@/services/brandProductService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request)
    const brandId = request.nextUrl.searchParams.get('brandId')
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const service = new BrandProductService(supabase, userId)
    const products = await service.getByBrandId(brandId)
    return NextResponse.json({ products })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request)
    // Safe: request.json() returns unknown at runtime; shape validated by required fields before use
    const body = await request.json() as {
      brand_id: string
      name: string
      description?: string | null
      images: string[]
      product_url?: string | null
      attributes?: string | null
      target_audience?: string | null
      selling_points?: string | null
    }

    if (!body.brand_id || !body.name || !body.images?.length) {
      return NextResponse.json(
        { error: 'brand_id, name, and at least 1 image are required' },
        { status: 400 },
      )
    }

    if (body.images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const service = new BrandProductService(supabase, userId)
    const product = await service.create({
      brand_id: body.brand_id,
      name: body.name,
      description: body.description ?? null,
      images: body.images,
      attributes: body.attributes ?? null,
      target_audience: body.target_audience ?? null,
      selling_points: body.selling_points ?? null,
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

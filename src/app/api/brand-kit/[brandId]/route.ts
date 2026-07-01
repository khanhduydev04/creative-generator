import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandKitService } from '@/services/brandKitService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const supabase = await createClient()
    const service = new BrandKitService(supabase, userId)
    const kit = await service.getBrandKit(brandId)
    const logoUrls = kit ? service.getLogoUrls(kit) : null
    return NextResponse.json({ kit, logoUrls })
  } catch (e) {
    return handleApiError(e)
  }
}

function toNullableString(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value
  if (value === null) return null
  return undefined
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const {
      typography,
      font_source,
      primary_color_1,
      primary_color_2,
      secondary_color_1,
      secondary_color_2,
      accent_color_1,
      accent_color_2,
    } = body as Record<string, unknown>

    const supabase = await createClient()
    const service = new BrandKitService(supabase, userId)
    const validFontSource = font_source === 'google' || font_source === 'local' ? font_source : undefined
    const kit = await service.saveBrandKit(brandId, {
      typography: typeof typography === 'string' ? typography : undefined,
      font_source: validFontSource,
      primary_color_1: toNullableString(primary_color_1),
      primary_color_2: toNullableString(primary_color_2),
      secondary_color_1: toNullableString(secondary_color_1),
      secondary_color_2: toNullableString(secondary_color_2),
      accent_color_1: toNullableString(accent_color_1),
      accent_color_2: toNullableString(accent_color_2),
    })

    const logoUrls = service.getLogoUrls(kit)
    return NextResponse.json({ kit, logoUrls })
  } catch (e) {
    return handleApiError(e)
  }
}

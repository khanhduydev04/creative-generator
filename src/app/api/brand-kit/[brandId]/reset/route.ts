import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandKitService } from '@/services/brandKitService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const supabase = await createClient()
    const service = new BrandKitService(supabase, userId)
    const kit = await service.resetBrandKit(brandId)
    const logoUrls = service.getLogoUrls(kit)
    return NextResponse.json({ kit, logoUrls })
  } catch (e) {
    return handleApiError(e)
  }
}

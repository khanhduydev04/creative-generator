import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandKitService } from '@/services/brandKitService'

// POST /api/brand-kit/[brandId]/logo
// Multipart form: file (File), logoType ('light' | 'dark')
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const formData = await request.formData()

    const file = formData.get('file')
    const logoType = formData.get('logoType')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    if (logoType !== 'light' && logoType !== 'dark') {
      return NextResponse.json(
        { error: 'logoType must be "light" or "dark"' },
        { status: 400 },
      )
    }

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
    }

    const supabase = await createClient()
    const service = new BrandKitService(supabase, userId)
    const kit = await service.uploadLogo(brandId, logoType, file, file.name)
    const logoUrls = service.getLogoUrls(kit)

    return NextResponse.json({ kit, logoUrls }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

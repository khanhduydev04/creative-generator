import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { BrandKitService } from '@/services/brandKitService'

// POST /api/brand-kit/[brandId]/font
// Multipart form: fontName (string), files (File[]), specimen (File), variants (string - JSON array)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { userId } = await requireUser(request)
    const { brandId } = await params
    const formData = await request.formData()

    const fontName = formData.get('fontName')
    if (typeof fontName !== 'string' || !fontName.trim()) {
      return NextResponse.json({ error: 'fontName is required' }, { status: 400 })
    }

    const variantsRaw = formData.get('variants')
    let variants: string[] = []
    if (typeof variantsRaw === 'string') {
      try {
        const parsed = JSON.parse(variantsRaw) as unknown
        variants = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
      } catch {
        return NextResponse.json({ error: 'Invalid variants JSON' }, { status: 400 })
      }
    }

    const MAX_FONT_SIZE = 5 * 1024 * 1024
    const fileEntries: { file: File; filename: string; variant: string }[] = []
    const allFiles = formData.getAll('files')
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      if (!(file instanceof File)) continue
      if (file.size > MAX_FONT_SIZE) {
        return NextResponse.json({ error: `Font file "${file.name}" too large (max 5MB)` }, { status: 413 })
      }
      fileEntries.push({
        file,
        filename: file.name,
        variant: variants[i] ?? inferVariant(file.name),
      })
    }

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: 'At least one font file is required' }, { status: 400 })
    }

    const specimen = formData.get('specimen')
    const specimenFile = specimen instanceof File ? specimen : null

    const supabase = await createClient()
    const service = new BrandKitService(supabase, userId)
    const kit = await service.uploadFontFiles(brandId, fontName.trim(), fileEntries, specimenFile)
    const logoUrls = service.getLogoUrls(kit)
    const specimenUrl = service.getFontSpecimenUrl(kit)

    return NextResponse.json({ kit, logoUrls, specimenUrl }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

function inferVariant(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('bold') && lower.includes('italic')) return 'Bold Italic'
  if (lower.includes('bold')) return 'Bold'
  if (lower.includes('italic')) return 'Italic'
  if (lower.includes('light')) return 'Light'
  if (lower.includes('medium')) return 'Medium'
  if (lower.includes('semibold') || lower.includes('semi-bold')) return 'SemiBold'
  if (lower.includes('thin')) return 'Thin'
  if (lower.includes('black') || lower.includes('heavy')) return 'Black'
  return 'Regular'
}

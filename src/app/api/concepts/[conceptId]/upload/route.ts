import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { StorageService } from '@/services/storageService'
import { NextRequest, NextResponse } from 'next/server'

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> },
) {
  const { conceptId } = await params

  try {
    const { userId } = await requireUser(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP files are accepted' },
        { status: 400 },
      )
    }

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
    }

    const supabase = await createClient()
    const storage = new StorageService(supabase)

    const path = storage.buildPath(`${userId}/concepts`, conceptId, file.name)
    const arrayBuffer = await file.arrayBuffer()
    await storage.upload('brand-assets', path, arrayBuffer, file.type)
    const publicUrl = storage.getPublicUrl('brand-assets', path)

    return NextResponse.json({ url: publicUrl, path })
  } catch (e) {
    return handleApiError(e)
  }
}

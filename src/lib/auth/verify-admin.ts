import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/features/auth/types'

interface AdminInfo {
  userId: string
  role: UserRole
}

type VerifyResult = AdminInfo | NextResponse

export async function verifyAdmin(): Promise<VerifyResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (profile.role !== 'ceo' && profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { userId: user.id, role: profile.role as UserRole }
}

export function isVerifyError(result: VerifyResult): result is NextResponse {
  return result instanceof NextResponse
}

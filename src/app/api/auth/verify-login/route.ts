import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: 'deactivated' }, { status: 403 })
  }

  await adminClient
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import type { UserRole } from '@/features/auth/types'

const DEFAULT_PASSWORD = 'Test1234!'

/** Client scoped to user (anon key + session) → RLS is enforced. */
export async function createUserClient(
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('missing supabase env for rls-client')

  const client = createClient<Database>(url, anon)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`)
  return client
}

/** Set role + active status on profile (admin client, bypasses RLS). */
export async function setProfileRole(userId: string, role: UserRole): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role, is_active: true })
    .eq('id', userId)
  if (error) throw new Error(`setProfileRole failed: ${error.message}`)
}

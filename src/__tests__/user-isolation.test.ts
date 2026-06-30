import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { setupTwoIsolatedUsers, teardownTestUser } from '@/lib/__tests__/test-helpers'
import { createUserClient, setProfileRole } from '@/lib/__tests__/rls-client'

let admin: { userId: string; email: string }
let member: { userId: string; email: string }
let brandId: string

beforeAll(async () => {
  const [a, b] = await setupTwoIsolatedUsers()
  admin = a
  member = b
  await setProfileRole(admin.userId, 'super_admin')
  await setProfileRole(member.userId, 'member')

  // Admin tạo brand bằng admin client (seed)
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('brands')
    .insert({ name: 'Shared-Brand', owner_user_id: admin.userId })
    .select()
    .single()
  if (error || !data) throw new Error('seed brand failed')
  brandId = data.id
})

afterAll(async () => {
  await teardownTestUser(admin.userId)
  await teardownTestUser(member.userId)
})

describe('shared workspace RLS', () => {
  it('member thấy brand do admin tạo (pool chung)', async () => {
    const client = await createUserClient(member.email)
    const { data } = await client.from('brands').select('id').eq('id', brandId)
    expect(data).toHaveLength(1)
  })

  it('member sửa được tên brand', async () => {
    const client = await createUserClient(member.email)
    const { error } = await client
      .from('brands')
      .update({ name: 'Renamed-By-Member' })
      .eq('id', brandId)
    expect(error).toBeNull()
  })

  it('member KHÔNG tạo được brand (insert bị RLS chặn)', async () => {
    const client = await createUserClient(member.email)
    const { data, error } = await client
      .from('brands')
      .insert({ name: 'Nope', owner_user_id: member.userId })
      .select()
    // RLS chặn → không có row trả về (error hoặc data rỗng)
    expect(data ?? []).toHaveLength(0)
    expect(error).not.toBeNull()
  })

  it('member KHÔNG soft-delete được brand (trigger chặn)', async () => {
    const client = await createUserClient(member.email)
    const { error } = await client
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', brandId)
    expect(error).not.toBeNull()
  })

  it('admin soft-delete được brand', async () => {
    const client = await createUserClient(admin.email)
    const { error } = await client
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', brandId)
    expect(error).toBeNull()
  })
})

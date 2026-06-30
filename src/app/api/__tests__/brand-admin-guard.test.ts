import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock verify-admin để kiểm soát kết quả guard
vi.mock('@/lib/auth/verify-admin', () => ({
  verifyAdmin: vi.fn(),
  isVerifyError: (r: unknown) => r instanceof Response,
}))

import { verifyAdmin } from '@/lib/auth/verify-admin'
import { POST } from '@/app/api/brands/route'
import { NextRequest } from 'next/server'

describe('POST /api/brands admin guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('trả 403 khi không phải admin', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) as never,
    )
    const req = new NextRequest('http://localhost/api/brands', {
      method: 'POST',
      body: JSON.stringify({ name: 'X' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

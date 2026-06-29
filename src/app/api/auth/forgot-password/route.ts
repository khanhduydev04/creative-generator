import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePassword } from '@/lib/utils/generate-password'
import { sendPasswordResetEmail } from '@/lib/email'
import { isValidEmail } from '@/features/auth/types'

const GENERIC_MESSAGE = 'If this email exists, a new password has been sent.'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const adminClient = createAdminClient()

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, full_name, is_active')
      .eq('email', email)
      .single()

    if (profile?.is_active) {
      const newPassword = generatePassword()

      await adminClient.auth.admin.updateUserById(profile.id, {
        password: newPassword,
      })

      try {
        await sendPasswordResetEmail({
          to: email,
          fullName: profile.full_name,
          password: newPassword,
        })
      } catch {
        console.error('[FORGOT_PASSWORD] Failed to send email to', email)
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch {
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const SENDER_NAME = process.env.EMAIL_SENDER_NAME || 'Adlance'
const SENDER_EMAIL = process.env.EMAIL_SENDER_ADDRESS || 'noreply@adlance.com'

interface BrevoPayload {
  sender: { name: string; email: string }
  to: Array<{ email: string; name?: string }>
  subject: string
  htmlContent: string
}

async function sendEmail(payload: BrevoPayload): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.log('[EMAIL] Brevo API key not set. Email not sent:')
    console.log(`  To: ${payload.to[0].email}`)
    console.log(`  Subject: ${payload.subject}`)
    return
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Brevo API error ${res.status}: ${errorBody}`)
  }
}

interface WelcomeEmailParams {
  to: string
  fullName: string
  password: string
  loginUrl: string
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  await sendEmail({
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: params.to, name: params.fullName }],
    subject: 'Your Adlance Account',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Welcome to Adlance</h2>
        <p>Hi ${params.fullName},</p>
        <p>Your account has been created.</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Login URL:</td><td><a href="${params.loginUrl}">${params.loginUrl}</a></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Email:</td><td>${params.to}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Temporary Password:</td><td style="font-family: monospace; background: #f3f4f6; padding: 2px 8px; border-radius: 4px;">${params.password}</td></tr>
        </table>
        <p style="color: #b45309;">⚠️ Please change your password after your first login.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">Adlance System</p>
      </div>
    `,
  })
}

interface PasswordResetEmailParams {
  to: string
  fullName: string
  password: string
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<void> {
  await sendEmail({
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: params.to, name: params.fullName }],
    subject: 'Password Reset | Adlance',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Password Reset | Adlance</h2>
        <p>Hi ${params.fullName},</p>
        <p>Your password has been reset. Here is your new temporary password:</p>
        <p style="font-family: monospace; background: #f3f4f6; padding: 8px 16px; border-radius: 6px; font-size: 16px; display: inline-block;">${params.password}</p>
        <p style="color: #b45309;">⚠️ Please change your password after logging in.</p>
        <p style="color: #6b7280; font-size: 14px;">If you did not request this, contact your admin immediately.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">Adlance System</p>
      </div>
    `,
  })
}

# Adlance — Email Templates

Supabase Auth sends transactional emails (verification, password reset). Customize them in **Studio → Authentication → Email Templates**. The application's BYOK signup flow depends on them firing correctly.

## Required customization (one-time setup)

For each template (Confirm signup, Reset password, Magic Link, Invite — invite is unused but harmless):

1. Replace every "Supabase" mention with **"Adlance"**.
2. Use brand violet `#8B5CF6` for buttons and links.
3. **Authentication → Settings → Sender details:**
   - **Sender name:** `Adlance`
   - **Sender email:** `noreply@adlance.com` once SMTP is configured (defaults to Supabase's shared sender during development)
4. **Authentication → URL Configuration:**
   - **Site URL:** `http://localhost:3000` for dev, `https://adlance.com` (or whatever domain) for prod
   - **Redirect URLs:** add both above plus any preview deployment URLs

## Confirm signup template

**Subject:** `Welcome to Adlance — verify your email`

**Body (HTML):**

- Header bar with the Adlance wordmark (host the SVG externally on the domain so it loads in mail clients).
- Greeting: `Hi {{ .Email }},`
- Body: "Thanks for signing up to Adlance. Click below to verify your email address — it expires in 24 hours."
- CTA button (violet `#8B5CF6`, 8px radius) labelled `Verify your email`, href `{{ .ConfirmationURL }}`.
- Footer: "Didn't sign up? You can ignore this email."

The button link routes through Supabase's auth callback, then redirects to `Site URL/login` (or whatever is configured under URL Configuration → Redirect URLs).

## Reset password template

**Subject:** `Reset your Adlance password`

**Body:**

- "We received a request to reset the password for your Adlance account."
- CTA button: `Reset password` linking to `{{ .ConfirmationURL }}`.
- Footer: "If you didn't request this, ignore this email — your password is unchanged."

## Verification flow (how it ties into the app)

1. User submits the signup form → `POST /api/auth/signup` calls `supabase.auth.signUp()`.
2. Supabase inserts into `auth.users`, fires the `handle_new_user` trigger (creates `public.profiles` row), and sends the verification email.
3. The app shows `/verify-pending` ("Check your email") with a Resend button (calls `POST /api/auth/resend-verification`).
4. User clicks the email link → Supabase callback verifies the token → redirects to `Site URL/login`.
5. User logs in. Middleware blocks `/app/*` while `email_confirmed_at` is null (redirects to `/verify-pending`).

## Rate limits and abuse

Supabase enforces signup + email-resend rate limits per IP. If public BYOK launch sees abuse:

- Enable **hCaptcha** under **Auth → Settings → Captcha**.
- Lower **Max emails per hour** in Auth settings.
- Consider **leaked password protection** (advisor warning surfaced — toggle it on once the password policy is finalized).

## Local dev

Supabase CLI (when running `supabase start` locally) ships an Inbucket mailcatcher at `http://localhost:54324`. All sent emails appear there — convenient for testing the confirmation + resend flow without hitting a real mailbox.

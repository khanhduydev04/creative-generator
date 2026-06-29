# Adlance

Free AI ad generator. Bring your own API keys.

## What it does

- **Concept Ads** — pick a creative strategy; AI generates copy + a polished ad image.
- **Stealth Ads** — iPhone-style organic content with the product placed candidly.
- **Library** — save, browse, and remix every generated ad.
- **Brand DNA** — identity, kit, products, personas; AI uses your brand context for every output.
- **Content Adapt** — turn saved ads into social captions in any language.
- **BYOK** — encrypted-at-rest API keys (Anthropic, Google AI, KIE). You pay providers directly. No SaaS markup.

## Tech stack

- Next.js 16 (App Router, Server Components default)
- React 19
- Supabase (PostgreSQL + Auth + Storage)
- Anthropic SDK (Claude Haiku 4.5)
- Google AI SDK (Gemini 2.5 Flash)
- KIE (nano-banana-2 image generation)
- Tailwind CSS + shadcn/ui + Geist fonts
- Vitest 4 (test framework)

## Architecture

Three layers:

1. **Public** — `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-pending`. Anyone can hit these.
2. **App (auth-gated)** — `/app/*` (dashboard, brands, library, concepts, stealth-ads, guide, settings, onboarding). Middleware enforces signed-in + email-verified.
3. **Backend** — `src/services/*`, `src/app/api/*`, Supabase. RLS policies + service-layer scoping by `owner_user_id` give defense-in-depth tenant isolation.

See the full design + decision history in:

- `docs/superpowers/specs/2026-04-30-adlance-byok-pivot-design.md` — the BYOK pivot design spec
- `docs/superpowers/plans/2026-04-30-adlance-byok-pivot.md` — the implementation plan
- `docs/handover-pati-static-ads/` — frozen snapshot of the PATI internal-tool baseline

## Getting started

```bash
npm install
cp .env.local.template .env.local
# Edit .env.local — fill in Supabase URL/keys + AI provider keys.
# Then generate the encryption master key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the 64-char hex output as ADLANCE_ENCRYPTION_KEY in .env.local.

npm run dev
# → http://localhost:3000
```

### Required env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only; admin API + RLS bypass) |
| `ADLANCE_ENCRYPTION_KEY` | 64-char hex master key for AES-256-GCM encryption of per-user API keys |

Transitional fallbacks (used by legacy code paths until they migrate to per-user storage):

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Server-level Claude key (transitional) |
| `GOOGLE_API_KEY` | Server-level Gemini key (transitional) |
| `KIE_API_KEY` | Server-level KIE key (transitional) |

## Running tests

```bash
npm test                              # full suite
npx vitest run src/lib/__tests__/     # lib unit tests only
npx vitest run src/__tests__/user-isolation.test.ts   # critical tenancy test (real DB)
```

## Database migrations

The BYOK pivot lives in `supabase/byok-pivot/` (7 migrations: drop PATI tables → alter profiles/brands → create user-scoped tables → RLS → storage RLS → handle_new_user trigger → security hardening). Apply with:

```bash
# Via Supabase MCP from a Claude Code session, or via Supabase Studio SQL editor
# in the order 01_… → 07_….
```

Older Adlance migrations (Phase 1+2 of the multi-tenant SaaS plan that was abandoned) are preserved at `supabase/adlance-snapshot/` for reference only — do not re-apply.

## License

All rights reserved. License terms to be finalized before public launch.

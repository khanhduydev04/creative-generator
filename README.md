# Ladospice

Internal AI creative studio. Generate on-brand creative assets with shared, server-side API keys.

## What it does

- **Concept Ads** — pick a creative strategy; AI generates copy + a polished ad image.
- **Stealth Ads** — iPhone-style organic content with the product placed candidly.
- **Library** — save, browse, and remix every generated ad.
- **Brand DNA** — identity, kit, products, personas; AI uses your brand context for every output.
- **Content Adapt** — turn saved ads into social captions in any language.
- **Video** — competitor video analysis, transcripts, scripts, and voice generation.

## Tech stack

- Next.js 16 (App Router, Server Components default)
- React 19
- Supabase (PostgreSQL + Auth + Storage)
- Anthropic SDK (Claude Haiku 4.5)
- Google AI SDK (Gemini 2.5 Flash)
- KIE (nano-banana-2 image generation)
- Tailwind CSS + shadcn/ui
- Vitest 4 (test framework)

## Architecture

Internal team tool — login-gated, no public signup:

1. **Public** — `/login`, `/forgot-password`, `/reset-password`. Accounts are provisioned by an admin.
2. **App (auth-gated)** — `/app/*` (dashboard, brands, library, concepts, stealth-ads, video, guide, settings, admin). Middleware enforces a signed-in user.
3. **Backend** — `src/services/*`, `src/app/api/*`, Supabase. AI provider keys are shared and read from server environment variables.

## Getting started

```bash
npm install
cp .env.local.template .env.local
# Edit .env.local — fill in Supabase URL/keys + AI provider keys.

npm run dev
# → http://localhost:3000
```

### Required env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only; admin API + RLS bypass) |
| `ANTHROPIC_API_KEY` | Shared Claude key |
| `GOOGLE_API_KEY` | Shared Gemini key |
| `KIE_API_KEY` | Shared KIE image-generation key |

## Running tests

```bash
npm test                              # full suite
npx vitest run src/lib/__tests__/     # lib unit tests only
```

## License

All rights reserved.

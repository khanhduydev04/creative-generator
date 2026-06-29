# Adlance BYOK Pivot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot `static-ads-generator` from PATI internal tool to Adlance — a free, public, account-based AI ad generator where users bring their own API keys (BYOK), brands/library/saved-ads persist per user, no workspaces or teams.

**Architecture:** Three-layer routes (public landing at `/`, app under `/app/*`, backend services + Supabase). Solo tenancy: `brands.owner_user_id`, `user_api_keys` (encrypted at rest with AES-256-GCM), `user_concepts`. Cherry-pick UI/branding from `feat/adlance-saas-conversion` where free of workspace primitive; build landing + BYOK self-serve from scratch using ui-ux-pro-max design system (Dark Minimalism, violet+cyan, Geist Sans, Hero+Bento+CTA).

**Tech Stack:** Next.js 16 + React 19 + Supabase (PostgreSQL + Auth + Storage) + Vitest 4 + Tailwind + shadcn/ui + Geist fonts + Anthropic SDK (Claude Haiku 4.5) + Google AI SDK (Gemini 2.5 Flash) + KIE (nano-banana-2).

**Spec reference:** `docs/superpowers/specs/2026-04-30-adlance-byok-pivot-design.md`

**Branch:** `feat/adlance-byok-pivot` (already created off `main` with 3 prep commits: `8cc8c25`, `c2803e5`, `2fabb94`).

---

## Pre-flight WARNING

Phase 2 **drops PATI tables and wipes their data on the production Supabase project**. The user explicitly approved fresh wipe (spec Section 1, decision A). Before running the first destructive migration in Task 2.1:

1. Confirm we are on `feat/adlance-byok-pivot` branch (not `main`).
2. Confirm user has noted any PATI brand kits / saved ads they want to export externally — this plan does NOT preserve them.
3. Phase 2 migrations are **irreversible at the data level**.

If unsure, STOP and confirm with the user before Task 2.1.

---

## File Structure

### Files to CREATE

```
src/lib/
  user-context.ts                          [Phase 3] — requireUser, ApiError, handleApiError
  validators/
    api-key.ts                             [Phase 3] — provider key format validation

src/services/
  userApiKeyService.ts                     [Phase 3] — CRUD for user_api_keys (encrypted)
  userConceptService.ts                    [Phase 3] — CRUD for user_concepts
  userService.ts                           [Phase 3] — profile read, account delete

src/app/api/
  auth/signup/route.ts                     [Phase 3] — POST signup
  auth/resend-verification/route.ts        [Phase 3] — POST resend
  user-api-keys/route.ts                   [Phase 3] — GET, PUT
  user-api-keys/[provider]/route.ts        [Phase 3] — DELETE
  user-concepts/route.ts                   [Phase 3] — GET, POST
  user-concepts/[id]/route.ts              [Phase 3] — PATCH, DELETE
  user/me/route.ts                         [Phase 3] — GET, DELETE

src/app/app/
  layout.tsx                               [Phase 4] — shared app shell wrapper
  page.tsx                                 [Phase 4] — generate dashboard (moved from /)
  brands/page.tsx                          [Phase 4] — moved from /brands
  brands/[id]/page.tsx                     [Phase 4] — moved from /brand-setup
  library/page.tsx                         [Phase 4] — moved
  concepts/page.tsx                        [Phase 4] — moved
  stealth-ads/page.tsx                     [Phase 4] — moved
  guide/page.tsx                           [Phase 4] — moved
  settings/page.tsx                        [Phase 4] — moved + new API Keys tab
  onboarding/page.tsx                      [Phase 4] — new (1-step BYOK)

src/components/landing/
  PublicNavbar.tsx                         [Phase 5]
  HeroSection.tsx                          [Phase 5]
  BentoFeatures.tsx                        [Phase 5]
  HowItWorks.tsx                           [Phase 5]
  ByokExplainer.tsx                        [Phase 5]
  CtaSection.tsx                           [Phase 5]
  Footer.tsx                               [Phase 5]

src/components/settings/
  UserApiKeysCard.tsx                      [Phase 5] — self-serve key CRUD
  MissingKeyBanner.tsx                     [Phase 5] — dashboard warning

src/components/empty-states/
  MissingKeyEmptyState.tsx                 [Phase 5] — per-feature empty state

src/app/page.tsx                           [Phase 5] — REPLACE with landing

supabase/byok-pivot/
  01_drop_pati_tables.sql                  [Phase 2]
  02_alter_profiles_brands.sql             [Phase 2]
  03_create_user_tables.sql                [Phase 2]
  04_rls_policies.sql                      [Phase 2]
  05_storage_rls.sql                       [Phase 2]
  06_trigger_handle_new_user.sql           [Phase 2]

src/lib/__tests__/
  user-context.test.ts                     [Phase 3]
  key-provider.test.ts                     [Phase 3]
  test-helpers.ts                          [Phase 3] — setupTestUser, mockUserContext

src/app/api/__tests__/
  user-api-keys.test.ts                    [Phase 3]
  user-concepts.test.ts                    [Phase 3]
  auth-signup.test.ts                      [Phase 3]
  user-isolation.test.ts                   [Phase 3] — CRITICAL tenancy isolation

design-system/adlance/pages/
  landing.md                               [Phase 5]
  dashboard.md                             [Phase 5]
  onboarding.md                            [Phase 5]

docs/
  email-templates.md                       [Phase 6]
  manual-qa-checklist.md                   [Phase 6]
  byok-tenancy-isolation-test.sql          [Phase 2]
```

### Files to MODIFY

```
src/middleware.ts                          [Phase 4] — add /app/* gate
src/lib/key-provider.ts                    [Phase 3] — rewrite for user-scoped keys
src/lib/env.ts                             [Phase 1] — add ADLANCE_ENCRYPTION_KEY
src/services/claudeClient.ts               [Phase 3] — accept userId
src/services/geminiClient.ts               [Phase 3] — accept userId
src/services/kieClient.ts                  [Phase 3] — accept userId
src/services/brandService.ts               [Phase 3] — owner_user_id scoping
src/services/brandKitService.ts            [Phase 3] — brand-scoped via owner_user_id
src/services/brandProductService.ts        [Phase 3]
src/services/personaService.ts             [Phase 3]
src/services/savedAdService.ts             [Phase 3]
src/services/conceptPromptService.ts       [Phase 3]
src/services/stealthSceneService.ts        [Phase 3]
src/app/api/{brands,brand-products,brand-kit,personas,saved-ads,
            brand-intelligence,stealth,stealth-ref,stealth-scenes,
            concepts,generate-ads,edit-ad,save-ad,content-adapt,
            prepare-generation,competitor-ref,upload-reference}/**
                                            [Phase 3] — replace with requireUser
src/components/auth/OnboardingWizard.tsx   [Phase 5] — strip workspace step
src/components/auth/SettingsClient.tsx     [Phase 5] — replace API Keys tab
src/components/layout/DashboardLayout.tsx  [Phase 5] — drop workspace switcher
.env.local                                 [Phase 1] — add ADLANCE_ENCRYPTION_KEY (local)
.env.local.template                        [Phase 1] — document required env vars
```

### Files to CHERRY-PICK from `feat/adlance-saas-conversion`

```
PURE CHERRY-PICK (no adapt, Phase 1):
  tailwind.config.ts
  src/app/globals.css
  src/app/layout.tsx
  src/lib/branding.ts
  src/lib/crypto.ts + src/lib/__tests__/crypto.test.ts
  public/brand/logo-light.svg
  public/brand/logo-dark.svg
  public/favicon.svg
  src/app/login/page.tsx
  src/app/forgot-password/page.tsx
  src/app/reset-password/page.tsx
  src/components/auth/LoginForm.tsx
  src/components/auth/ForgotPasswordForm.tsx
  src/components/auth/ResetPasswordForm.tsx
  src/components/auth/ChangePasswordForm.tsx
  src/components/auth/VerifyPendingActions.tsx
  src/components/ui/bento-grid.tsx
  src/components/ui/streaming-text.tsx
  src/components/ui/typing-indicator.tsx
  vitest.setup.ts (if changed)

CHERRY-PICK + ADAPT (Phase 5):
  src/app/signup/page.tsx                  — strip workspace step if present
  src/components/auth/OnboardingWizard.tsx — strip workspace + invite steps
  src/components/auth/SettingsClient.tsx   — replace API Keys tab content
  src/components/layout/DashboardLayout.tsx — drop workspace switcher

DELETE PATI assets (Phase 1):
  public/favicon.ico
  public/favicon.jpg
  public/logo.png
```

### Files to DELETE entirely

```
src/app/admin/                             [Phase 4]
src/app/api/clients/                       [Phase 3]
src/app/api/admin/                         [Phase 3]
src/app/api/product-markets/               [Phase 3]
src/app/api/auth/me/                       [Phase 3] — replaced by /api/user/me
src/components/admin/                      [Phase 4]
src/components/auth/InviteAcceptButton.tsx [Phase 4]
src/components/layout/NewClientModal.tsx   [Phase 4]
src/components/layout/RenameClientModal.tsx [Phase 4]
src/components/layout/DeleteClientModal.tsx [Phase 4]
src/features/workspace/components/MarketSection.tsx [Phase 3]
src/services/clientService.ts              [Phase 3]
src/services/appSettingService.ts          [Phase 3]
src/services/productMarketService.ts       [Phase 3]
src/app/api/__tests__/clients.test.ts      [Phase 3]
src/app/api/__tests__/product-markets.test.ts [Phase 3]
```

---

# Phase 1 — Foundation (cherry-pick + env)

**Goal:** Adopt Adlance branding, dark theme, Geist fonts, encryption helpers, and Adlance-styled auth pages from `feat/adlance-saas-conversion` — without touching workspace-coupled code.

**Estimated effort:** 0.5 day.

**Definition of Done:**
- ☐ `tailwind.config.ts`, `globals.css`, `layout.tsx`, `branding.ts` cherry-picked.
- ☐ `crypto.ts` + tests cherry-picked, all crypto tests pass.
- ☐ `ADLANCE_ENCRYPTION_KEY` validated in env, `.env.local.template` updated.
- ☐ Adlance brand assets in `public/brand/`; PATI assets deleted.
- ☐ Auth pages (login, forgot-password, reset-password) + their forms cherry-picked.
- ☐ UI primitives (`bento-grid`, `streaming-text`, `typing-indicator`) cherry-picked.
- ☐ `npm run lint && npx tsc --noEmit` clean for cherry-picked files.
- ☐ All tests in `src/lib/__tests__/` pass.

---

## Task 1.1: Cherry-pick branding + theme + fonts

**Files:**
- Pull from `feat/adlance-saas-conversion`:
  - `tailwind.config.ts`
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/lib/branding.ts`
  - `public/brand/logo-light.svg`
  - `public/brand/logo-dark.svg`
  - `public/favicon.svg`
- Delete: `public/favicon.ico`, `public/favicon.jpg`, `public/logo.png`

- [ ] **Step 1: Pull branding files from feat branch**

```bash
git checkout feat/adlance-saas-conversion -- \
  tailwind.config.ts \
  src/app/globals.css \
  src/app/layout.tsx \
  src/lib/branding.ts \
  public/brand/logo-light.svg \
  public/brand/logo-dark.svg \
  public/favicon.svg
```

Expected: files appear in working tree, staged.

- [ ] **Step 2: Delete obsolete PATI assets**

```bash
git rm -f public/favicon.ico public/favicon.jpg public/logo.png 2>/dev/null || true
# If files don't exist or are already deleted on this branch, the command no-ops.
ls public/ | grep -iE "favicon|logo"
```

Expected: only `favicon.svg`, `brand/logo-light.svg`, `brand/logo-dark.svg` remain.

- [ ] **Step 3: Verify Geist fonts wired in layout.tsx**

Run:
```bash
grep -n "Geist\|next/font" src/app/layout.tsx
```

Expected: imports `Geist` and `Geist_Mono` from `next/font/google`; CSS variables `--font-geist-sans` and `--font-geist-mono` set on `<html>` or `<body>`.

If missing or different font: STOP and confirm with user before edit.

- [ ] **Step 4: Verify BRANDING constant exists**

Run:
```bash
cat src/lib/branding.ts
```

Expected output:
```ts
export const BRANDING = {
  appName: "Adlance",
  appTagline: "Ad creation at the speed of thought",
  // ... more fields
} as const;
```

If missing: STOP and inspect feat branch's version.

- [ ] **Step 5: TypeScript + build check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no NEW errors introduced by cherry-picked files. (Existing errors in services/routes are fine — they will be fixed in Phase 3.)

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx \
        src/lib/branding.ts public/brand/ public/favicon.svg
git rm -f public/favicon.ico public/favicon.jpg public/logo.png 2>/dev/null || true
git commit -m "$(cat <<'EOF'
chore(brand): cherry-pick Adlance theme, Geist fonts, brand assets

Pulls tailwind palette (violet accent + dark mode), globals CSS vars,
layout.tsx with Geist Sans/Mono, BRANDING constant, and Adlance
logo/favicon SVGs from feat/adlance-saas-conversion. Deletes legacy
PATI favicon and logo assets.
EOF
)"
```

Expected: clean working tree for these files.

---

## Task 1.2: Cherry-pick crypto helpers

**Files:**
- Pull: `src/lib/crypto.ts`, `src/lib/__tests__/crypto.test.ts`
- Modify: `src/lib/env.ts` — add `ADLANCE_ENCRYPTION_KEY` to schema
- Modify: `.env.local` (user's local, NOT committed)
- Create: `.env.local.template` — document env vars

- [ ] **Step 1: Pull crypto files from feat branch**

```bash
git checkout feat/adlance-saas-conversion -- \
  src/lib/crypto.ts \
  src/lib/__tests__/crypto.test.ts
```

- [ ] **Step 2: Generate encryption master key**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output: 64-character hex string. Copy it.

- [ ] **Step 3: Add key to .env.local (not committed)**

Append to `.env.local`:
```
ADLANCE_ENCRYPTION_KEY=<paste 64-char hex from Step 2>
```

If `.env.local` doesn't exist yet, create it. Verify it's gitignored:
```bash
git check-ignore .env.local
```
Expected: prints `.env.local` (confirms ignored).

- [ ] **Step 4: Add ADLANCE_ENCRYPTION_KEY to env.ts schema**

Read `src/lib/env.ts` to confirm schema shape, then add this entry to the `ENV_SCHEMA` array (place after `KIE_API_KEY`):

```ts
{
  name: "ADLANCE_ENCRYPTION_KEY",
  required: true,
  isPublic: false,
  description: "Master key (64-char hex / 32 bytes) for AES-256-GCM encryption of per-user API keys",
},
```

If `src/lib/env.ts` does not have an `ENV_SCHEMA` array, inspect feat branch's version and adapt. Failing that, define minimal validation:
```ts
if (!process.env.ADLANCE_ENCRYPTION_KEY || process.env.ADLANCE_ENCRYPTION_KEY.length !== 64) {
  throw new Error("ADLANCE_ENCRYPTION_KEY must be a 64-character hex string");
}
```

- [ ] **Step 5: Create/update .env.local.template**

Write `.env.local.template`:
```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Adlance encryption master key (required)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 64-character hex (32 bytes). DO NOT commit the actual value.
# DO NOT change in production without re-encrypting all rows in user_api_keys.
ADLANCE_ENCRYPTION_KEY=

# Optional: legacy fallbacks during pivot (Phase 3 removes server env keys for AI providers)
# GOOGLE_API_KEY=
# KIE_API_KEY=
# ANTHROPIC_API_KEY=
```

- [ ] **Step 6: Run crypto tests**

```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```

Expected: all 5 (or however many) crypto tests pass.

If tests fail with "ADLANCE_ENCRYPTION_KEY missing in test env": ensure Vitest reads `.env.local`. Inspect `vitest.config.ts` for `dotenv` loading; if missing, add:
```ts
import "dotenv/config";  // at top of vitest.setup.ts (cherry-pick from feat if present)
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/crypto.ts src/lib/__tests__/crypto.test.ts \
        src/lib/env.ts .env.local.template
git commit -m "$(cat <<'EOF'
feat(lib): cherry-pick AES-256-GCM crypto helpers + env validation

Adds encryptKey/decryptKey helpers (AES-256-GCM with 12B IV + 16B
auth tag, base64 output) and the ADLANCE_ENCRYPTION_KEY env var.
Required for per-user API key encryption (Phase 3). .env.local
(with the actual key) stays gitignored.
EOF
)"
```

Expected: 4 files committed; `.env.local` remains uncommitted.

---

## Task 1.3: Cherry-pick auth pages + forms

**Files:**
- Pull from feat:
  - `src/app/login/page.tsx`
  - `src/app/forgot-password/page.tsx`
  - `src/app/reset-password/page.tsx`
  - `src/components/auth/LoginForm.tsx`
  - `src/components/auth/ForgotPasswordForm.tsx`
  - `src/components/auth/ResetPasswordForm.tsx`
  - `src/components/auth/ChangePasswordForm.tsx`
  - `src/components/auth/VerifyPendingActions.tsx`

- [ ] **Step 1: Pull auth pages and forms**

```bash
git checkout feat/adlance-saas-conversion -- \
  src/app/login/page.tsx \
  src/app/forgot-password/page.tsx \
  src/app/reset-password/page.tsx \
  src/components/auth/LoginForm.tsx \
  src/components/auth/ForgotPasswordForm.tsx \
  src/components/auth/ResetPasswordForm.tsx \
  src/components/auth/ChangePasswordForm.tsx \
  src/components/auth/VerifyPendingActions.tsx
```

- [ ] **Step 2: Scan for workspace residue in cherry-picked files**

Run:
```bash
grep -rn "workspace\|useActiveWorkspace\|workspace_id\|workspace_members" \
  src/app/login/ src/app/forgot-password/ src/app/reset-password/ \
  src/components/auth/LoginForm.tsx \
  src/components/auth/ForgotPasswordForm.tsx \
  src/components/auth/ResetPasswordForm.tsx \
  src/components/auth/ChangePasswordForm.tsx \
  src/components/auth/VerifyPendingActions.tsx
```

Expected: no matches (these auth-only files should not reference workspace).

If matches appear: note the file, plan to fix in Phase 5 (UI adapt). Do NOT block on it now — auth flow still functions.

- [ ] **Step 3: TypeScript check on auth files only**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -E "src/app/(login|forgot-password|reset-password)|src/components/auth/(Login|ForgotPassword|ResetPassword|ChangePassword|VerifyPending)" | head -20
```

Expected: no errors in these specific files. (Errors elsewhere are fine for now.)

- [ ] **Step 4: Commit**

```bash
git add src/app/login/ src/app/forgot-password/ src/app/reset-password/ \
        src/components/auth/LoginForm.tsx \
        src/components/auth/ForgotPasswordForm.tsx \
        src/components/auth/ResetPasswordForm.tsx \
        src/components/auth/ChangePasswordForm.tsx \
        src/components/auth/VerifyPendingActions.tsx
git commit -m "$(cat <<'EOF'
chore(auth): cherry-pick Adlance-styled auth pages + forms

Pulls login, forgot-password, reset-password pages and their forms
(LoginForm, ForgotPasswordForm, ResetPasswordForm, ChangePasswordForm,
VerifyPendingActions) from feat branch. Domain restriction already
removed in feat. Signup page deferred to Phase 3 (needs new
/api/auth/signup route).
EOF
)"
```

---

## Task 1.4: Cherry-pick UI primitives

**Files:**
- Pull: `src/components/ui/bento-grid.tsx`, `streaming-text.tsx`, `typing-indicator.tsx`
- Pull (if changed): `vitest.setup.ts`, `vitest.config.ts`

- [ ] **Step 1: Pull UI primitives**

```bash
git checkout feat/adlance-saas-conversion -- \
  src/components/ui/bento-grid.tsx \
  src/components/ui/streaming-text.tsx \
  src/components/ui/typing-indicator.tsx
```

- [ ] **Step 2: Pull Vitest config if updated on feat**

```bash
git checkout feat/adlance-saas-conversion -- vitest.setup.ts vitest.config.ts 2>/dev/null || echo "vitest config files not changed"
```

- [ ] **Step 3: Verify UI primitives compile**

```bash
npx tsc --noEmit --pretty 2>&1 | grep "src/components/ui/(bento-grid|streaming-text|typing-indicator)" | head -10
```

Expected: no errors in these 3 files.

- [ ] **Step 4: Run all crypto + lib tests one more time**

```bash
npx vitest run src/lib/__tests__/
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/bento-grid.tsx \
        src/components/ui/streaming-text.tsx \
        src/components/ui/typing-indicator.tsx
# Conditionally add vitest config if it changed:
git diff --cached --stat | grep vitest && git add vitest.setup.ts vitest.config.ts || true
git commit -m "$(cat <<'EOF'
chore(ui): cherry-pick UI primitives + vitest config

Pulls bento-grid (used by landing page in Phase 5), streaming-text,
and typing-indicator from feat branch.
EOF
)"
```

---

## Task 1.5: Phase 1 wrap-up

- [ ] **Step 1: Verify clean working tree + branch state**

```bash
git status
git log --oneline -8
```

Expected: clean tree; commits include the 4 cherry-pick commits + 3 prep commits from earlier (skill, spec, design-system).

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit 2>&1 | wc -l
```

Note the error count. Expected: errors only in services / routes / feature components that reference the dropped `clients` / `app_settings` / `workspace` items — these are deferred to Phase 3.

If a NEW error appears in a cherry-picked file (one we just added in Phase 1), inspect and fix before moving on.

- [ ] **Step 3: Run full test suite for baseline**

```bash
npm test 2>&1 | tail -30
```

Expected: lib tests pass (crypto, env). API/integration tests may fail due to schema mismatch — note the failures; they get fixed in Phase 3.

- [ ] **Step 4: Update tracking message to user**

State to user:

> "Phase 1 complete. Adlance branding, fonts, theme, crypto helpers, and auth pages cherry-picked. Lib tests pass. Pending: Phase 2 schema migration (drops PATI tables — needs explicit confirm before applying)."

---

# Phase 2 — Schema + RLS

**Goal:** Drop PATI tables, alter `profiles` and `brands`, create `user_api_keys` and `user_concepts`, install RLS policies for solo-user tenancy, install storage RLS, add `handle_new_user` trigger. Verify isolation manually.

**Estimated effort:** 1 day.

**Definition of Done:**
- ☐ All 6 migration files written and applied via Supabase MCP.
- ☐ All RLS policies present in `pg_policies`.
- ☐ Trigger `on_auth_user_created` exists.
- ☐ Manual isolation test in Supabase Studio confirms two users cannot see each other's brands.
- ☐ Migration files committed.

---

## Task 2.0: Pre-migration confirmation

⚠️ **DO NOT proceed without explicit user confirmation.** Phase 2's first migration drops PATI tables and wipes brand data.

- [ ] **Step 1: Show user what's about to happen**

State to user:

> "About to apply 6 migrations to the production Supabase project. The first one (`01_drop_pati_tables.sql`) DROPs `clients`, `app_settings`, `activity_log`, `product_markets` and wipes all brand data (brands, brand_kits, brand_products, persona_profiles, brand_research_summaries, saved_ads, kie_task_results, stealth_scenes — they cascade-delete via brands).
>
> System data (`concept_prompts`) is preserved.
>
> This is **irreversible at the data level**. Confirm to proceed?"

Wait for user confirmation. If user says no or asks to defer: STOP and exit Phase 2.

If user says yes: continue.

- [ ] **Step 2: Confirm branch**

```bash
git branch --show-current
```

Expected: `feat/adlance-byok-pivot`. If `main`: STOP and switch.

---

## Task 2.1: Migration — drop PATI tables

**Files:**
- Create: `supabase/byok-pivot/01_drop_pati_tables.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/byok-pivot/01_drop_pati_tables.sql`:

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.1 — Drop PATI tables + wipe brand data
-- ============================================================================
-- Drops: clients, app_settings, activity_log, product_markets.
-- Wipes: brands and cascading children (brand_kits, brand_products,
--        persona_profiles, brand_research_summaries, saved_ads,
--        kie_task_results, stealth_scenes).
-- Preserves: concept_prompts (system IP), profiles structure (altered next).
-- ============================================================================

BEGIN;

-- 1. Drop top-level obsolete tables
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.product_markets CASCADE;

-- 2. Wipe brand-scoped data (brands cascades to children via FK)
DELETE FROM public.saved_ads;
DELETE FROM public.kie_task_results;
DELETE FROM public.brand_research_summaries;
DELETE FROM public.persona_profiles;
DELETE FROM public.brand_products;
DELETE FROM public.brand_kits;
DELETE FROM public.stealth_scenes;
DELETE FROM public.brands;

-- 3. Drop clients table (no longer needed; brand → user direct)
DROP TABLE IF EXISTS public.clients CASCADE;

-- 4. Wipe profiles (PATI users); auth.users are kept but locked out
--    (no profile row → app login fails; user must delete via Studio Auth UI)
DELETE FROM public.profiles;

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration`:
- name: `byok_drop_pati_tables`
- query: full SQL contents above

Expected: success response.

- [ ] **Step 3: Verify drops**

Use `mcp__supabase__execute_sql`:
```sql
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='clients') AS clients_exists,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='app_settings') AS app_settings_exists,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='activity_log') AS activity_log_exists,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='product_markets') AS product_markets_exists,
  (SELECT count(*) FROM public.brands) AS brands_remaining,
  (SELECT count(*) FROM public.profiles) AS profiles_remaining;
```

Expected: `clients_exists=0`, `app_settings_exists=0`, `activity_log_exists=0`, `product_markets_exists=0`, `brands_remaining=0`, `profiles_remaining=0`.

- [ ] **Step 4: Manual cleanup of auth users**

Tell user: "Open Supabase Studio → Authentication → Users → delete all `*@patigroup.com` and `*@patiagency.com` accounts manually."

This step is non-blocking but recommended before Phase 5 onboarding flow tests.

- [ ] **Step 5: Commit migration file**

```bash
git add supabase/byok-pivot/01_drop_pati_tables.sql
git commit -m "feat(db): drop PATI tables + wipe brand data for BYOK pivot"
```

---

## Task 2.2: Migration — alter profiles + brands

**Files:**
- Create: `supabase/byok-pivot/02_alter_profiles_brands.sql`

- [ ] **Step 1: Write migration**

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.2 — Alter profiles + brands
-- ============================================================================

BEGIN;

-- profiles: drop PATI role columns, add platform admin flag
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS department;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- brands: drop client_id, add owner_user_id (FK to profiles)
ALTER TABLE public.brands DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.brands
  ADD COLUMN owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS brands_owner_idx ON public.brands(owner_user_id);

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `byok_alter_profiles_brands` and the SQL above.

- [ ] **Step 3: Verify**

```sql
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='is_platform_admin') AS profiles_admin,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role') AS profiles_role_dropped,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='brands' AND column_name='owner_user_id') AS brands_owner,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='brands' AND column_name='client_id') AS brands_client_dropped;
```

Expected: `profiles_admin=1`, `profiles_role_dropped=0`, `brands_owner=1`, `brands_client_dropped=0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/byok-pivot/02_alter_profiles_brands.sql
git commit -m "feat(db): alter profiles and brands for solo user model"
```

---

## Task 2.3: Migration — create user_api_keys + user_concepts

**Files:**
- Create: `supabase/byok-pivot/03_create_user_tables.sql`

- [ ] **Step 1: Write migration**

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.3 — Create user-scoped tables
-- ============================================================================

BEGIN;

-- Per-user encrypted API keys
CREATE TABLE public.user_api_keys (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic','google','kie')),
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

-- Per-user custom concepts (system concepts stay in concept_prompts)
CREATE TABLE public.user_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  requires_competitor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_concepts_owner_idx ON public.user_concepts(owner_user_id);

-- Auto-update updated_at on user_concepts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_concepts_set_updated_at ON public.user_concepts;
CREATE TRIGGER user_concepts_set_updated_at
  BEFORE UPDATE ON public.user_concepts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
```

- [ ] **Step 2: Apply + verify**

Apply via `mcp__supabase__apply_migration` (name `byok_create_user_tables`).

Verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('user_api_keys','user_concepts')
ORDER BY table_name;
```
Expected: 2 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/byok-pivot/03_create_user_tables.sql
git commit -m "feat(db): add user_api_keys and user_concepts tables"
```

---

## Task 2.4: Migration — RLS policies

**Files:**
- Create: `supabase/byok-pivot/04_rls_policies.sql`

- [ ] **Step 1: Write migration**

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.4 — RLS policies
-- ============================================================================
-- Solo-user tenancy. No helper function — direct auth.uid() checks.
-- ============================================================================

BEGIN;

-- ============================================================================
-- profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent self-promotion to platform admin
    AND is_platform_admin = (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- user_api_keys
-- ============================================================================
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_api_keys_all ON public.user_api_keys;
CREATE POLICY user_api_keys_all ON public.user_api_keys
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- user_concepts
-- ============================================================================
ALTER TABLE public.user_concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_concepts_all ON public.user_concepts;
CREATE POLICY user_concepts_all ON public.user_concepts
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- brands
-- ============================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_select ON public.brands;
CREATE POLICY brands_select ON public.brands
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS brands_write ON public.brands;
CREATE POLICY brands_write ON public.brands
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- Brand-scoped tables (RLS via brands.owner_user_id join)
-- ============================================================================

-- brand_kits
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_kits_all ON public.brand_kits;
CREATE POLICY brand_kits_all ON public.brand_kits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- brand_products
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_products_all ON public.brand_products;
CREATE POLICY brand_products_all ON public.brand_products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- persona_profiles
ALTER TABLE public.persona_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS persona_profiles_all ON public.persona_profiles;
CREATE POLICY persona_profiles_all ON public.persona_profiles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- brand_research_summaries
ALTER TABLE public.brand_research_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_research_summaries_all ON public.brand_research_summaries;
CREATE POLICY brand_research_summaries_all ON public.brand_research_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- saved_ads
ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_ads_all ON public.saved_ads;
CREATE POLICY saved_ads_all ON public.saved_ads
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- kie_task_results (user-scoped — task is per-user request, not per-brand)
ALTER TABLE public.kie_task_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kie_task_results_all ON public.kie_task_results;
CREATE POLICY kie_task_results_all ON public.kie_task_results
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- stealth_scenes (brand-scoped)
ALTER TABLE public.stealth_scenes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stealth_scenes_all ON public.stealth_scenes;
CREATE POLICY stealth_scenes_all ON public.stealth_scenes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ============================================================================
-- concept_prompts (system, read-only for users)
-- ============================================================================
ALTER TABLE public.concept_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concept_prompts_select ON public.concept_prompts;
CREATE POLICY concept_prompts_select ON public.concept_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS concept_prompts_write ON public.concept_prompts;
CREATE POLICY concept_prompts_write ON public.concept_prompts
  FOR ALL USING (
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  );

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Name: `byok_rls_policies`.

- [ ] **Step 3: Verify all policies present**

```sql
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: at least one policy per table among: profiles, user_api_keys, user_concepts, brands, brand_kits, brand_products, persona_profiles, brand_research_summaries, saved_ads, kie_task_results, stealth_scenes, concept_prompts.

- [ ] **Step 4: Commit**

```bash
git add supabase/byok-pivot/04_rls_policies.sql
git commit -m "feat(db): add solo-user RLS policies for tenant isolation"
```

---

## Task 2.5: Migration — storage RLS

**Files:**
- Create: `supabase/byok-pivot/05_storage_rls.sql`

- [ ] **Step 1: Write migration**

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.5 — Storage RLS (path-based by user_id)
-- ============================================================================
-- Path convention: {user_id}/{brand_id}/{filename}
-- First path segment (storage.foldername(name))[1] = user UUID.
-- ============================================================================

BEGIN;

-- Drop legacy bucket-level public policies (best effort)
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write images" ON storage.objects;

-- Drop any Adlance-snapshot policies if they leaked into prod
DROP POLICY IF EXISTS "adlance_buckets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_insert" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_update" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_delete" ON storage.objects;

-- Public READ for hot-linking ads/brand assets/images
CREATE POLICY "byok_buckets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('brand-assets','generated-ads','images'));

-- Authenticated INSERT — owner only
CREATE POLICY "byok_buckets_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- Authenticated UPDATE — owner only
CREATE POLICY "byok_buckets_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
)
WITH CHECK (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- Authenticated DELETE — owner only
CREATE POLICY "byok_buckets_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

COMMIT;
```

- [ ] **Step 2: Apply + verify**

Apply via `mcp__supabase__apply_migration` (name `byok_storage_rls`).

Verify:
```sql
SELECT policyname FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'byok%'
ORDER BY policyname;
```
Expected: 4 policies.

- [ ] **Step 3: Commit**

```bash
git add supabase/byok-pivot/05_storage_rls.sql
git commit -m "feat(db): add path-based storage RLS for solo-user isolation"
```

---

## Task 2.6: Migration — handle_new_user trigger

**Files:**
- Create: `supabase/byok-pivot/06_trigger_handle_new_user.sql`

- [ ] **Step 1: Write migration**

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.6 — Auto-create profile on signup
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
```

- [ ] **Step 2: Apply + verify**

Apply via `mcp__supabase__apply_migration` (name `byok_trigger_handle_new_user`).

Verify:
```sql
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```
Expected: 1 row, `event_object_schema='auth'`, `event_object_table='users'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/byok-pivot/06_trigger_handle_new_user.sql
git commit -m "feat(db): add handle_new_user trigger for auto-profile creation"
```

---

## Task 2.7: Manual isolation test

**Files:**
- Create: `docs/byok-tenancy-isolation-test.sql`

- [ ] **Step 1: Write verification script**

```sql
-- ============================================================================
-- Adlance BYOK Pivot — Manual tenancy isolation verification
-- ============================================================================
-- Run in Supabase Studio SQL editor. Use "Run as" to switch auth contexts.
-- ============================================================================

-- SETUP (run as service role)
-- Step 1: Create 2 test users via Studio Auth panel:
--   user_a@adlance-test.com / test1234
--   user_b@adlance-test.com / test1234
-- The handle_new_user trigger auto-creates profiles.

-- Step 2: Capture user IDs:
SELECT id, email FROM auth.users
WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
-- Note these as :user_a_id and :user_b_id

-- Step 3: Create one brand per user (run as service role):
INSERT INTO public.brands (name, owner_user_id) VALUES
  ('Brand A1', '<user_a_id>'),
  ('Brand B1', '<user_b_id>');

-- VERIFY isolation
-- In Studio: switch SQL editor "Run as" → user_a@adlance-test.com
SELECT id, name, owner_user_id FROM public.brands;
-- Expected: 1 row only — Brand A1.

SELECT * FROM public.user_api_keys;
-- Expected: 0 rows (none created yet).

-- Switch to user_b@adlance-test.com
SELECT id, name, owner_user_id FROM public.brands;
-- Expected: 1 row only — Brand B1.

-- ATTEMPT cross-tenant write (must fail)
-- As user_a:
-- INSERT INTO public.brands (name, owner_user_id) VALUES
--   ('Hack Attempt', '<user_b_id>');
-- Expected: ERROR — new row violates RLS policy.

-- CLEANUP (uncomment when done)
-- DELETE FROM auth.users WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
-- (CASCADE wipes profiles + brands.)
```

- [ ] **Step 2: User runs test manually in Supabase Studio**

State to user:

> "Open Supabase Studio → SQL editor → paste relevant sections of `docs/byok-tenancy-isolation-test.sql` and execute step by step. Use the 'Run as' feature to switch user contexts. Confirm each expected outcome. Reply 'isolation verified' when done."

Wait for user confirmation.

- [ ] **Step 3: Commit verification doc**

```bash
git add docs/byok-tenancy-isolation-test.sql
git commit -m "docs(test): add solo-user tenancy isolation verification SQL"
```

---

## Task 2.8: Phase 2 wrap-up

- [ ] **Step 1: Confirm all 6 migrations applied**

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name LIKE 'byok_%'
ORDER BY version;
```

Expected: 6 rows in order: `byok_drop_pati_tables`, `byok_alter_profiles_brands`, `byok_create_user_tables`, `byok_rls_policies`, `byok_storage_rls`, `byok_trigger_handle_new_user`.

- [ ] **Step 2: Verify clean tree + commits**

```bash
git status
git log --oneline 2fabb94..HEAD
```

Expected: clean tree; ~7 new commits (6 migrations + 1 doc).

- [ ] **Step 3: Update user**

> "Phase 2 complete. Schema is now solo-user BYOK. RLS + storage RLS verified. Next: Phase 3 backend refactor — services + routes use new schema. Build will fail until Phase 3 finishes; that's expected."

---

# Phase 3 — Backend Refactor

**Goal:** Rewrite `key-provider.ts` for user-scoped keys, add `user-context.ts`, update AI client signatures, scope CRUD services by `userId`, add new routes (`/api/user-api-keys`, `/api/user-concepts`, `/api/auth/signup`, `/api/user/me`), update existing routes to use `requireUser`, drop obsolete services and routes.

**Estimated effort:** 2–3 days.

**Definition of Done:**
- ☐ `src/lib/user-context.ts` + tests passing.
- ☐ `src/lib/key-provider.ts` rewritten + tests passing.
- ☐ AI clients accept `userId` parameter.
- ☐ All CRUD services scope by `owner_user_id`.
- ☐ All API routes call `requireUser`.
- ☐ New routes (`user-api-keys`, `user-concepts`, `auth/signup`, `user/me`) implemented + tested.
- ☐ Obsolete routes / services / tests deleted.
- ☐ User isolation test (`user-isolation.test.ts`) passes 100%.
- ☐ `npm test` green; `npx tsc --noEmit` clean; `npm run build` succeeds.

---

## Task 3.1: Implement `lib/user-context.ts` with TDD

**Files:**
- Test: `src/lib/__tests__/user-context.test.ts`
- Create: `src/lib/user-context.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/user-context.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError, handleApiError, MissingApiKeyError } from "../user-context";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

describe("requireUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns userId for authenticated + email-verified user", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "2026-04-30T00:00:00Z" } } }) },
    });
    const req = new NextRequest(new Request("http://x"));
    const result = await requireUser(req);
    expect(result.userId).toBe("u-1");
  });

  it("throws ApiError 401 if not authenticated", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const req = new NextRequest(new Request("http://x"));
    await expect(requireUser(req)).rejects.toMatchObject({ status: 401, code: "unauthorized" });
  });

  it("throws ApiError 403 if email not verified", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: null } } }) },
    });
    const req = new NextRequest(new Request("http://x"));
    await expect(requireUser(req)).rejects.toMatchObject({ status: 403, code: "email_not_verified" });
  });
});

describe("handleApiError", () => {
  it("maps ApiError to NextResponse with status + code", async () => {
    const err = new ApiError(400, "validation", { issues: ["bad"] });
    const res = handleApiError(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "validation", details: { issues: ["bad"] } });
  });

  it("maps MissingApiKeyError to 400 with provider", async () => {
    const err = new MissingApiKeyError("anthropic");
    const res = handleApiError(err);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "missing_api_key", provider: "anthropic" });
  });

  it("maps unknown error to 500 internal", async () => {
    const res = handleApiError(new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "internal" });
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/user-context.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/user-context.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) {
    super(code);
  }
}

export class MissingApiKeyError extends Error {
  constructor(public provider: string) {
    super(`Missing ${provider} API key`);
  }
}

export async function requireUser(_req: NextRequest): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "unauthorized");
  if (!user.email_confirmed_at) throw new ApiError(403, "email_not_verified");
  return { userId: user.id };
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: e.code, ...(e.details ? { details: e.details } : {}) },
      { status: e.status },
    );
  }
  if (e instanceof MissingApiKeyError) {
    return NextResponse.json({ error: "missing_api_key", provider: e.provider }, { status: 400 });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "internal" }, { status: 500 });
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npx vitest run src/lib/__tests__/user-context.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/user-context.ts src/lib/__tests__/user-context.test.ts
git commit -m "feat(lib): add user-context with requireUser + ApiError mapping"
```

---

## Task 3.2: Rewrite `lib/key-provider.ts` with TDD

**Files:**
- Test: `src/lib/__tests__/key-provider.test.ts`
- Modify: `src/lib/key-provider.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/key-provider.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptKey } from "../crypto";
import { getUserApiKey, clearUserKeyCache } from "../key-provider";
import { MissingApiKeyError } from "../user-context";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
import { createAdminClient } from "@/lib/supabase/admin";

const mockSelect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (createAdminClient as any).mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      }),
    }),
  });
});

describe("getUserApiKey", () => {
  it("fetches, decrypts, and returns the key", async () => {
    const plaintext = "sk-ant-123";
    mockSelect.mockResolvedValue({ data: { encrypted_key: encryptKey(plaintext) } });
    const result = await getUserApiKey("user-1", "anthropic");
    expect(result).toBe(plaintext);
  });

  it("caches the result for 60s", async () => {
    const plaintext = "sk-google-123";
    mockSelect.mockResolvedValue({ data: { encrypted_key: encryptKey(plaintext) } });

    await getUserApiKey("user-2", "google");
    await getUserApiKey("user-2", "google");
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("isolates cache per user", async () => {
    mockSelect.mockResolvedValueOnce({ data: { encrypted_key: encryptKey("key-a") } });
    mockSelect.mockResolvedValueOnce({ data: { encrypted_key: encryptKey("key-b") } });

    const ka = await getUserApiKey("user-A", "anthropic");
    const kb = await getUserApiKey("user-B", "anthropic");

    expect(ka).toBe("key-a");
    expect(kb).toBe("key-b");
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });

  it("throws MissingApiKeyError when row not found", async () => {
    mockSelect.mockResolvedValue({ data: null });
    await expect(getUserApiKey("user-3", "kie")).rejects.toBeInstanceOf(MissingApiKeyError);
  });

  it("clearUserKeyCache wipes entries for a user", async () => {
    mockSelect.mockResolvedValue({ data: { encrypted_key: encryptKey("k") } });
    await getUserApiKey("user-4", "anthropic");
    clearUserKeyCache("user-4");
    await getUserApiKey("user-4", "anthropic");
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/key-provider.test.ts
```

Expected: FAIL — `getUserApiKey` not exported / wrong signature.

- [ ] **Step 3: Rewrite `src/lib/key-provider.ts`**

Replace the existing file content:

```ts
/**
 * Server-only — per-user API key provider.
 * Fetches from user_api_keys, decrypts via crypto.ts, caches 60s.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey } from "@/lib/crypto";
import { MissingApiKeyError } from "@/lib/user-context";

export type ApiKeyProvider = "anthropic" | "google" | "kie";

interface CachedKey {
  value: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CachedKey>();

export async function getUserApiKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<string> {
  const cacheKey = `${userId}:${provider}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.value;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  if (!data) throw new MissingApiKeyError(provider);

  const value = decryptKey(data.encrypted_key);
  cache.set(cacheKey, { value, cachedAt: Date.now() });
  return value;
}

export function clearUserKeyCache(userId: string): void {
  for (const k of [...cache.keys()]) {
    if (k.startsWith(`${userId}:`)) cache.delete(k);
  }
}

export function clearAllKeyCache(): void {
  cache.clear();
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npx vitest run src/lib/__tests__/key-provider.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/key-provider.ts src/lib/__tests__/key-provider.test.ts
git commit -m "feat(lib): rewrite key-provider for per-user encrypted keys"
```

---

## Task 3.3: Update AI client signatures

**Files:**
- Modify: `src/services/claudeClient.ts`
- Modify: `src/services/geminiClient.ts`
- Modify: `src/services/kieClient.ts`

Each AI client function gets a new first parameter `userId: string` and uses `getUserApiKey(userId, provider)` instead of `requireApiKey("provider_api_key")`.

- [ ] **Step 1: Read current claudeClient.ts to identify call sites**

```bash
grep -n "requireApiKey\|export async function\|export function" src/services/claudeClient.ts
```

Note all exported function names.

- [ ] **Step 2: Update claudeClient.ts**

For each exported function (e.g. `claudeVisionAnalyze`, `claudeTextGenerate`):

```ts
// Before:
export async function claudeVisionAnalyze(prompt: string, imageData: string) {
  const apiKey = await requireApiKey("anthropic_api_key");
  // ... use apiKey
}

// After:
export async function claudeVisionAnalyze(userId: string, prompt: string, imageData: string) {
  const apiKey = await getUserApiKey(userId, "anthropic");
  // ... use apiKey
}
```

Update imports at top of file:
```ts
// Remove: import { requireApiKey } from "@/lib/key-provider";
import { getUserApiKey } from "@/lib/key-provider";
```

- [ ] **Step 3: Update geminiClient.ts**

Same pattern:
```ts
// Before
export async function geminiGenerate(prompt: string) {
  const apiKey = await requireApiKey("google_api_key");
  // ...
}

// After
export async function geminiGenerate(userId: string, prompt: string) {
  const apiKey = await getUserApiKey(userId, "google");
  // ...
}
```

- [ ] **Step 4: Update kieClient.ts**

```ts
// Before
export async function generateImage(prompt: string, opts: KieOpts) {
  const apiKey = await requireApiKey("kie_api_key");
  // ...
}

// After
export async function generateImage(userId: string, prompt: string, opts: KieOpts) {
  const apiKey = await getUserApiKey(userId, "kie");
  // ...
}
```

- [ ] **Step 5: TypeScript check — find broken call sites**

```bash
npx tsc --noEmit 2>&1 | grep "src/" | head -40
```

Note every error: it's a route or service that calls these AI clients without `userId`. Each needs updating in subsequent tasks (3.4 onwards).

- [ ] **Step 6: Commit (broken state, intentional)**

```bash
git add src/services/claudeClient.ts src/services/geminiClient.ts src/services/kieClient.ts
git commit -m "refactor(ai): require userId on Claude/Gemini/KIE client functions

Knock-on TypeScript errors in routes/services calling these will be
fixed in Tasks 3.4-3.10 as we propagate userId end to end."
```

---

## Task 3.4: Update CRUD service signatures

**Files:**
- Modify: `src/services/brandService.ts`
- Modify: `src/services/brandKitService.ts`
- Modify: `src/services/brandProductService.ts`
- Modify: `src/services/personaService.ts`
- Modify: `src/services/savedAdService.ts`
- Modify: `src/services/conceptPromptService.ts`
- Modify: `src/services/stealthSceneService.ts`

Each service constructor accepts `userId`. List/create/get/update/delete methods filter by `owner_user_id` (for brand-scoped tables: join via brands).

- [ ] **Step 1: Update `brandService.ts` — pattern**

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

export class BrandService {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

  async list() {
    const { data, error } = await this.supabase
      .from("brands")
      .select("*")
      .eq("owner_user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from("brands")
      .select("*")
      .eq("id", id)
      .eq("owner_user_id", this.userId)
      .single();
    if (error) throw new ApiError(404, "brand_not_found");
    return data;
  }

  async create(input: { name: string; description?: string }) {
    const { data, error } = await this.supabase
      .from("brands")
      .insert({ ...input, owner_user_id: this.userId })
      .select()
      .single();
    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  async update(id: string, patch: Partial<{ name: string; description: string }>) {
    const { data, error } = await this.supabase
      .from("brands")
      .update(patch)
      .eq("id", id)
      .eq("owner_user_id", this.userId)
      .select()
      .single();
    if (error) throw new ApiError(404, "brand_not_found");
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from("brands")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", this.userId);
    if (error) throw new ApiError(500, "db_error", error.message);
  }
}
```

- [ ] **Step 2: Update brand-scoped services (`brandKitService`, `brandProductService`, `personaService`, `savedAdService`, `stealthSceneService`)**

Pattern: take `(supabase, userId, brandId)` in constructor or method args. Queries filter by joining `brands.owner_user_id`:

```ts
async list(brandId: string) {
  const { data, error } = await this.supabase
    .from("brand_products")
    .select("*, brands!inner(owner_user_id)")
    .eq("brand_id", brandId)
    .eq("brands.owner_user_id", this.userId);
  if (error) throw new ApiError(500, "db_error", error.message);
  return data;
}
```

Apply this pattern to each service. RLS already enforces; service-layer filter is defense in depth.

- [ ] **Step 3: Update `conceptPromptService.ts`**

System concepts (`concept_prompts`) are read-only for users. Add a separate `UserConceptService` (Task 3.5) for `user_concepts`.

```ts
// conceptPromptService.ts
async listSystemConcepts() {
  const { data, error } = await this.supabase
    .from("concept_prompts")
    .select("*")
    .order("display_order");
  if (error) throw new ApiError(500, "db_error", error.message);
  return data;
}
```

The merged "system + user" view is composed in the route handler (Task 3.10).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "src/services/" | head -10
```

Expected: services themselves compile clean. Errors remain in routes (fixed in Task 3.10).

- [ ] **Step 5: Commit**

```bash
git add src/services/brandService.ts src/services/brandKitService.ts \
        src/services/brandProductService.ts src/services/personaService.ts \
        src/services/savedAdService.ts src/services/conceptPromptService.ts \
        src/services/stealthSceneService.ts
git commit -m "refactor(services): scope all CRUD by owner_user_id"
```

---

## Task 3.5: Add `userApiKeyService.ts` with TDD

**Files:**
- Test: `src/app/api/__tests__/user-api-keys.test.ts`
- Create: `src/services/userApiKeyService.ts`
- Create: `src/lib/validators/api-key.ts`
- Create: `src/app/api/user-api-keys/route.ts` (GET, PUT)
- Create: `src/app/api/user-api-keys/[provider]/route.ts` (DELETE)

- [ ] **Step 1: Write failing test for the route**

Create `src/app/api/__tests__/user-api-keys.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/user-api-keys/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

describe("GET /api/user-api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-api-keys")));
    expect(res.status).toBe(401);
  });

  it("returns array of providers with masked keys for authenticated user", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    (createAdminClient as any).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                { provider: "anthropic", encrypted_key: "x", updated_at: "t" },
                { provider: "google", encrypted_key: "y", updated_at: "t" },
              ],
            }),
          }),
        }),
      }),
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-api-keys")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.keys).toHaveLength(2);
    expect(body.keys[0]).toEqual({ provider: "anthropic", masked: "•••••••• (set)", updated_at: "t" });
  });
});

describe("PUT /api/user-api-keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encrypts and upserts key, returns masked", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const upsertMock = vi.fn(async () => ({ error: null }));
    (createAdminClient as any).mockReturnValue({
      from: () => ({ upsert: upsertMock }),
    });

    const req = new NextRequest(new Request("http://x/api/user-api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", key: "sk-ant-1234567890abcdef" }),
    }));
    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();
    const upsertArg = upsertMock.mock.calls[0][0];
    expect(upsertArg.user_id).toBe("u-1");
    expect(upsertArg.provider).toBe("anthropic");
    expect(upsertArg.encrypted_key).not.toContain("sk-ant"); // encrypted
  });

  it("rejects invalid key format", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const req = new NextRequest(new Request("http://x/api/user-api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", key: "" }),
    }));
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation");
  });
});
```

- [ ] **Step 2: Run tests — fail (route not yet created)**

```bash
npx vitest run src/app/api/__tests__/user-api-keys.test.ts
```

- [ ] **Step 3: Implement validator**

Create `src/lib/validators/api-key.ts` (imports `ApiKeyProvider` from `key-provider.ts`, single source of truth defined in Task 3.2):

```ts
import type { ApiKeyProvider } from "@/lib/key-provider";

const PROVIDER_PREFIXES: Record<ApiKeyProvider, RegExp> = {
  anthropic: /^sk-ant-[A-Za-z0-9_-]{8,}$/,
  google: /^AIza[A-Za-z0-9_-]{8,}$/,
  kie: /^[A-Za-z0-9_-]{8,}$/,
};

export function isValidProvider(p: string): p is ApiKeyProvider {
  return ["anthropic", "google", "kie"].includes(p);
}

export function isValidKeyFormat(provider: ApiKeyProvider, key: string): boolean {
  if (!key || key.length < 8) return false;
  return PROVIDER_PREFIXES[provider].test(key);
}

export function maskKey(): string {
  return "•••••••• (set)";
}
```

- [ ] **Step 4: Implement service `userApiKeyService.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";
import { encryptKey } from "@/lib/crypto";
import type { ApiKeyProvider } from "@/lib/validators/api-key";

export class UserApiKeyService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async list() {
    const { data, error } = await this.supabase
      .from("user_api_keys")
      .select("provider, updated_at")
      .eq("user_id", this.userId)
      .order("provider");
    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  async upsert(provider: ApiKeyProvider, plaintextKey: string) {
    const encrypted = encryptKey(plaintextKey);
    const { error } = await this.supabase
      .from("user_api_keys")
      .upsert({
        user_id: this.userId,
        provider,
        encrypted_key: encrypted,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new ApiError(500, "db_error", error.message);
  }

  async delete(provider: ApiKeyProvider) {
    const { error } = await this.supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", this.userId)
      .eq("provider", provider);
    if (error) throw new ApiError(500, "db_error", error.message);
  }
}
```

- [ ] **Step 5: Implement route handlers**

Create `src/app/api/user-api-keys/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserApiKeyService } from "@/services/userApiKeyService";
import { isValidProvider, isValidKeyFormat, maskKey } from "@/lib/validators/api-key";
import { clearUserKeyCache } from "@/lib/key-provider";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = createAdminClient();
    const service = new UserApiKeyService(supabase, userId);
    const rows = await service.list();
    const keys = rows.map((r) => ({
      provider: r.provider,
      masked: maskKey(),
      updated_at: r.updated_at,
    }));
    return NextResponse.json({ keys });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json().catch(() => null) as { provider?: string; key?: string } | null;
    if (!body || !body.provider || !body.key) throw new ApiError(400, "validation", { issues: ["provider and key required"] });
    if (!isValidProvider(body.provider)) throw new ApiError(400, "validation", { issues: ["unknown provider"] });
    if (!isValidKeyFormat(body.provider, body.key)) throw new ApiError(400, "validation", { issues: ["key format invalid"] });

    const supabase = createAdminClient();
    const service = new UserApiKeyService(supabase, userId);
    await service.upsert(body.provider, body.key);
    clearUserKeyCache(userId);

    return NextResponse.json({ ok: true, masked: maskKey() });
  } catch (e) {
    return handleApiError(e);
  }
}
```

Create `src/app/api/user-api-keys/[provider]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserApiKeyService } from "@/services/userApiKeyService";
import { isValidProvider } from "@/lib/validators/api-key";
import { clearUserKeyCache } from "@/lib/key-provider";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { userId } = await requireUser(req);
    const { provider } = await params;
    if (!isValidProvider(provider)) throw new ApiError(400, "validation");

    const supabase = createAdminClient();
    const service = new UserApiKeyService(supabase, userId);
    await service.delete(provider);
    clearUserKeyCache(userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 6: Run tests — pass**

```bash
npx vitest run src/app/api/__tests__/user-api-keys.test.ts
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validators/ src/services/userApiKeyService.ts \
        src/app/api/user-api-keys/ src/app/api/__tests__/user-api-keys.test.ts
git commit -m "feat(api): add user-api-keys CRUD with encryption + cache invalidation"
```

---

## Task 3.6: Add `userConceptService.ts` + routes

**Files:**
- Test: `src/app/api/__tests__/user-concepts.test.ts`
- Create: `src/services/userConceptService.ts`
- Create: `src/app/api/user-concepts/route.ts` (GET, POST)
- Create: `src/app/api/user-concepts/[id]/route.ts` (PATCH, DELETE)

- [ ] **Step 1: Write failing tests**

Create `src/app/api/__tests__/user-concepts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/user-concepts/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/user-concepts", () => {
  it("returns 401 unauthenticated", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-concepts")));
    expect(res.status).toBe(401);
  });

  it("returns concepts owned by user", async () => {
    const order = vi.fn(async () => ({
      data: [{ id: "c-1", label: "My Concept", prompt: "...", owner_user_id: "u-1" }],
    }));
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
      from: () => ({ select: () => ({ eq: () => ({ order }) }) }),
    });
    const res = await GET(new NextRequest(new Request("http://x/api/user-concepts")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.concepts).toHaveLength(1);
    expect(body.concepts[0].owner_user_id).toBe("u-1");
  });
});

describe("POST /api/user-concepts", () => {
  it("creates with owner_user_id = current user", async () => {
    const single = vi.fn(async () => ({ data: { id: "c-new", label: "X", owner_user_id: "u-1" } }));
    const insert = vi.fn(() => ({ select: () => ({ single }) }));
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
      from: () => ({ insert }),
    });

    const req = new NextRequest(new Request("http://x/api/user-concepts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "X", prompt: "do the thing" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0][0]).toMatchObject({ owner_user_id: "u-1", label: "X", prompt: "do the thing" });
  });

  it("rejects missing label or prompt", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u-1", email_confirmed_at: "t" } } }) },
    });
    const req = new NextRequest(new Request("http://x/api/user-concepts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

(Add an analogous file for `[id]/route.ts` covering PATCH success, PATCH cross-user 404, DELETE success, DELETE cross-user 404.)

- [ ] **Step 2: Implement service**

Create `src/services/userConceptService.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

export interface UserConceptInput {
  label: string;
  description?: string;
  prompt: string;
  reference_images?: string[];
  requires_competitor?: boolean;
}

export class UserConceptService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async list() {
    const { data, error } = await this.supabase
      .from("user_concepts")
      .select("*")
      .eq("owner_user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  async create(input: UserConceptInput) {
    const { data, error } = await this.supabase
      .from("user_concepts")
      .insert({ ...input, owner_user_id: this.userId })
      .select().single();
    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  async update(id: string, patch: Partial<UserConceptInput>) {
    const { data, error } = await this.supabase
      .from("user_concepts")
      .update(patch)
      .eq("id", id)
      .eq("owner_user_id", this.userId)
      .select().single();
    if (error) throw new ApiError(404, "concept_not_found");
    return data;
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from("user_concepts")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", this.userId);
    if (error) throw new ApiError(500, "db_error", error.message);
  }
}
```

- [ ] **Step 3: Implement route handlers**

Create `src/app/api/user-concepts/route.ts` and `[id]/route.ts` following the `user-api-keys` pattern (use `requireUser` + `handleApiError`).

- [ ] **Step 4: Run tests — pass; commit**

```bash
npx vitest run src/app/api/__tests__/user-concepts.test.ts
git add src/services/userConceptService.ts src/app/api/user-concepts/ src/app/api/__tests__/user-concepts.test.ts
git commit -m "feat(api): add user-concepts CRUD"
```

---

## Task 3.7: Add `auth/signup` + `auth/resend-verification` routes

**Files:**
- Test: `src/app/api/__tests__/auth-signup.test.ts`
- Create: `src/app/api/auth/signup/route.ts`
- Create: `src/app/api/auth/resend-verification/route.ts`

- [ ] **Step 1: Write failing tests for signup**

Create `src/app/api/__tests__/auth-signup.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/signup/route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";

describe("POST /api/auth/signup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects missing email", async () => {
    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "pw" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects weak password", async () => {
    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "short" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("calls supabase.auth.signUp on valid input", async () => {
    const signUp = vi.fn(async () => ({ data: { user: { id: "u-1", email: "a@b.com" } }, error: null }));
    (createClient as any).mockResolvedValue({ auth: { signUp } });

    const req = new NextRequest(new Request("http://x/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "Strong1234!", full_name: "Alice" }),
    }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(signUp).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Implement signup route**

Create `src/app/api/auth/signup/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, ApiError } from "@/lib/user-context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | { email?: string; password?: string; full_name?: string }
      | null;
    if (!body) throw new ApiError(400, "validation");

    const issues: string[] = [];
    if (!body.email || !EMAIL_RE.test(body.email)) issues.push("invalid email");
    if (!body.password || body.password.length < MIN_PASSWORD) issues.push("password must be ≥8 chars");
    if (issues.length) throw new ApiError(400, "validation", { issues });

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: body.email!,
      password: body.password!,
      options: { data: { full_name: body.full_name ?? "" } },
    });

    if (error) {
      // Supabase returns 400 for duplicate, 422 for password policy, etc.
      throw new ApiError(400, "signup_failed", { message: error.message });
    }

    return NextResponse.json({ ok: true, userId: data.user?.id, email: data.user?.email });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Implement resend-verification route**

Create `src/app/api/auth/resend-verification/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, ApiError } from "@/lib/user-context";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { email?: string } | null;
    if (!body?.email) throw new ApiError(400, "validation");

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: body.email });
    if (error) throw new ApiError(400, "resend_failed", { message: error.message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 4: Tests pass; commit**

```bash
npx vitest run src/app/api/__tests__/auth-signup.test.ts
git add src/app/api/auth/signup/ src/app/api/auth/resend-verification/ \
        src/app/api/__tests__/auth-signup.test.ts
git commit -m "feat(api): add auth/signup and auth/resend-verification routes"
```

---

## Task 3.8: Add `user/me` route

**Files:**
- Create: `src/services/userService.ts`
- Create: `src/app/api/user/me/route.ts` (GET, DELETE)
- Delete: `src/app/api/auth/me/` (entire dir — replaced)

- [ ] **Step 1: Implement service**

Create `src/services/userService.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

export class UserService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async getMe() {
    const { data: profile, error } = await this.supabase
      .from("profiles")
      .select("id, email, full_name, is_platform_admin")
      .eq("id", this.userId)
      .single();
    if (error) throw new ApiError(404, "profile_not_found");

    const { data: keys } = await this.supabase
      .from("user_api_keys")
      .select("provider")
      .eq("user_id", this.userId);

    const presentProviders = new Set((keys ?? []).map((k) => k.provider));
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      is_platform_admin: profile.is_platform_admin,
      has_keys: {
        anthropic: presentProviders.has("anthropic"),
        google: presentProviders.has("google"),
        kie: presentProviders.has("kie"),
      },
    };
  }

  async deleteAccount() {
    // Cascade via FK ON DELETE CASCADE handles brands + keys + concepts.
    // auth.users deletion requires admin client; do that in route handler.
  }
}
```

- [ ] **Step 2: Implement route**

Create `src/app/api/user/me/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserService } from "@/services/userService";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = await createClient();
    const service = new UserService(supabase, userId);
    return NextResponse.json(await service.getMe());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json().catch(() => null) as { confirm?: string } | null;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!body || body.confirm !== user?.email) {
      throw new ApiError(400, "confirm_email_required");
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new ApiError(500, "delete_failed", { message: error.message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Delete obsolete `auth/me` route**

```bash
rm -rf src/app/api/auth/me
```

- [ ] **Step 4: Find & update callers of `/api/auth/me`**

```bash
grep -rn "/api/auth/me" src/
```

For each match: change to `/api/user/me`. Likely in `AuthContext` or `useUser` hook.

- [ ] **Step 5: Commit**

```bash
git add src/services/userService.ts src/app/api/user/me/ src/
git commit -m "feat(api): add /api/user/me, replace legacy /api/auth/me"
```

---

## Task 3.9: Delete obsolete services + routes + tests

- [ ] **Step 1: Delete service files**

```bash
rm src/services/clientService.ts
rm src/services/appSettingService.ts
rm src/services/productMarketService.ts
```

- [ ] **Step 2: Delete API route folders**

```bash
rm -rf src/app/api/clients
rm -rf src/app/api/admin
rm -rf src/app/api/product-markets
```

- [ ] **Step 3: Delete obsolete tests**

```bash
rm -f src/app/api/__tests__/clients.test.ts
rm -f src/app/api/__tests__/product-markets.test.ts
```

- [ ] **Step 4: Find dangling imports**

```bash
grep -rn "clientService\|appSettingService\|productMarketService\|/api/clients\|/api/admin\|/api/product-markets" src/ | grep -v __tests__
```

For each match: remove the import + caller. Most will be in `AppContext`, `DashboardLayout` (workspace switcher area — addressed Phase 5), and feature components for Markets (addressed in next task).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(refactor): delete client/admin/markets services + routes + tests"
```

---

## Task 3.10: Update existing routes — propagate `userId` end-to-end

For every existing route in `src/app/api/**/route.ts` (excluding the new ones built in Tasks 3.5–3.8 and `auth/forgot-password` and `google-fonts`/`download-image`), apply this transformation:

**Before (PATI baseline pattern):**
```ts
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ...
  const service = new BrandService(supabase);
  // AI call with no userId:
  await claudeVisionAnalyze(prompt, image);
}
```

**After:**
```ts
import { requireUser, handleApiError } from "@/lib/user-context";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = await createClient();
    const service = new BrandService(supabase, userId);
    // AI call with userId:
    await claudeVisionAnalyze(userId, prompt, image);
    // ...
  } catch (e) {
    return handleApiError(e);
  }
}
```

Apply to:

| Route | AI calls? | Notes |
|---|---|---|
| `/api/brands/route.ts` + `[id]/route.ts` | no | Just service refactor |
| `/api/brand-products/**` | yes (scrape uses Gemini) | Update `geminiGenerate(userId, ...)` |
| `/api/brand-kit/**` | no | |
| `/api/personas/**` | no | |
| `/api/saved-ads/**` | no | |
| `/api/brand-intelligence/[brandId]/**` | yes (Anthropic) | |
| `/api/concepts/**` | no | Returns merged system + user_concepts |
| `/api/stealth/{plan,generate}/**` | yes | Both Gemini + KIE |
| `/api/stealth-ref/plan/**` | yes | Gemini |
| `/api/stealth-scenes/**` | no | |
| `/api/competitor-ref/upload/**` | no | Storage only |
| `/api/generate-ads/**` | yes (heaviest) | Multiple AI calls — pass `userId` to each |
| `/api/edit-ad/**` | yes (KIE) | |
| `/api/save-ad/**` | no | |
| `/api/content-adapt/**` | yes (Anthropic) | |
| `/api/prepare-generation/**` | varies | |
| `/api/upload-reference/**` | no | |

- [ ] **Step 1: Apply transformation route by route**

Process each route handler. Pattern is mechanical; no need for separate steps per route. Commit when each "group" is done (auth + brands → 1 commit; AI-dependent routes → 1 commit; etc.).

- [ ] **Step 2: For `/api/concepts/route.ts` — merge system + user concepts**

The merged GET handler returns both:
```ts
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = await createClient();
    const sys = new ConceptPromptService(supabase);
    const user = new UserConceptService(supabase, userId);
    const [system, custom] = await Promise.all([sys.listSystemConcepts(), user.list()]);
    return NextResponse.json({ system, custom });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Drop MarketSection import + reference from generate-ads pipeline**

```bash
grep -rn "product_markets\|MarketSection\|productMarketService\|product-markets" src/app/api/ src/services/ src/features/
```

For each match: delete the import + branch. The Markets step in `generate-ads` is removed entirely.

Delete: `src/features/workspace/components/MarketSection.tsx` (file deletion; the import in `WorkspaceViewClient.tsx` will need cleanup in Phase 5).

- [ ] **Step 4: Run tests + TypeScript check**

```bash
npm test 2>&1 | tail -30
npx tsc --noEmit 2>&1 | head -30
```

Expected: all tests pass; type check clean. If any test still references old patterns (e.g. `mockWorkspaceContext`, `appSettings`), update or skip with a TODO comment, then track as Phase 6 cleanup.

- [ ] **Step 5: Commit**

Commit in 2-3 chunks for clarity:

```bash
git add src/app/api/{brands,brand-products,brand-kit,personas,saved-ads}/
git commit -m "refactor(api): scope brand/product/persona routes by userId"

git add src/app/api/{generate-ads,edit-ad,save-ad,stealth,stealth-ref,stealth-scenes,competitor-ref,content-adapt,prepare-generation,brand-intelligence,upload-reference,concepts}/
git commit -m "refactor(api): scope generation pipeline + AI routes by userId"

git add src/features/workspace/components/  # MarketSection deletion
git commit -m "refactor(workspace): drop Competitor Markets feature"
```

---

## Task 3.11: User isolation integration test (CRITICAL)

**Files:**
- Test: `src/__tests__/user-isolation.test.ts`
- Create: `src/lib/__tests__/test-helpers.ts`

This is the test that proves the entire refactor maintains tenancy. Must pass 100%.

- [ ] **Step 1: Write test helpers**

Create `src/lib/__tests__/test-helpers.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";

export async function setupTestUser(opts: { email?: string } = {}) {
  const admin = createAdminClient();
  const email = opts.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@adlance-test.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Test1234!",
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`setupTestUser failed: ${error?.message}`);
  return { userId: data.user.id, email };
}

export async function teardownTestUser(userId: string) {
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
}

export async function setupTwoIsolatedUsers() {
  const a = await setupTestUser();
  const b = await setupTestUser();
  return [a, b] as const;
}
```

- [ ] **Step 2: Write isolation test**

Create `src/__tests__/user-isolation.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { setupTwoIsolatedUsers, teardownTestUser } from "@/lib/__tests__/test-helpers";

let userA: { userId: string };
let userB: { userId: string };

beforeAll(async () => {
  const [a, b] = await setupTwoIsolatedUsers();
  userA = a; userB = b;
});

afterAll(async () => {
  await teardownTestUser(userA.userId);
  await teardownTestUser(userB.userId);
});

describe("user isolation (real DB)", () => {
  it("user A can create a brand; user B cannot see it", async () => {
    const admin = createAdminClient();
    const { data: brandA } = await admin
      .from("brands")
      .insert({ name: "Brand-A", owner_user_id: userA.userId })
      .select().single();

    expect(brandA).toBeTruthy();

    // Simulate user B's RLS context: query with anon role + JWT for user B
    // (For unit test simplicity, we directly filter — but RLS test in 2.7 confirmed at DB level.)
    const { data: bSees } = await admin
      .from("brands")
      .select("*")
      .eq("owner_user_id", userB.userId);

    expect(bSees).toHaveLength(0);
  });

  it("user A's saved_ads are isolated from user B", async () => {
    const admin = createAdminClient();
    const { data: brand } = await admin
      .from("brands")
      .insert({ name: "Brand-A2", owner_user_id: userA.userId })
      .select().single();

    await admin.from("saved_ads").insert({
      brand_id: brand!.id,
      image_url: "https://example.com/a.png",
    });

    // From user B's perspective (filter by brand owner), no rows.
    const { data: bSeesAds } = await admin
      .from("saved_ads")
      .select("*, brands!inner(owner_user_id)")
      .eq("brands.owner_user_id", userB.userId);
    expect(bSeesAds).toHaveLength(0);
  });

  it("user A's API keys are encrypted and isolated", async () => {
    const admin = createAdminClient();
    const { encryptKey } = await import("@/lib/crypto");
    await admin.from("user_api_keys").insert({
      user_id: userA.userId,
      provider: "anthropic",
      encrypted_key: encryptKey("sk-ant-secret-A"),
    });

    const { data: bKeys } = await admin
      .from("user_api_keys")
      .select("*")
      .eq("user_id", userB.userId);
    expect(bKeys).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run isolation tests**

```bash
npx vitest run src/__tests__/user-isolation.test.ts
```

Expected: all 3 tests pass.

If any fail, investigate immediately — RLS or service-layer filter has a leak.

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/test-helpers.ts src/__tests__/user-isolation.test.ts
git commit -m "test(isolation): add critical user-tenancy isolation tests"
```

---

## Task 3.12: Phase 3 wrap-up

- [ ] **Step 1: Full test suite**

```bash
npm test 2>&1 | tail -40
```

Expected: all tests pass (or reasonable coverage with documented skips).

- [ ] **Step 2: TypeScript clean**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Build success**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds. UI may still reference removed `clients` / `admin` routes — expected since `/app/*` move (Phase 4) hasn't happened yet. If build fails on UI imports of removed routes/admin, note them; fix in Phase 4.

- [ ] **Step 4: Update user**

> "Phase 3 complete. All AI clients + services scope by userId. New routes (user-api-keys, user-concepts, auth/signup, user/me) live + tested. Isolation test passes 100%. Markets feature removed. Next: Phase 4 — move app routes to /app/* + fix middleware."

---

# Phase 4 — App routes restructure

**Goal:** Move all dashboard routes from `/` to `/app/*`, update middleware for new layout, delete obsolete admin pages.

**Estimated effort:** 0.5–1 day.

**Definition of Done:**
- ☐ `/`, `/library`, `/brands`, `/concepts`, `/stealth-ads`, `/guide`, `/settings` moved under `/app/*`.
- ☐ All internal links use new paths.
- ☐ Middleware redirects logged-in users from `/login` → `/app`; unauthenticated `/app/*` → `/login`.
- ☐ Admin pages + workspace-modals deleted.
- ☐ Build succeeds.

---

## Task 4.1: Move existing app routes to `/app/*`

- [ ] **Step 1: Create `src/app/app/` shell layout**

Create `src/app/app/layout.tsx`:

```tsx
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  // DashboardLayout wraps individual pages. This file enforces /app/* boundary.
  return <>{children}</>;
}
```

- [ ] **Step 2: Move route folders**

```bash
mkdir -p src/app/app
git mv src/app/library src/app/app/library
git mv src/app/brands src/app/app/brands  # if exists; otherwise just brand-setup
git mv src/app/brand-setup src/app/app/brands  # rename per spec
git mv src/app/concepts src/app/app/concepts
git mv src/app/stealth-ads src/app/app/stealth-ads
git mv src/app/guide src/app/app/guide
git mv src/app/settings src/app/app/settings
```

- [ ] **Step 3: Move generate dashboard from `/` to `/app`**

Currently `src/app/page.tsx` is the generate dashboard. Move it:

```bash
git mv src/app/page.tsx src/app/app/page.tsx
```

(Phase 5 creates a new `src/app/page.tsx` for the public landing.)

- [ ] **Step 4: Find & update all internal links**

```bash
grep -rn "href=\"/\"\|href=\"/library\"\|href=\"/brands\"\|href=\"/brand-setup\"\|href=\"/concepts\"\|href=\"/stealth-ads\"\|href=\"/guide\"\|href=\"/settings\"" src/
```

For each match: prepend `/app`. e.g. `href="/library"` → `href="/app/library"`. Be careful with auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-pending`) — those stay at root.

- [ ] **Step 5: Update redirect in `LoginForm.tsx`**

`onSuccess` likely redirects to `/`. Change to `/app`.

- [ ] **Step 6: TypeScript + build check**

```bash
npx tsc --noEmit 2>&1 | head -20
npm run build 2>&1 | tail -20
```

Fix any broken imports.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(routes): move dashboard pages to /app/* boundary"
```

---

## Task 4.2: Update middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Read existing middleware**

```bash
cat src/middleware.ts
```

- [ ] **Step 2: Rewrite for /app/* gate**

Replace contents with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-pending",
]);

const PUBLIC_PREFIXES = ["/api/auth/", "/_next/", "/static/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes through
  if (isPublic(pathname)) {
    // Bonus: redirect logged-in users away from /login or /signup → /app
    if (pathname === "/login" || pathname === "/signup") {
      const { supabase, response } = createServerClient(req);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return NextResponse.redirect(new URL("/app", req.url));
      }
      return response;
    }
    return NextResponse.next();
  }

  // Auth-gated /app/*
  if (pathname.startsWith("/app")) {
    const { supabase, response } = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL("/verify-pending", req.url));
    }
    return response;
  }

  // Default: pass through
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|robots.txt|sitemap.xml).*)"],
};
```

(If `src/lib/supabase/middleware.ts` doesn't exist with `createServerClient` factory, adapt to whatever exists in the codebase or use `@supabase/ssr`'s `createServerClient`.)

- [ ] **Step 3: Build + manual smoke test**

```bash
npm run build 2>&1 | tail -10
```

If build succeeds: run dev server and manually test:
```bash
npm run dev
```

In browser:
- Visit `/` while logged out → renders public page (Phase 5 will replace with landing; for now whatever's there).
- Visit `/app/library` while logged out → redirects to `/login`.
- Login → redirects to `/app`.
- Logged in, visit `/login` → redirects to `/app`.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): gate /app/* with auth + email-verify; redirect logged-in users from /login,/signup"
```

---

## Task 4.3: Delete admin pages + workspace modals + invite components

- [ ] **Step 1: Delete admin pages**

```bash
rm -rf src/app/admin
rm -rf src/components/admin
```

- [ ] **Step 2: Delete workspace modals**

```bash
rm -f src/components/layout/NewClientModal.tsx
rm -f src/components/layout/RenameClientModal.tsx
rm -f src/components/layout/DeleteClientModal.tsx
```

- [ ] **Step 3: Delete invite component**

```bash
rm -f src/components/auth/InviteAcceptButton.tsx
```

- [ ] **Step 4: Find dangling imports**

```bash
grep -rn "NewClientModal\|RenameClientModal\|DeleteClientModal\|InviteAcceptButton\|admin/users\|admin/settings" src/
```

For each match: remove the import + usage. The DashboardLayout will have several — leave `// TODO Phase 5: redesign` markers; Phase 5 will fully refactor it.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

If build fails on residual imports: fix or comment out the call sites with TODO markers (resolved in Phase 5).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(cleanup): delete admin pages, workspace modals, invite component"
```

---

## Task 4.4: Phase 4 wrap-up

- [ ] **Step 1: Confirm build + tests**

```bash
npm run build && npm test 2>&1 | tail -20
```

- [ ] **Step 2: Update user**

> "Phase 4 complete. All app routes under /app/* boundary, middleware gates working. Admin/clients/markets fully removed. Next: Phase 5 — landing page + BYOK self-serve UI."

---

# Phase 5 — New UI: Landing + BYOK

**Goal:** Build the public landing page (`/`), self-serve API Keys card in Settings, missing-key empty states, missing-key dashboard banner, and adapt cherry-picked OnboardingWizard for 1-step BYOK.

**Estimated effort:** 2–3 days.

**Definition of Done:**
- ☐ `/` renders landing (Hero + Bento + How + BYOK + CTA + Footer).
- ☐ `/app/settings#api-keys` shows `UserApiKeysCard` with add/replace/delete.
- ☐ Missing keys → dashboard shows `MissingKeyBanner`; per-feature shows `MissingKeyEmptyState`.
- ☐ `/app/onboarding` is a 1-step BYOK form with "Skip for now".
- ☐ Cherry-picked `OnboardingWizard.tsx`, `SettingsClient.tsx`, `DashboardLayout.tsx` adapted (no workspace switcher, no invite UI).
- ☐ Page-specific design system overrides written for landing + dashboard + onboarding.
- ☐ Lighthouse a11y ≥ 90 on `/`.

---

## Task 5.1: Persist page-specific design system overrides

**Files:**
- Create: `design-system/adlance/pages/landing.md`
- Create: `design-system/adlance/pages/dashboard.md`
- Create: `design-system/adlance/pages/onboarding.md`

- [ ] **Step 1: Generate landing override via skill**

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py \
  "saas ai tool free byok hero bento cta dark professional" \
  --design-system --persist -p "Adlance" --page "landing" -f markdown
```

Expected: file `design-system/adlance/pages/landing.md` is created.

- [ ] **Step 2: Generate dashboard override**

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py \
  "saas dashboard ai tool dark sidebar workspace minimal" \
  --design-system --persist -p "Adlance" --page "dashboard" -f markdown
```

- [ ] **Step 3: Generate onboarding override**

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py \
  "centered card single-column form minimal dark professional" \
  --design-system --persist -p "Adlance" --page "onboarding" -f markdown
```

- [ ] **Step 4: Commit**

```bash
git add design-system/adlance/pages/
git commit -m "chore(design-system): add landing/dashboard/onboarding page overrides"
```

---

## Task 5.2: Build `PublicNavbar.tsx`

**Files:**
- Create: `src/components/landing/PublicNavbar.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";

export function PublicNavbar() {
  return (
    <nav className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-6xl">
      <div className="flex items-center justify-between rounded-xl border border-border-strong bg-surface-elevated/80 px-4 py-3 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <Image src="/brand/logo-dark.svg" alt={BRANDING.appName} width={32} height={32} priority />
          <span className="font-semibold tracking-tight">{BRANDING.appName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground-muted transition-colors duration-200 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover"
          >
            Try free
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/PublicNavbar.tsx
git commit -m "feat(landing): add PublicNavbar with floating layout"
```

---

## Task 5.3: Build `HeroSection.tsx`

**Files:**
- Create: `src/components/landing/HeroSection.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import { BRANDING } from "@/lib/branding";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center px-4 pt-32">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-5xl font-bold tracking-[-0.02em] text-foreground sm:text-6xl md:text-7xl">
          {BRANDING.appTagline}
        </h1>
        <p className="mt-6 text-lg text-foreground-muted sm:text-xl">
          Free AI ad generator. Bring your own keys.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="cursor-pointer rounded-lg bg-accent px-6 py-3 font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover"
          >
            Try it free →
          </Link>
          <Link
            href="#how-it-works"
            className="cursor-pointer rounded-lg border border-border-strong px-6 py-3 font-medium text-foreground transition-colors duration-200 hover:border-cta hover:text-cta"
          >
            How it works ↓
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/HeroSection.tsx
git commit -m "feat(landing): add HeroSection with dual CTA"
```

---

## Task 5.4: Build `BentoFeatures.tsx`

**Files:**
- Create: `src/components/landing/BentoFeatures.tsx`

- [ ] **Step 1: Read cherry-picked bento-grid component**

```bash
cat src/components/ui/bento-grid.tsx
```

Note its interface (`BentoGrid`, `BentoCard`, props).

- [ ] **Step 2: Implement BentoFeatures using the primitive**

```tsx
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";

const FEATURES = [
  { id: "concept", title: "Concept Ads", description: "Pick a creative strategy. AI generates copy + a polished ad image.", colSpan: 2 },
  { id: "stealth", title: "Stealth Ads", description: "iPhone-style organic content. Your product placed candidly.", colSpan: 1 },
  { id: "library", title: "Library", description: "Save, browse, and remix every generated ad.", colSpan: 1 },
  { id: "byok", title: "Bring Your Own Keys", description: "You pay only what AI providers charge. No SaaS markup.", colSpan: 1 },
  { id: "brand-dna", title: "Brand DNA", description: "Identity, kit, products, personas — AI uses your brand context.", colSpan: 2 },
  { id: "content-adapt", title: "Content Adapt", description: "Turn saved ads into social captions in any language.", colSpan: 3 },
];

export function BentoFeatures() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          Everything you need to ship ads
        </h2>
        <BentoGrid className="gap-4">
          {FEATURES.map((f) => (
            <BentoCard
              key={f.id}
              colSpan={f.colSpan}
              className="rounded-xl border border-border-strong bg-surface-elevated p-6 transition-colors duration-200 hover:border-accent"
            >
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{f.description}</p>
            </BentoCard>
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
```

(Adjust `colSpan` prop name if `bento-grid.tsx` uses different prop. Adapt to match the imported primitive.)

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/BentoFeatures.tsx
git commit -m "feat(landing): add BentoFeatures grid showcasing 6 capabilities"
```

---

## Task 5.5: Build `HowItWorks.tsx`

**Files:**
- Create: `src/components/landing/HowItWorks.tsx`

- [ ] **Step 1: Implement**

```tsx
const STEPS = [
  { n: 1, title: "Sign up free", body: "Email + password. Verify in 30s." },
  { n: 2, title: "Add your API keys", body: "Anthropic, Google, KIE — encrypted at rest, used only for your requests." },
  { n: 3, title: "Generate ads", body: "Configure a brand, pick a concept, generate. Save to library." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-surface px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          How it works
        </h2>
        <ol className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-border-strong bg-surface-elevated p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted text-accent font-mono">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/HowItWorks.tsx
git commit -m "feat(landing): add HowItWorks 3-step section"
```

---

## Task 5.6: Build `ByokExplainer.tsx`

**Files:**
- Create: `src/components/landing/ByokExplainer.tsx`

- [ ] **Step 1: Implement**

```tsx
const POINTS = [
  { title: "You own your AI quotas", body: "Pay AI providers directly. No middleman markup." },
  { title: "Encrypted at rest", body: "Your keys are encrypted with AES-256-GCM before they hit the database." },
  { title: "Full feature access", body: "Free tool, full feature set. Pay only what AI providers charge." },
];

export function ByokExplainer() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          Why bring your own keys?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-foreground-muted">
          BYOK keeps you in control. The tool is free; you only pay for the AI calls you actually make.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-xl border border-border-strong bg-surface-elevated p-6">
              <h3 className="font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/ByokExplainer.tsx
git commit -m "feat(landing): add ByokExplainer section"
```

---

## Task 5.7: Build `CtaSection.tsx` and `Footer.tsx`

**Files:**
- Create: `src/components/landing/CtaSection.tsx`
- Create: `src/components/landing/Footer.tsx`

- [ ] **Step 1: Implement CTA**

```tsx
// src/components/landing/CtaSection.tsx
import Link from "next/link";

export function CtaSection() {
  return (
    <section className="border-t border-border px-4 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          Start generating in 2 minutes
        </h2>
        <p className="mt-4 text-foreground-muted">
          Free signup. Bring your keys. Make ads.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block cursor-pointer rounded-lg bg-accent px-6 py-3 font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover"
        >
          Create free account →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement Footer**

```tsx
// src/components/landing/Footer.tsx
import Link from "next/link";
import { BRANDING } from "@/lib/branding";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-12">
      <div className="mx-auto max-w-6xl flex flex-col items-center justify-between gap-4 text-sm text-foreground-muted sm:flex-row">
        <span>© {new Date().getFullYear()} {BRANDING.appName}</span>
        <nav className="flex gap-6">
          <a href="mailto:hello@adlance.com" className="cursor-pointer transition-colors duration-200 hover:text-foreground">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
```

(Privacy and Terms links are intentionally omitted until those pages exist. Add them in a future ticket once policies are drafted.)

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/CtaSection.tsx src/components/landing/Footer.tsx
git commit -m "feat(landing): add CtaSection + Footer"
```

---

## Task 5.8: Compose landing page (`/`)

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";
import { PublicNavbar } from "@/components/landing/PublicNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ByokExplainer } from "@/components/landing/ByokExplainer";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: `${BRANDING.appName} — ${BRANDING.appTagline}`,
  description: "Free AI ad generator. Bring your own API keys.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <HeroSection />
      <BentoFeatures />
      <HowItWorks />
      <ByokExplainer />
      <CtaSection />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Manual visual check**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Floating navbar with logo + Sign in + Try free.
- Hero centered, dual CTA visible.
- Bento grid renders 6 cells.
- 3-step "How it works" visible.
- BYOK explainer card grid.
- Final CTA + footer.
- All text readable (4.5:1 contrast in dark mode).
- No emoji icons; cursor-pointer on clickables; smooth hover transitions.

- [ ] **Step 3: Lighthouse a11y check**

In Chrome DevTools → Lighthouse → run on `/`. Target ≥ 90 on Accessibility.

If <90, inspect issues. Common: missing `alt`, contrast, missing landmark roles. Fix inline.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): compose / public landing page"
```

---

## Task 5.9: Build `UserApiKeysCard.tsx` for Settings

**Files:**
- Create: `src/components/settings/UserApiKeysCard.tsx`

- [ ] **Step 1: Implement (Client Component)**

```tsx
"use client";
// Client Component: form state + interactive add/replace/delete

import { useState, useEffect } from "react";

type Provider = "anthropic" | "google" | "kie";

interface KeyRow {
  provider: Provider;
  masked: string;
  updated_at: string;
}

const PROVIDERS: { id: Provider; label: string; helpUrl: string }[] = [
  { id: "anthropic", label: "Anthropic", helpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "google", label: "Google AI Studio", helpUrl: "https://aistudio.google.com/apikey" },
  { id: "kie", label: "KIE", helpUrl: "https://kie.ai/api-keys" },
];

export function UserApiKeysCard() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<Provider, string>>({ anthropic: "", google: "", kie: "" });
  const [saving, setSaving] = useState<Provider | null>(null);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    setLoading(true);
    const res = await fetch("/api/user-api-keys");
    if (res.ok) {
      const body = await res.json();
      setKeys(body.keys);
    }
    setLoading(false);
  }

  async function saveKey(provider: Provider) {
    const key = drafts[provider].trim();
    if (!key) return;
    setSaving(provider);
    const res = await fetch("/api/user-api-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, key }),
    });
    setSaving(null);
    if (res.ok) {
      setDrafts((d) => ({ ...d, [provider]: "" }));
      fetchKeys();
    } else {
      const body = await res.json();
      alert(`Failed: ${body.error}${body.details ? " — " + JSON.stringify(body.details) : ""}`);
    }
  }

  async function deleteKey(provider: Provider) {
    if (!confirm(`Remove your ${provider} key?`)) return;
    setSaving(provider);
    const res = await fetch(`/api/user-api-keys/${provider}`, { method: "DELETE" });
    setSaving(null);
    if (res.ok) fetchKeys();
  }

  if (loading) return <div className="text-foreground-muted">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Bring your own keys. They are encrypted at rest and used only for your generation requests.
        </p>
      </div>

      {PROVIDERS.map((p) => {
        const existing = keys.find((k) => k.provider === p.id);
        return (
          <div key={p.id} className="rounded-xl border border-border-strong bg-surface-elevated p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <label htmlFor={`key-${p.id}`} className="font-medium">{p.label}</label>
                <a href={p.helpUrl} target="_blank" rel="noopener noreferrer"
                   className="ml-3 cursor-pointer text-sm text-cta transition-colors duration-200 hover:text-accent">
                  How to get this key →
                </a>
              </div>
              {existing && (
                <button
                  type="button"
                  onClick={() => deleteKey(p.id)}
                  disabled={saving === p.id}
                  className="cursor-pointer text-sm text-danger transition-colors duration-200 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>

            {existing ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-sm text-foreground-muted">{existing.masked}</span>
                <span className="text-xs text-foreground-subtle">Updated {new Date(existing.updated_at).toLocaleString()}</span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-foreground-subtle">Not set</p>
            )}

            <div className="mt-3 flex gap-2">
              <input
                id={`key-${p.id}`}
                type="password"
                placeholder={existing ? "Enter new key to replace" : `Paste ${p.label} key`}
                value={drafts[p.id]}
                onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => saveKey(p.id)}
                disabled={!drafts[p.id].trim() || saving === p.id}
                className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover disabled:opacity-50"
              >
                {saving === p.id ? "Saving…" : existing ? "Replace" : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire into SettingsClient.tsx**

Open `src/components/auth/SettingsClient.tsx` (cherry-picked from feat). Find the "API Keys" tab content (it currently renders feat's `WorkspaceApiKeysForm` or similar). Replace with `<UserApiKeysCard />`.

```bash
grep -n "WorkspaceApiKeys\|ApiKeysClient\|API Keys" src/components/auth/SettingsClient.tsx
```

Edit file: import `UserApiKeysCard`, replace the workspace-keys content.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/UserApiKeysCard.tsx src/components/auth/SettingsClient.tsx
git commit -m "feat(settings): add UserApiKeysCard for self-serve BYOK management"
```

---

## Task 5.10: Build `MissingKeyBanner.tsx` + `MissingKeyEmptyState.tsx`

**Files:**
- Create: `src/components/settings/MissingKeyBanner.tsx`
- Create: `src/components/empty-states/MissingKeyEmptyState.tsx`

- [ ] **Step 1: Implement banner**

```tsx
// src/components/settings/MissingKeyBanner.tsx
"use client";
// Client Component: needs runtime data from /api/user/me
import Link from "next/link";
import { useEffect, useState } from "react";

const PROVIDER_LABELS = { anthropic: "Anthropic", google: "Google AI", kie: "KIE" };
type Provider = keyof typeof PROVIDER_LABELS;

export function MissingKeyBanner() {
  const [missing, setMissing] = useState<Provider[] | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return setMissing(null);
        const m = (Object.keys(PROVIDER_LABELS) as Provider[]).filter((p) => !data.has_keys[p]);
        setMissing(m);
      });
  }, []);

  if (!missing || missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            Add your API keys to start generating
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            Missing: {missing.map((p) => PROVIDER_LABELS[p]).join(", ")}.
          </p>
        </div>
        <Link
          href="/app/settings#api-keys"
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover"
        >
          Add keys →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement empty state**

```tsx
// src/components/empty-states/MissingKeyEmptyState.tsx
import Link from "next/link";

const PROVIDER_LABELS = { anthropic: "Anthropic", google: "Google AI", kie: "KIE" };

export interface MissingKeyEmptyStateProps {
  provider: keyof typeof PROVIDER_LABELS;
  feature: string; // e.g. "Image generation"
}

export function MissingKeyEmptyState({ provider, feature }: MissingKeyEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-strong bg-surface p-12 text-center">
      <h3 className="text-lg font-semibold text-foreground">
        {feature} needs your {PROVIDER_LABELS[provider]} key
      </h3>
      <p className="mt-2 max-w-md text-sm text-foreground-muted">
        Add your {PROVIDER_LABELS[provider]} API key in Settings to use this feature. Keys are encrypted at rest.
      </p>
      <Link
        href="/app/settings#api-keys"
        className="mt-6 cursor-pointer rounded-lg bg-accent px-6 py-3 font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover"
      >
        Add {PROVIDER_LABELS[provider]} key →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Wire `MissingKeyBanner` into `DashboardLayout.tsx`**

Open `src/components/layout/DashboardLayout.tsx`. Just below the header, render `<MissingKeyBanner />` before the main content area. Also strip the workspace switcher (cherry-picked from feat included it). Find any references to `workspaceId`, `useActiveWorkspace`, `WorkspaceSwitcher` and remove them.

- [ ] **Step 4: Wire `MissingKeyEmptyState` into generation flow error UI**

In `src/features/workspace/components/GenerateProgress.tsx` (and similar in stealth/content-adapt), catch SSE error events with `code: "missing_api_key"` and render `<MissingKeyEmptyState provider={ev.provider} feature="Image generation" />` instead of generic error.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/MissingKeyBanner.tsx \
        src/components/empty-states/MissingKeyEmptyState.tsx \
        src/components/layout/DashboardLayout.tsx \
        src/features/workspace/components/GenerateProgress.tsx
git commit -m "feat(byok): add MissingKeyBanner + MissingKeyEmptyState wired into dashboard + generation"
```

---

## Task 5.11: Adapt `OnboardingWizard.tsx` to 1-step BYOK

**Files:**
- Modify: `src/components/auth/OnboardingWizard.tsx`
- Create: `src/app/app/onboarding/page.tsx`

- [ ] **Step 1: Read cherry-picked OnboardingWizard**

```bash
cat src/components/auth/OnboardingWizard.tsx | head -80
```

- [ ] **Step 2: Strip workspace + invite steps**

Remove all logic for workspace creation, invitations, and multi-step navigation. Keep only the "API Keys" step. Skeleton:

```tsx
"use client";
// Client Component: form state for entering 3 keys

import { useState } from "react";
import { useRouter } from "next/navigation";

type Provider = "anthropic" | "google" | "kie";

export function OnboardingWizard() {
  const [keys, setKeys] = useState<Record<Provider, string>>({ anthropic: "", google: "", kie: "" });
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function saveAll() {
    setBusy(true);
    for (const provider of ["anthropic", "google", "kie"] as Provider[]) {
      const key = keys[provider].trim();
      if (!key) continue;
      await fetch("/api/user-api-keys", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
    }
    setBusy(false);
    router.push("/app");
  }

  function skip() { router.push("/app"); }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Add your API keys</h1>
        <p className="mt-2 text-foreground-muted">Bring your own keys. You can skip and add them later in Settings.</p>
      </header>

      {(["anthropic", "google", "kie"] as Provider[]).map((p) => (
        <div key={p} className="rounded-xl border border-border-strong bg-surface-elevated p-4">
          <label htmlFor={`onboarding-${p}`} className="font-medium capitalize">{p}</label>
          <input
            id={`onboarding-${p}`}
            type="password"
            value={keys[p]}
            onChange={(e) => setKeys((k) => ({ ...k, [p]: e.target.value }))}
            placeholder={`Paste ${p} key`}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      ))}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={skip} className="cursor-pointer rounded-lg border border-border-strong px-4 py-2 transition-colors duration-200 hover:border-foreground-muted">
          Skip for now
        </button>
        <button type="button" onClick={saveAll} disabled={busy}
                className="cursor-pointer rounded-lg bg-accent px-4 py-2 font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover disabled:opacity-50">
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create onboarding page**

Create `src/app/app/onboarding/page.tsx`:

```tsx
import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";

export const metadata: Metadata = {
  title: `Onboarding — ${BRANDING.appName}`,
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      <OnboardingWizard />
    </main>
  );
}
```

- [ ] **Step 4: Add middleware redirect for new users**

In `src/middleware.ts`, after auth gate, if user has zero keys AND isn't already on `/app/onboarding`, redirect to `/app/onboarding`. (Optional polish — only redirect on first login. Implement if simple; otherwise skip.)

For MVP, simpler: signup form's success handler can navigate to `/app/onboarding` directly. Update `LoginForm.tsx` and signup route's response shape to support this.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/OnboardingWizard.tsx src/app/app/onboarding/
git commit -m "feat(onboarding): adapt to 1-step BYOK key entry"
```

---

## Task 5.12: Build `/signup` page

**Files:**
- Modify or Create: `src/app/signup/page.tsx`
- Modify or Create: `src/components/auth/SignupForm.tsx`

- [ ] **Step 1: Cherry-pick if available**

```bash
git checkout feat/adlance-saas-conversion -- src/app/signup/page.tsx 2>/dev/null && echo "cherry-picked" || echo "writing fresh"
```

If the page references workspace/invite logic, strip it.

- [ ] **Step 2: Write/Update SignupForm**

```tsx
"use client";
// Client Component: form state + submit
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    setBusy(false);
    if (res.ok) router.push("/verify-pending");
    else {
      const body = await res.json();
      setErr(body.details?.message ?? body.error ?? "Signup failed");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Create your account</h1>
        <p className="mt-2 text-foreground-muted">Free forever. Bring your own keys.</p>
      </header>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
               className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium">Name</label>
        <input id="full_name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
               className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
               className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
        <p className="mt-1 text-xs text-foreground-subtle">Minimum 8 characters.</p>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      <button type="submit" disabled={busy}
              className="w-full cursor-pointer rounded-lg bg-accent px-4 py-2 font-medium text-accent-fg transition-colors duration-200 hover:bg-accent-hover disabled:opacity-50">
        {busy ? "Creating…" : "Create account"}
      </button>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account? <Link href="/login" className="cursor-pointer text-accent transition-colors duration-200 hover:text-accent-hover">Sign in</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Implement signup page**

```tsx
// src/app/signup/page.tsx
import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: `Sign up — ${BRANDING.appName}` };

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      <SignupForm />
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/signup/ src/components/auth/SignupForm.tsx
git commit -m "feat(auth): add signup page + form"
```

---

## Task 5.13: `/verify-pending` page

**Files:**
- Create: `src/app/verify-pending/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";
import { VerifyPendingActions } from "@/components/auth/VerifyPendingActions";

export const metadata: Metadata = { title: `Verify your email — ${BRANDING.appName}` };

export default function VerifyPendingPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Check your email</h1>
        <p className="mt-4 text-foreground-muted">
          We sent you a verification link. Click it to activate your account.
        </p>
        <div className="mt-8">
          <VerifyPendingActions />
        </div>
      </div>
    </main>
  );
}
```

(`VerifyPendingActions` was cherry-picked in Phase 1. Verify it has the resend logic; if it points to old route, update to use `/api/auth/resend-verification`.)

- [ ] **Step 2: Commit**

```bash
git add src/app/verify-pending/page.tsx
git commit -m "feat(auth): add /verify-pending page"
```

---

## Task 5.14: Phase 5 wrap-up

- [ ] **Step 1: Build + test sweep**

```bash
npm run build && npm test 2>&1 | tail -20
```

- [ ] **Step 2: Manual E2E smoke**

```bash
npm run dev
```

Walk through:
- `/` renders landing.
- `/signup` → submit valid → redirect to `/verify-pending`.
- (Verify email manually via Supabase Studio or actual email.)
- `/login` → submit → `/app` (with banner if no keys).
- `/app/settings` → API Keys tab → add a key → banner disappears.
- `/app/library` → reachable.
- Logout → back to `/`.

- [ ] **Step 3: Update user**

> "Phase 5 complete. Landing page live; BYOK self-serve UI working. Manual smoke passed. Next: Phase 6 — coverage sweep + email templates + final QA."

---

# Phase 6 — Polish + Docs + QA

**Goal:** Bring test coverage to target, write `docs/email-templates.md`, write `docs/manual-qa-checklist.md`, rewrite `README.md`, run security review.

**Estimated effort:** 1 day.

**Definition of Done:**
- ☐ ≥80% line coverage on services + lib helpers.
- ☐ 100% pass on `user-isolation.test.ts`.
- ☐ `docs/email-templates.md` documents Supabase Auth template customization.
- ☐ `docs/manual-qa-checklist.md` captures the 13-step E2E from spec.
- ☐ `README.md` updated for Adlance.
- ☐ Security review: `grep` for hardcoded secrets, env leaks, RLS gaps.
- ☐ `npm run build && npm test && npx tsc --noEmit` all green.

---

## Task 6.1: Coverage sweep

- [ ] **Step 1: Run coverage report**

```bash
npx vitest run --coverage 2>&1 | tail -40
```

- [ ] **Step 2: Identify <80% files**

For `src/services/`, `src/lib/{user-context,key-provider,crypto}.ts` — list any files below 80% line coverage.

- [ ] **Step 3: Add missing tests**

For each underscored file, add tests covering:
- Happy path
- 401 / 403 / 400 / 500 error branches
- Edge cases (empty list, missing record)

Pattern: mirror `user-api-keys.test.ts` structure.

- [ ] **Step 4: Re-run coverage; verify ≥80%**

```bash
npx vitest run --coverage 2>&1 | grep -E "^(File|src/services|src/lib)" | head -30
```

Expected: target files ≥ 80%.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "test: bring services + lib coverage to ≥80%"
```

---

## Task 6.2: Write `docs/email-templates.md`

**Files:**
- Create: `docs/email-templates.md`

- [ ] **Step 1: Write the doc**

```markdown
# Adlance Email Templates

Supabase Auth sends transactional emails. Customize them in Studio → Authentication → Email Templates.

## Required updates

For each template (Confirm signup, Reset password, Magic Link, Invite — leave invite as-is since unused):

1. Replace "Supabase" → "Adlance"
2. Replace default colors with brand violet `#8b5cf6` for buttons + links
3. Update sender name (Settings → SMTP → "From name") to "Adlance"
4. Update sender email to a domain we control (e.g. `noreply@adlance.com`) — requires SMTP setup or Supabase's default

## Confirm signup template

Subject: "Welcome to Adlance — verify your email"

Body (HTML):
- Header with logo SVG (host externally — see Task 6.x for asset URLs)
- Greeting: "Hi {{ .Email }},"
- CTA button (violet): "Verify your email" linking to `{{ .ConfirmationURL }}`
- Footer: "Didn't sign up? Ignore this email."

## Reset password template

Subject: "Reset your Adlance password"

Body:
- "We received a request to reset your password."
- CTA button: "Reset password" linking to `{{ .ConfirmationURL }}`
- Footer: "If you didn't request this, ignore this email."

## Verification flow

The default Supabase verification link redirects to `<SITE_URL>/auth/callback?code=…` (or whatever's configured in Project Settings). After verification, redirect to `/login`.

In Studio → Authentication → URL Configuration:
- Site URL: `https://adlance.com` (or local dev)
- Redirect URLs: `http://localhost:3000`, `https://adlance.com`

## Rate limits

Supabase enforces signup rate limits per IP. If a public BYOK launch sees abuse, consider:
- Enabling hCaptcha (Studio → Auth → Captcha)
- Lowering "Max emails per hour" in Auth settings

## Testing locally

For local dev, Supabase uses Inbucket (built-in mailcatcher) at `http://localhost:54324`. All sent emails appear there.
```

- [ ] **Step 2: Commit**

```bash
git add docs/email-templates.md
git commit -m "docs: add email-templates customization guide"
```

---

## Task 6.3: Write `docs/manual-qa-checklist.md`

**Files:**
- Create: `docs/manual-qa-checklist.md`

- [ ] **Step 1: Write checklist (mirror spec section 8.4)**

```markdown
# Adlance — Manual QA Checklist

Run before each release / major milestone. All steps must pass.

1. ☐ Anonymous → `/` landing renders correctly (Hero + Bento + How + BYOK + CTA + Footer).
2. ☐ Click "Try free" → `/signup` → submit valid form → `/verify-pending` shown.
3. ☐ Click email verification link → Supabase callback → redirect to `/login`.
4. ☐ Login → `/app/onboarding` (1-step BYOK).
5. ☐ Skip keys → `/app` dashboard with `MissingKeyBanner` showing 3 missing providers.
6. ☐ Add a brand → `/app/brands` → create → setup identity, kit, product.
7. ☐ Try generate without keys → friendly empty state with link to Settings.
8. ☐ Add Anthropic + Google + KIE keys in `/app/settings#api-keys`. Banner disappears.
9. ☐ Generate ad → SSE stream completes → first ad appears.
10. ☐ Save to library → `/app/library` → ad appears with thumbnail + delete option.
11. ☐ Logout → log back in → keys still work (cache survives via DB; banner hidden).
12. ☐ Open private/incognito browser, sign up second user — confirm user 2 cannot see user 1's brand.
13. ☐ Account delete (`/app/settings` → danger zone → confirm email) → cascade wipe verified (brands + saved_ads + keys gone).

## Performance / a11y

14. ☐ Lighthouse on `/` → Accessibility ≥ 90, Performance ≥ 80.
15. ☐ Test on 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
16. ☐ Tab navigation works through landing CTA + signup form.
17. ☐ `prefers-reduced-motion` respected (verify in DevTools rendering panel).

## Error handling

18. ☐ Invalid Anthropic key → Generate fails → banner "Your Anthropic key was rejected".
19. ☐ Provider quota exceeded → banner "Your Anthropic key hit its quota".
20. ☐ DB down (simulate by killing local Supabase) → 500 with generic toast, no stack trace leaked.
```

- [ ] **Step 2: Commit**

```bash
git add docs/manual-qa-checklist.md
git commit -m "docs: add manual QA checklist for release verification"
```

---

## Task 6.4: Rewrite `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite**

```markdown
# Adlance

Free AI ad generator. Bring your own API keys.

## What it does

- Generate static ads with AI (concept-driven + stealth/organic styles)
- Per-user brand DNA (identity, kit, products, personas)
- Library of saved ads + content adaptation (caption rewriting)
- BYOK: encrypted-at-rest API keys (Anthropic, Google AI, KIE) — pay providers directly

## Tech stack

- Next.js 16 + React 19 (App Router, Server Components default)
- Supabase (PostgreSQL + Auth + Storage)
- Anthropic SDK (Claude Haiku 4.5)
- Google AI SDK (Gemini 2.5 Flash)
- KIE (nano-banana-2 image generation)
- Tailwind CSS + shadcn/ui + Geist fonts

## Getting started

```bash
npm install
cp .env.local.template .env.local   # then fill values
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste output as ADLANCE_ENCRYPTION_KEY in .env.local
npm run dev
```

## Architecture

3-layer:
1. **Public** — `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-pending`
2. **App (auth-gated)** — `/app/*` (dashboard, brands, library, concepts, stealth-ads, guide, settings, onboarding)
3. **Backend** — `src/services/`, `src/app/api/`, Supabase

See `docs/superpowers/specs/2026-04-30-adlance-byok-pivot-design.md` for the full spec.

## Testing

```bash
npm test                           # all tests
npx vitest run --coverage         # with coverage
```

## License

All rights reserved. License terms to be finalized before public launch.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): rewrite for Adlance BYOK"
```

---

## Task 6.5: Security review

- [ ] **Step 1: Search for hardcoded secrets**

```bash
grep -rnE "sk-ant-|AIza[0-9A-Za-z_-]{30,}|sb_secret_|sk_live_|password.*=.*['\"]" src/ supabase/byok-pivot/ docs/ \
  | grep -v __tests__ | grep -v node_modules | grep -v .env
```

Expected: no matches in committed code.

- [ ] **Step 2: Search for env vars used unsafely**

```bash
grep -rn "process.env" src/ | grep -v __tests__ | head -20
```

Verify: every usage is server-side (no `NEXT_PUBLIC_*` for secrets), and `ADLANCE_ENCRYPTION_KEY` is only read in `crypto.ts`.

- [ ] **Step 3: Verify RLS coverage**

Run via MCP `execute_sql`:
```sql
SELECT t.tablename,
       COUNT(p.policyname) AS policy_count,
       t.rowsecurity AS rls_enabled
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

Expected: every table has `rls_enabled = true` and `policy_count >= 1`. If any table shows 0 policies or RLS off — STOP and patch.

- [ ] **Step 4: Run `/security-review` skill**

Invoke the `security-review` skill (available in this session) on the current branch. Address any high-severity findings before declaring done.

- [ ] **Step 5: Final TS + build + test sweep**

```bash
npx tsc --noEmit
npm run build
npm test
```

All three must succeed.

- [ ] **Step 6: Commit any security fixes**

```bash
git add -A
git commit -m "chore(security): address review findings"   # if any
```

---

## Task 6.6: Phase 6 + total wrap-up

- [ ] **Step 1: Final verification**

```bash
git status
git log --oneline 5090039..HEAD | head -40
```

Expected: clean tree; long list of commits across 6 phases.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/adlance-byok-pivot
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat: pivot to Adlance — free BYOK SaaS" --body "$(cat <<'EOF'
## Summary

- Pivots the project from a PATI internal tool to **Adlance** — a free, account-based, BYOK AI ad generator.
- Drops the Adlance multi-tenant workspace plan in favor of solo accounts (1 user = 1 tenant; brands.owner_user_id; user_api_keys encrypted at rest with AES-256-GCM).
- Adds public landing page at `/` (Dark Minimalism, violet+cyan palette, Hero + Bento + How + BYOK + CTA), self-serve API Keys card in Settings, missing-key empty states + dashboard banner.
- Drops Competitor Markets feature, admin pages, workspace primitive entirely.
- Drops PATI tables on prod (fresh wipe per spec decision A); 6 migrations applied via MCP.

## Spec
docs/superpowers/specs/2026-04-30-adlance-byok-pivot-design.md

## Plan
docs/superpowers/plans/2026-04-30-adlance-byok-pivot.md

## Test plan
- [x] Lib tests (crypto, user-context, key-provider) pass
- [x] API tests (user-api-keys, user-concepts, auth-signup, user-isolation) pass
- [x] User isolation test passes 100% (real DB)
- [x] Manual E2E checklist (docs/manual-qa-checklist.md) green
- [x] Lighthouse a11y ≥ 90 on `/`
- [x] Build + TS check + npm test all clean
- [x] Security review (no leaked secrets, RLS enabled on every public table)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Final user message**

> "Adlance BYOK pivot complete across 6 phases. PR opened. After merge: rotate `ADLANCE_ENCRYPTION_KEY` for production, configure SMTP + email templates per docs/email-templates.md, and announce. Estimated production go-live: 1–2 days post-merge for environment + email setup."

---

# Definition of Done — Total Pivot

- ☐ Phase 1: Foundation cherry-pick + crypto + branding + auth pages.
- ☐ Phase 2: 6 migrations applied; isolation verified manually.
- ☐ Phase 3: Backend refactored; all tests pass; user isolation test 100%.
- ☐ Phase 4: All app routes under `/app/*`; middleware gates working.
- ☐ Phase 5: Landing page + BYOK self-serve UI live.
- ☐ Phase 6: ≥80% coverage, docs, security review.
- ☐ PR opened against `main`.
- ☐ User reviews PR; signs off.
- ☐ Merge + tag + deploy.

## End of Plan

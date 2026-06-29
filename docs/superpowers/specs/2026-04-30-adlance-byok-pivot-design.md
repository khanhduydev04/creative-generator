# Adlance — BYOK Pivot Design Spec

**Date:** 2026-04-30
**Author:** brainstorm session (operator + Claude)
**Status:** Approved (pending implementation plan)
**Supersedes:** `docs/superpowers/specs/2026-04-26-adlance-saas-conversion-design.md` (multi-tenant SaaS plan; abandoned in favor of solo + BYOK)

---

## 1. Overview & Goals

Pivot `static-ads-generator` (PATI internal tool) into **Adlance** — a free, public, account-based AI ad generator. Users sign up, bring their own API keys (BYOK), and use the tool at no cost. Server stores their keys encrypted at rest; brands/library/saved-ads persist per user; no teams, workspaces, or invitations.

**Tagline:** *Ad creation at the speed of thought.*
**Subline:** *Free AI ad generator. Bring your own keys.*

### Success criteria (measurable)

1. Anonymous visitor lands on `/` → understands value in <30s → clicks "Try free" → completes signup + email verification + first ad generation in <15 minutes.
2. Two different user accounts cannot see each other's data (verified via tenancy isolation tests + RLS policies).
3. Zero references to "PATI", `@patigroup.com`, `@patiagency.com`, the green `#17cf54` accent, or the `clients` hierarchy in UI/copy/email/code.
4. All retained features (Concept Ads, Stealth Ads, Library, Content Adapt, Brand DNA, Concepts) continue to work end-to-end against per-user keys.
5. AI calls read keys from `user_api_keys` (decrypted at request time, cached 60s) — never from env for AI providers.
6. Test suite ≥80% line coverage on services, lib helpers, and critical libs (`crypto`, `key-provider`, `user-context`); 100% on user-isolation tests.

### Non-goals (out of scope)

- Stripe / billing / quota / pricing page (entire pricing is "free, BYOK").
- Workspaces / teams / invitations / multi-tenant primitives.
- Admin UI (`/admin/*`). The `is_platform_admin` flag stays in `profiles` for ops/observability only.
- Marketing site beyond a single-page landing (`/`). No `/about`, `/pricing`, `/blog`.
- Activity log / audit log (defer; can be re-added per-user later).
- Competitor Markets feature (Sheets-driven market data) — dropped entirely.
- i18n, mobile app, SSO/OAuth, 2FA/MFA, custom domain / white-label, public API, ⌘K search functional.
- Light-mode toggle UI (dark default; light tokens defined for future).
- Onboarding tour beyond a 1-step BYOK key entry.
- Analytics, account data export (account deletion is supported; data export deferred).

### Constraints

- Same Supabase project; **fresh data wipe** of PATI tables (user explicitly approved).
- Preserve system data: `concept_prompts` IP + hardcoded stealth scenes.
- Tech stack unchanged: Next.js 16 + React 19 + Supabase + Claude (Haiku 4.5) + Gemini (2.5 Flash) + KIE (nano-banana-2).
- Branch: `feat/adlance-byok-pivot` (off `main`). Cherry-pick UI/branding work from `feat/adlance-saas-conversion`; do **not** merge that branch (its workspace primitive contradicts this design).

---

## 2. Architecture

### 2.1 Three-layer routes

```
Layer 1 (Public)       /                  → Landing page
                       /login              /signup
                       /forgot-password    /reset-password
                       /verify-pending
                       /api/auth/*         (signup, verify-login, forgot-password, resend-verification)

Layer 2 (App)          /app                → Generate dashboard
  (auth-gated)         /app/library        /app/brands         /app/brands/[id]
                       /app/concepts       /app/stealth-ads    /app/guide
                       /app/settings       /app/onboarding
                       /api/{brands,brand-products,brand-kit,personas,saved-ads,
                             concepts,user-concepts,user-api-keys,
                             generate-ads,edit-ad,save-ad,
                             stealth/*,stealth-ref/*,stealth-scenes,
                             content-adapt/*,competitor-ref/*,prepare-generation,
                             upload-reference,user/me}/*

Layer 3 (Backend)      src/services/*      (DB + AI logic)
                       src/lib/{crypto,user-context,key-provider}.ts
                       Supabase: profiles, brands, user_api_keys, user_concepts,
                                 brand_kits, brand_products, persona_profiles,
                                 brand_research_summaries, saved_ads,
                                 kie_task_results, stealth_scenes, concept_prompts
```

### 2.2 Middleware (`src/middleware.ts`)

1. **Public routes** (no auth check): `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-pending`, `/api/auth/*`.
2. `/app/*` not authenticated → redirect `/login`.
3. `/app/*` authenticated but `email_confirmed_at` null → redirect `/verify-pending`.
4. `/login`, `/signup` already authenticated → redirect `/app`.
5. `/` always renders public landing — no redirect even when logged-in (user can deliberately revisit marketing).

### 2.3 Auth model

- Supabase Auth, email + password.
- Email verification required (Supabase default).
- No domain restriction (drop PATI gate).
- 1 user = 1 tenant. No `workspaces` table; brands directly own user via `brands.owner_user_id`.

---

## 3. Data Model

Schema is the Adlance snapshot **adapted for solo + BYOK** (drop workspace primitive, scope by `user_id`).

### 3.1 Tables to DROP (vs PATI baseline)

- `clients` — hierarchy removed.
- `app_settings` — replaced by `user_api_keys`.
- `activity_log` — deferred (no audit log per-user yet).
- `product_markets` — feature dropped.

### 3.2 Tables to MODIFY

```sql
ALTER TABLE profiles
  DROP COLUMN role,
  DROP COLUMN department,
  DROP COLUMN is_active,
  DROP COLUMN last_login_at,
  ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE brands
  DROP COLUMN client_id,
  ADD COLUMN owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX brands_owner_idx ON brands(owner_user_id);
```

### 3.3 Tables to CREATE

```sql
CREATE TABLE user_api_keys (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic','google','kie')),
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE user_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  requires_competitor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_concepts_owner_idx ON user_concepts(owner_user_id);
```

The `google_console` provider is omitted from the CHECK constraint — Markets feature is dropped.

### 3.4 Tables UNCHANGED (RLS rewrite only)

`brand_kits`, `brand_products`, `persona_profiles`, `brand_research_summaries`, `saved_ads`, `kie_task_results`, `stealth_scenes` — all brand-scoped, RLS joins via `brands.owner_user_id`.

`concept_prompts` (system IP, read-only) — RLS unchanged: SELECT for any authenticated user; INSERT/UPDATE/DELETE only for `is_platform_admin`.

### 3.5 RLS Strategy

**Direct user-scoped tables** (`user_api_keys`, `user_concepts`):

```sql
USING (user_id = auth.uid())          -- or owner_user_id = auth.uid()
WITH CHECK (user_id = auth.uid())
```

**Brand-scoped tables** (e.g. `saved_ads`):

```sql
USING (EXISTS (
  SELECT 1 FROM brands b
  WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM brands b
  WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
))
```

No helper function (`auth.user_in_workspace()`) needed — RLS is ~30% simpler than the snapshot.

### 3.6 Storage buckets

- Keep: `brand-assets`, `generated-ads`, `images`.
- Drop: `campaign-inputs` (legacy unused).
- Path convention: `{user_id}/{brand_id}/{filename}`.
- Storage RLS: parse first path segment via `(storage.foldername(name))[1]::uuid` and check against `auth.uid()`.

### 3.7 Encryption

- AES-256-GCM with master key `ADLANCE_ENCRYPTION_KEY` (32-byte / 64 hex char) in env.
- `src/lib/crypto.ts` — `encryptKey()`, `decryptKey()`, `CryptoError`. Cherry-picked from `feat/adlance-saas-conversion`.
- Output format (base64): `iv (12B) || authTag (16B) || ciphertext`.
- Key rotation procedure documented separately; rotate annually or on suspected leak (decrypt-with-old + re-encrypt-with-new for all `user_api_keys` rows).

### 3.8 `handle_new_user` trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

(Snapshot version auto-created a workspace; this version only creates the profile.)

### 3.9 Migration order (single transaction per file)

1. `01_drop_pati_tables.sql` — drop `clients`, `app_settings`, `activity_log`, `product_markets`; wipe brand data.
2. `02_alter_profiles_brands.sql` — alter `profiles` and `brands` columns.
3. `03_create_user_tables.sql` — create `user_api_keys`, `user_concepts`.
4. `04_rls_policies.sql` — all RLS policies for direct + brand-scoped + system tables.
5. `05_storage_rls.sql` — path-based storage RLS.
6. `06_trigger_handle_new_user.sql` — auto-profile trigger.

---

## 4. Components & Pages

Three buckets: **NEW** (design + build), **CHERRY-PICK** (re-use from `feat/adlance-saas-conversion`), **DROP** (delete entirely).

### 4.1 NEW

| Component / Page | Role |
|---|---|
| `src/app/page.tsx` (landing) | Public landing — Hero + Bento Features + How it works + BYOK explainer + CTA + Footer |
| `src/components/landing/HeroSection.tsx` | Headline + tagline + dual CTA + product mockup hint |
| `src/components/landing/BentoFeatures.tsx` | 6-cell bento grid (Concept Ads / Stealth Ads / Library / BYOK / Brand DNA / Content Adapt) — uses cherry-picked `ui/bento-grid.tsx` |
| `src/components/landing/HowItWorks.tsx` | 3-step (Sign up → Add API keys → Generate ads) |
| `src/components/landing/ByokExplainer.tsx` | Section explaining BYOK rationale + privacy + cost framing |
| `src/components/landing/CtaSection.tsx` | Final conversion CTA |
| `src/components/landing/Footer.tsx` | Logo + Privacy + Terms + Contact + © |
| `src/components/landing/PublicNavbar.tsx` | Floating navbar — logo + "Sign in" + "Try free" |
| `src/app/app/onboarding/page.tsx` | 1-step BYOK key entry (cherry-pick `OnboardingWizard.tsx` from feat then strip workspace step) |
| `src/components/settings/UserApiKeysCard.tsx` | Self-serve API keys CRUD in Settings |
| `src/components/settings/MissingKeyBanner.tsx` | Dashboard banner if user is missing a core key |
| `src/components/empty-states/MissingKeyEmptyState.tsx` | Per-feature empty state with link to Settings |

### 4.2 CHERRY-PICK from `feat/adlance-saas-conversion`

| File | Adapt needed |
|---|---|
| `tailwind.config.ts`, `src/app/globals.css` | None |
| `src/app/layout.tsx` | None (Geist fonts + BRANDING metadata already wired) |
| `src/lib/branding.ts` | None |
| `src/lib/crypto.ts` + tests | None |
| `public/brand/{logo-light,logo-dark}.svg`, `public/favicon.svg` | None |
| `src/app/login/page.tsx` + `LoginForm.tsx` | Domain restriction already removed |
| `src/app/forgot-password/*` + `ForgotPasswordForm.tsx` | None |
| `src/app/reset-password/*` + `ResetPasswordForm.tsx` | None |
| `src/app/signup/page.tsx` | Strip workspace creation step if present |
| `src/components/auth/VerifyPendingActions.tsx` | None |
| `src/components/auth/ChangePasswordForm.tsx` | None |
| `src/components/auth/SettingsClient.tsx` | Replace API Keys tab with `UserApiKeysCard` |
| `src/components/auth/OnboardingWizard.tsx` | Strip workspace step + invite step; keep only BYOK key entry step |
| `src/components/layout/DashboardLayout.tsx` | Remove workspace switcher; add `MissingKeyBanner`; user menu only |
| `src/components/ui/{bento-grid,streaming-text,typing-indicator}.tsx` | None |
| All `src/features/{brand,workspace,stealth,content-adapt,guide,concepts}/components/**` | Strip references to `workspace_id` (replace with `user_id` where leaked); else re-use restyle |

### 4.3 DROP

- `src/components/auth/InviteAcceptButton.tsx`
- `src/components/admin/{ApiKeysClient,AdminUsersClient,CreateUserDialog,UserActionsMenu,ActivityLog}.tsx`
- `src/components/layout/{NewClientModal,RenameClientModal,DeleteClientModal}.tsx`
- `src/app/admin/**`
- `src/features/workspace/components/MarketSection.tsx`
- (Snapshot/feat-only) `src/services/workspace*Service.ts`, `src/types/workspace.ts`, `src/lib/workspace-context.ts`
- `src/app/api/{clients,admin,product-markets,workspace-*}/**`

### 4.4 Component organisation

- Auth flow components → `src/components/auth/`
- Landing → `src/components/landing/`
- Layout shell → `src/components/layout/`
- UI primitives → `src/components/ui/`
- Settings components → `src/components/settings/`
- Empty states → `src/components/empty-states/`
- Feature-scoped components stay → `src/features/[name]/components/`

(Per Project Constitution: feature-based folders; one component per file matching PascalCase filename; no barrel `index.ts`.)

---

## 5. Data Flow

### 5.1 Auth flow (signup → first generate)

```
Anonymous → GET /
          → click "Try free" → GET /signup
          → submit form → POST /api/auth/signup
              ↳ supabase.auth.signUp() inserts auth.users
              ↳ trigger handle_new_user inserts profiles row
              ↳ Supabase sends verification email
          → GET /verify-pending ("check your email" + resend)
          → user clicks email link → Supabase auth callback verifies token,
                                     sets email_confirmed_at, redirects to /login
          → GET /login → submit → POST /api/auth/verify-login
              ↳ signInWithPassword() sets Supabase session cookie
          → middleware: authenticated + verified
          → GET /app/onboarding (1-step BYOK key entry; "Skip for now" allowed)
          → submit (or skip) → GET /app
              ↳ MissingKeyBanner if any required key absent
```

### 5.2 BYOK key lifecycle

```
User enters Anthropic key in onboarding or /app/settings#api-keys
  → PUT /api/user-api-keys body: { provider, key }
  → requireUser(req) → { userId }
  → validateKeyFormat(provider, key)
  → encrypted = encryptKey(plainKey)
  → upsert user_api_keys (user_id, provider, encrypted_key)
  → clearUserKeyCache(userId, provider)  -- in-memory cache invalidate
  → return { ok, masked }

Generation request later:
  POST /api/generate-ads → service.generate({ userId, ... })
  → For each AI call:
      key = await getUserApiKey(userId, provider)
            ↳ cache hit (60s TTL) OR
            ↳ SELECT user_api_keys → decryptKey → cache → return
  → If key missing → throw MissingApiKeyError(provider)
  → Caught in handler → SSE event { type:'error', code:'missing_api_key', provider }
  → Client → render MissingKeyEmptyState w/ link to Settings
```

### 5.3 Generation pipeline (feature-locked keys)

Each step requires its provider's key BEFORE the AI call. First missing key fails the request.

```
Step 1: Read product landing page (Gemini)         → requireKey(google)
Step 2: Apply concept strategy + copy variants     → uses google (cached)
Step 3: (if competitor reference image) Analyze    → requireKey(anthropic)
Step 4: Assemble KIE prompt + call KIE             → requireKey(kie)
Step 5: Save to saved_ads if user clicks Save      → uses storage path {user_id}/{brand_id}/...
```

Step "Analyze competitor sheet data" is removed (Markets feature dropped).

### 5.4 Brand/Library scoping

```
GET /api/brands → service.list(userId)
  → SELECT * FROM brands WHERE owner_user_id = $1
  → return JSON

GET /api/saved-ads → service.list(userId)
  → SELECT sa.* FROM saved_ads sa
    JOIN brands b ON b.id = sa.brand_id
    WHERE b.owner_user_id = $1
```

RLS enforces the same boundaries at the DB layer (defense in depth).

### 5.5 In-memory key cache

```
Map<`${userId}:${provider}`, { value, cachedAt }>
TTL = 60 seconds
clearUserKeyCache(userId)  -- clears all entries for a user after they
                              update or delete any key (60s TTL makes
                              per-entry granularity unnecessary)
```

The cache key MUST be prefixed by `userId` (not just provider) — without that prefix, a cached key from user A would leak to user B on the same provider.

### 5.6 Error model

| Error | HTTP | Response | UX |
|---|---|---|---|
| Not authenticated | 401 | `{error:'unauthorized'}` | redirect `/login` |
| Email not verified | 403 | `{error:'email_not_verified'}` | redirect `/verify-pending` |
| Missing API key | 400 | `{error:'missing_api_key', provider}` | render `MissingKeyEmptyState` w/ link to Settings |
| Invalid key (4xx from provider) | 502 | `{error:'invalid_api_key', provider, message}` | banner "Your [provider] key was rejected — update in Settings" |
| Provider quota exceeded | 502 | `{error:'provider_quota_exceeded', provider}` | banner "Your [provider] key hit its quota — check provider dashboard" |
| Validation | 400 | `{error:'validation', issues:[]}` | inline form errors |
| Internal | 500 | `{error:'internal'}` | generic toast + log |

---

## 6. API Routes & Services

### 6.1 Routes ADD

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/api/auth/signup` | public | `{email, password, full_name}` | `{ok, userId, email}` (sends verification email) |
| POST | `/api/auth/resend-verification` | public | `{email}` | `{ok}` |
| GET | `/api/user-api-keys` | user | — | `[{provider, masked, updated_at}]` (no plaintext) |
| PUT | `/api/user-api-keys` | user | `{provider, key}` | `{ok, masked}` |
| DELETE | `/api/user-api-keys/[provider]` | user | — | `{ok}` |
| GET | `/api/user-concepts` | user | — | `[{id, label, ...}]` |
| POST | `/api/user-concepts` | user | `{label, description, prompt, requires_competitor}` | `{id, ...}` |
| PATCH | `/api/user-concepts/[id]` | user | `{...}` | `{...}` |
| DELETE | `/api/user-concepts/[id]` | user | — | `{ok}` |
| GET | `/api/user/me` | user | — | `{id, email, full_name, has_keys: {anthropic, google, kie}}` |
| DELETE | `/api/user/me` | user | `{confirm: email}` | `{ok}` (cascade delete) |

### 6.2 Routes MODIFY (add `userId` scoping)

`/api/brands`, `/api/brands/[id]`, `/api/brand-products/*`, `/api/brand-kit/*`, `/api/personas`, `/api/saved-ads`, `/api/brand-intelligence/*`, `/api/stealth/*`, `/api/stealth-ref/*`, `/api/stealth-scenes/*`, `/api/competitor-ref/*`, `/api/concepts`, `/api/generate-ads`, `/api/edit-ad`, `/api/save-ad`, `/api/content-adapt/*`, `/api/prepare-generation`, `/api/upload-reference` — each calls `requireUser(req)` first; service ops scoped by `userId`.

### 6.3 Routes REMOVE

`/api/clients/*`, `/api/admin/*`, `/api/product-markets/*`, `/api/workspace-*` (snapshot only — never on main).

### 6.4 Routes UNCHANGED

`/api/auth/forgot-password`, `/api/google-fonts`, `/api/download-image`.

`/api/auth/me` is **removed**; replaced by the new `/api/user/me` (Section 6.1) for consistency with the `/api/user-*` namespace.

### 6.5 `src/lib/user-context.ts` (replaces `workspace-context.ts`)

```ts
export async function requireUser(req: NextRequest): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "unauthorized");
  if (!user.email_confirmed_at) throw new ApiError(403, "email_not_verified");
  return { userId: user.id };
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) { super(code); }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) return NextResponse.json({ error: e.code, ...(e.details ? { details: e.details } : {}) }, { status: e.status });
  if (e instanceof MissingApiKeyError) return NextResponse.json({ error: "missing_api_key", provider: e.provider }, { status: 400 });
  console.error("[api]", e);
  return NextResponse.json({ error: "internal" }, { status: 500 });
}
```

### 6.6 `src/lib/key-provider.ts` (rewrite)

```ts
const cache = new Map<string, { value: string; cachedAt: number }>();
const TTL = 60_000;

export async function getUserApiKey(userId: string, provider: ApiKeyProvider): Promise<string> {
  const cacheKey = `${userId}:${provider}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < TTL) return cached.value;

  const supabase = createAdminClient();           // service role, bypass RLS
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

export class MissingApiKeyError extends Error {
  constructor(public provider: string) { super(`Missing ${provider} API key`); }
}

export function clearUserKeyCache(userId: string): void {
  for (const k of cache.keys()) if (k.startsWith(`${userId}:`)) cache.delete(k);
}
```

### 6.7 AI client signature update

```ts
// Before (PATI baseline)
export async function claudeVisionAnalyze(prompt, imageData) {
  const apiKey = await requireApiKey("anthropic_api_key");
  // ...
}

// After (BYOK)
export async function claudeVisionAnalyze(userId: string, prompt: string, imageData: string) {
  const apiKey = await getUserApiKey(userId, "anthropic");
  // ...
}
```

Affected: `src/services/claudeClient.ts`, `geminiClient.ts`, `kieClient.ts`.

### 6.8 CRUD service pattern

```ts
export class BrandService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async list(): Promise<Brand[]> {
    const { data, error } = await this.supabase
      .from("brands")
      .select("*")
      .eq("owner_user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, "db_error", error.message);
    return data as Brand[];
  }

  async create(input: BrandCreate): Promise<Brand> {
    const { data, error } = await this.supabase
      .from("brands")
      .insert({ ...input, owner_user_id: this.userId })
      .select().single();
    if (error) throw new ApiError(500, "db_error", error.message);
    return data as Brand;
  }
}
```

`.eq("owner_user_id", userId)` is **defense in depth** — RLS already enforces; explicit filter prevents accidental leak if RLS is ever disabled.

### 6.9 Route handler pattern

```ts
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = await createClient();
    const service = new BrandService(supabase, userId);
    const brands = await service.list();
    return NextResponse.json({ brands });
  } catch (e) {
    return handleApiError(e);
  }
}
```

### 6.10 Services to delete

`clientService` (drop), `appSettingService` (drop), `productMarketService` (drop). Workspace-prefixed services exist only on `feat/adlance-saas-conversion` and are not cherry-picked.

---

## 7. Branding & Design System

Synthesized from `ui-ux-pro-max --design-system` output + supplementary domain searches + feat branch existing code.

### 7.1 Style direction

**Dark Minimalism** — hybrid of Swiss Modernism 2.0 (strict 12-column grid, sans-serif, 8px base unit, single accent, mathematical spacing, WCAG AAA) + Dark Mode OLED (deep black, eye-friendly, vibrant violet accent, minimal glow).

Reference vibes: Linear, Vercel dashboard, Anthropic Console, Claude.ai.
Rejected: skill's auto-suggestion "Vibrant & Block-based" (too playful for an AI dev tool); "Cyberpunk UI" (accessibility risk).

### 7.2 Color tokens

Aligned to feat branch HSL convention (already in `tailwind.config.ts` + `globals.css`):

| Token | Light | Dark (default) | Usage |
|---|---|---|---|
| `--background` | `hsl(0 0% 100%)` | `hsl(0 0% 4%)` | Page bg |
| `--surface` | `hsl(0 0% 98%)` | `hsl(0 0% 7%)` | Card bg |
| `--surface-elevated` | `hsl(0 0% 96%)` | `hsl(0 0% 10%)` | Modal, dropdown |
| `--border` | `hsl(0 0% 90%)` | `hsl(0 0% 15%)` | Subtle divider |
| `--border-strong` | `hsl(0 0% 80%)` | `hsl(0 0% 25%)` | Visible divider |
| `--foreground` | `hsl(0 0% 9%)` | `hsl(0 0% 98%)` | Body text |
| `--foreground-muted` | `hsl(0 0% 40%)` | `hsl(0 0% 64%)` | Secondary text |
| `--foreground-subtle` | `hsl(0 0% 55%)` | `hsl(0 0% 45%)` | Captions |
| `--accent` (Violet) | `hsl(263 85% 65%)` = `#8b5cf6` | same | Primary CTA, links, focus ring |
| `--accent-hover` | `hsl(263 85% 70%)` | same | Hover |
| `--accent-subtle` | `hsl(263 60% 25%)` | same | Filled chips |
| `--accent-muted` | `hsl(263 30% 15%)` | same | Muted backgrounds |
| `--accent-fg` | `hsl(0 0% 100%)` | same | Text on violet |
| `--cta` (Cyan) | `hsl(189 94% 43%)` = `#06B6D4` | same | Secondary CTA, "Try free" highlights |
| `--success` | `hsl(142 70% 45%)` | same | |
| `--warning` | `hsl(38 92% 55%)` | same | Missing key banner |
| `--danger` | `hsl(0 72% 51%)` | same | Errors, delete |

**Default mode: dark.** Light mode toggle deferred (tokens defined for future).

### 7.3 Typography

| Role | Font | Source | Weights |
|---|---|---|---|
| Heading + body | Geist Sans | `next/font/google` | 400 / 500 / 600 / 700 |
| Mono (prompt display, code) | Geist Mono | `next/font/google` | 400 / 500 |

Heading `letter-spacing: -0.02em`; body normal. Line-height 1.5–1.7 body, 1.1–1.2 heading.

### 7.4 Design tokens

```ts
borderRadius: { DEFAULT: "8px", lg: "12px", xl: "16px" }
// spacing: default Tailwind 4px scale
```

- Section gaps: 80–120px desktop, 48–64px mobile.
- Animation: 150–300ms; transform/opacity only; respect `prefers-reduced-motion`.
- Shadow: none in dark mode (use border instead); subtle in light mode.

### 7.5 Landing page visual structure

```
[ Floating navbar — top-4 left-4 right-4 ]   logo · · · Sign in · Try free
[ Hero ~80vh ]                               headline (text-6xl, -0.02em) + tagline + dual CTA
[ Bento grid 6 cells ]                       Concept Ads · Stealth Ads · Library · BYOK · Brand DNA · Content Adapt
[ How it works 3-step ]                      Sign up free → Add API keys → Generate ads
[ BYOK explainer full-width ]                ownership · cost framing · encryption guarantees
[ Final CTA section ]                        "Start generating in 2 minutes"
[ Footer ]                                   logo + Privacy + Terms + Contact + © 2026
```

### 7.6 Pre-delivery checklist (from `ui-ux-pro-max`)

Apply to every new page:

- [ ] No emoji icons — use SVG (Lucide / Heroicons).
- [ ] All clickable elements have `cursor-pointer`.
- [ ] Hover: color shift only, no scale transforms.
- [ ] Transitions 150–300ms, easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- [ ] Focus ring visible (violet 2px + 2px offset).
- [ ] Light/dark contrast ≥ 4.5:1 verified.
- [ ] Responsive breakpoints: 375px, 768px, 1024px, 1440px.
- [ ] Floating navbar spacing top-4 left-4 right-4.
- [ ] No content hidden behind fixed navbar (account for navbar height in section padding).
- [ ] `prefers-reduced-motion: reduce` respected.
- [ ] All images via `next/image` (per Project Constitution).
- [ ] Form inputs have `<label htmlFor>`.
- [ ] Touch targets ≥ 44×44 px.

### 7.7 Persisted artifacts

- `design-system/adlance/MASTER.md` — Global Source of Truth (auto-generated).
- `design-system/adlance/pages/{landing,dashboard,onboarding}.md` — page-specific overrides (to be added).

### 7.8 Brand assets

Cherry-picked from feat: `public/brand/{logo-light,logo-dark}.svg`, `public/favicon.svg`. BRANDING constant: `appName: "Adlance"`, `appTagline: "Ad creation at the speed of thought"`. Production domain is not yet decided; `BRANDING.domain` stays as a placeholder in `src/lib/branding.ts` and is overridable via env when production is set up.

### 7.9 Email templates

Update Supabase Auth → Email Templates manually:
- Confirm signup, reset password.
- Replace "Supabase" → "Adlance".
- Document procedure in `docs/email-templates.md`.

---

## 8. Testing Strategy

### 8.1 Foundation

Vitest 4 + jsdom + @testing-library/react. PATI baseline has 144 tests; feat branch expanded to ~3000+ test lines. Drop workspace tests; cherry-pick + adapt user-scoped tests.

### 8.2 Test categories

| Category | Files | Covers |
|---|---|---|
| Unit — crypto | `src/lib/__tests__/crypto.test.ts` | Round-trip encrypt/decrypt; tamper detection; malformed input; unicode; long strings |
| Unit — user-context | `src/lib/__tests__/user-context.test.ts` | `requireUser` returns 401/403; `handleApiError` mapping |
| Unit — key-provider | `src/lib/__tests__/key-provider.test.ts` | Cache hit/miss; missing key throws; multi-user isolation |
| API — user-api-keys | `src/app/api/__tests__/user-api-keys.test.ts` | PUT encrypts; GET returns masked; DELETE clears cache |
| API — user-concepts | `src/app/api/__tests__/user-concepts.test.ts` | CRUD + ownership check |
| API — auth/signup | `src/app/api/__tests__/auth-signup.test.ts` | Validation; duplicate email; trigger creates profile |
| API — existing routes | `brands.test.ts`, `brand-products.test.ts`, etc. | Adapt from feat: `mockWorkspaceContext` → `mockUserContext` |
| **Tenancy isolation (CRITICAL)** | `src/__tests__/user-isolation.test.ts` | 2 users: A's brand invisible to B; A spoofs B's userId → 403; saved-ads scoped; concepts return system + own custom only |
| RLS (DB-level) | `supabase/test/rls.sql` (manual) | Raw SQL with different `auth.uid()` contexts — defense in depth |

### 8.3 Test helpers (`src/lib/__tests__/test-helpers.ts`)

```ts
export async function setupTestUser(supabase, opts?): Promise<{ userId, email }>;
export async function setupTwoIsolatedUsers(supabase): Promise<[User, User]>;
export function mockUserContext(userId: string): NextRequest mock;
```

### 8.4 Manual E2E checklist (`docs/manual-qa-checklist.md`)

1. Anonymous → `/` landing renders.
2. Click "Try free" → `/signup` → submit → `/verify-pending`.
3. Click email verification link → `/verify` → `/login`.
4. Login → `/app/onboarding` (1-step BYOK).
5. Skip keys → `/app` dashboard with `MissingKeyBanner`.
6. Add brand → `/app/brands` → create → setup identity, kit, product.
7. Try generate without keys → friendly empty state with link to Settings.
8. Add Anthropic + Google + KIE keys in `/app/settings#api-keys`.
9. Generate ad → SSE stream → first ad.
10. Save to library → `/app/library` → ad appears.
11. Logout → log back in → keys still work (cache survives via DB).
12. Two browsers, two users — confirm isolation (user B can't see user A's brand).
13. Account delete → confirm cascade (brands + saved_ads + keys all gone).

### 8.5 Coverage goal

- ≥80% lines on `src/services/`, `src/lib/{user-context,key-provider,crypto}.ts`.
- 100% on user-isolation tests (no skip, no flake).
- API routes: happy path + 401 + 403 + 400 (validation) + 502 (provider error).

---

## 9. Implementation Phases

Six phases, ~50% effort vs Adlance original 8 phases (workspace primitive + invitations + admin UI dropped).

| Phase | Deliverables | Depends | Est. (focused solo dev) |
|---|---|---|---|
| **1. Foundation** | Branch setup; cherry-pick from feat (tailwind/globals/layout/branding/crypto/auth pages/Geist); copy 2 skill folders | — | 0.5d |
| **2. Schema + RLS** | 6 migrations (drop PATI / alter / create user tables / RLS / storage RLS / trigger); apply via MCP; manual isolation test on Studio | 1 | 1d |
| **3. Backend refactor** | `lib/user-context.ts` rewrite; `lib/key-provider.ts` rewrite; AI clients accept `userId`; CRUD services scope by `userId`; new routes (`/api/user-api-keys`, `/api/user-concepts`, `/api/auth/signup`, `/api/user/me`); modify all existing routes to call `requireUser` | 2 | 2–3d |
| **4. App routes restructure** | Move `/`, `/library`, `/brands`, `/concepts`, `/stealth-ads`, `/guide`, `/settings` → `/app/*`; update internal links + middleware | 3 | 0.5–1d |
| **5. New UI: Landing + BYOK** | `/` landing page (Hero + Bento + How + BYOK + CTA + Footer); `MissingKeyBanner`; `MissingKeyEmptyState`; rebuild Settings → API Keys card; adapt OnboardingWizard to 1-step BYOK | 4 + cherry-picked feat UI | 2–3d |
| **6. Polish + Docs + QA** | Test sweep (target 80% coverage); manual E2E checklist; `docs/email-templates.md`; rewrite `README.md`; security review | 5 | 1d |

**Total: ~7–9 days focused solo dev.**

---

## 10. Risks acknowledged

| Risk | Severity | Mitigation |
|---|---|---|
| BYOK signup friction | High | "Skip for now" in onboarding; "How to get this key" links; landing copy emphasises value before key entry |
| `ADLANCE_ENCRYPTION_KEY` leak | High | Document rotation procedure (decrypt-with-old + re-encrypt-with-new for all `user_api_keys` rows); rotate annually; never commit to git |
| Storage abuse (free tier) | Medium | No quota now; monitor Supabase storage cost; add soft limit if needed |
| Public signup spam/abuse | Medium | Rely on Supabase Auth rate limits + email verification; add hCaptcha if abused |
| Provider key invalid → user confusion | Medium | Clear error mapping (`invalid_api_key` → banner with provider link) per Section 5.6 |
| Cherry-pick from feat introduces workspace residue | Medium | Lint pass: grep for `workspace_id`, `workspace_members`, `useActiveWorkspace` in cherry-picked files; manual fix any leftover |
| Migration wipes PATI data on prod | Critical | Confirm with user one more time before `01_drop_pati_tables.sql`; offer dry-run on Supabase branch first |

---

## 11. Future considerations (not in scope, but documented)

- If usage grows → add quota tracking via `user_usage_log` table (storage MB, generations count).
- If teams demand → migrate to workspace primitive (~1 day: add `workspaces` table, INSERT 1-per-user, alter `brands.owner_user_id` → `workspace_id`, RLS rewrite).
- If SEO matters → add `/changelog`, `/about`, `/blog` (multi-page marketing).
- If conversion stalls → add `/pricing` page (even if free) per skill landing pattern.
- If account data export becomes legally required → add `/api/user/export` (GDPR Article 15).
- If usage analytics needed → add PostHog or Plausible (lightweight, privacy-respecting).

---

## End of Spec

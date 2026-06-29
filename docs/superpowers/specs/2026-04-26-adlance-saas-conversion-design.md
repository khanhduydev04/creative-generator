# Adlance — SaaS Conversion Design Spec

**Date:** 2026-04-26
**Author:** brainstorm session (operator + Claude)
**Status:** Approved (pending implementation plan)

---

## 1. Overview & Goals

Convert `static-ads-generator` from an internal PATI Group tool into **Adlance**, a multi-tenant SaaS for brand owners and solo marketers to generate static ads with AI.

**Tagline:** *Ad creation at the speed of thought.*

### Success criteria (measurable)

1. A stranger can: sign up with any email → create a workspace → enter 3 API keys → set up a brand → generate the first ad in under 15 minutes
2. Two different workspaces **cannot** see each other's data (verified via RLS test suite)
3. Zero references to "PATI", `@patigroup.com`, `@patiagency.com`, or the green `#17cf54` theme color in UI/copy/email
4. All existing functionality (concept ads, stealth, competitor reference, content adapt, library) continues to work
5. All AI calls use the active workspace's API keys (never read from env directly for AI providers)
6. All 144 existing tests pass + new tests for tenancy isolation pass

### Non-goals (out of scope)

- Stripe / billing / quota enforcement
- Marketing site (only minimal landing on `/login`)
- Email transactional beyond Supabase Auth defaults
- Public API
- Mobile app
- i18n / multi-language UI (output ads remain multi-language)

### Constraints

- Same Supabase project; fresh data wipe (drop PATI tables)
- Preserve system data: `concept_prompts` IP + hardcoded stealth scenes
- Tech stack unchanged: Next.js 16 + React 19 + Supabase + Claude / Gemini / KIE

---

## 2. Data Model

### Tables to DROP

- `clients` — hierarchy layer removed
- `app_settings` — replaced by per-workspace `workspace_api_keys`
- `activity_log` — replaced by per-workspace `workspace_activity_log`

### Tables to MODIFY

**`profiles`** — drop `role`, `department`, `is_active`, `last_login_at`; add:
```sql
ALTER TABLE profiles ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;
```

**`brands`** — drop `client_id`, add `workspace_id`:
```sql
ALTER TABLE brands DROP COLUMN client_id;
ALTER TABLE brands ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;
```

### Tables to CREATE

```sql
-- Top-level tenant
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many membership with role
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES profiles(id),
  PRIMARY KEY (workspace_id, user_id)
);

-- BYO API keys per workspace (encrypted)
CREATE TABLE workspace_api_keys (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('anthropic','google','kie','google_console')),
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id),
  PRIMARY KEY (workspace_id, provider)
);

-- Custom concepts per workspace (system concepts remain in concept_prompts)
CREATE TABLE workspace_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  reference_images TEXT[],
  requires_competitor BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pending invitations (token-based)
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-workspace audit log
CREATE TABLE workspace_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tables UNCHANGED (RLS update only)

`brand_kits`, `brand_products`, `product_markets`, `persona_profiles`, `brand_research_summaries`, `saved_ads`, `kie_task_results`, `stealth_scenes`, `concept_prompts` (system, read-only for users)

### RLS Strategy

**Helper function:**
```sql
CREATE FUNCTION auth.user_in_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;
```

**Policy patterns:**

- **Direct workspace tables** (workspaces, workspace_members, workspace_api_keys, workspace_concepts, workspace_invitations, workspace_activity_log): policies check `auth.user_in_workspace(workspace_id)`. Mutations additionally check role (owner/admin only).
- **Brand-scoped tables** (brand_kits, brand_products, persona_profiles, brand_research_summaries, saved_ads): RLS joins via `brands.workspace_id`:
  ```sql
  USING (EXISTS (
    SELECT 1 FROM brands b
    WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  ```
- **`concept_prompts`** (system): SELECT for any authenticated user; INSERT/UPDATE/DELETE only for `is_platform_admin`
- **`profiles`**: SELECT own row + members of shared workspaces; UPDATE only own row

### API Key Encryption

- App-level **AES-256-GCM** with master key `ADLANCE_ENCRYPTION_KEY` (32-byte hex) in env
- Helper: `src/lib/crypto.ts` — `encryptKey(plain) → encrypted`, `decryptKey(encrypted) → plain`
- Rationale: portability, no PG extension lock-in, easier rotation

### Storage Buckets

- Keep: `brand-assets`, `generated-ads`, `images`
- Drop: `campaign-inputs` (legacy unused)
- Path convention: `{workspace_id}/{brand_id}/{filename}`
- Storage RLS: parse workspace_id from path → check `auth.user_in_workspace()`

---

## 3. Auth & Tenancy Flow

### Public Signup Flow

```
1. /signup → form (email + password + full_name)
2. supabase.auth.signUp() → creates auth.users row
3. Trigger handle_new_user() → creates profiles row
4. Supabase sends verification email
5. User clicks link → /verify?token=... → email_confirmed_at = now()
6. Redirect /login → first login
7. Middleware: 0 workspaces → /onboarding
```

**Trigger:**
```sql
CREATE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Onboarding Wizard (3 steps)

**Step 1 — Create Workspace:** name input → auto-generate unique slug → INSERT workspace + INSERT workspace_member(role='owner') → set cookie.

**Step 2 — API Keys:** 3 inputs (Anthropic, Google AI Studio, KIE), each with "How to get this key" modal. Optional 4th: Google Console (for Sheets). "Skip for now" allowed; generate will fail with friendly message.

**Step 3 — First Brand (optional):** brand name + primary color. "Skip and explore" → main app empty state.

### Login Flow

```
/login → supabase.auth.signInWithPassword()
  ↓
Middleware loads workspaces:
  - 0 → /onboarding
  - 1 → set cookie → /
  - N → load last-used cookie or newest → /
```

### Active Workspace State

- **Cookie:** `adlance_active_workspace_id` (httpOnly: false, secure: true, sameSite: lax, max-age: 1 year)
- **Server-side:** read cookie → validate user is member → fallback to first workspace if invalid
- **Client-side (AppProvider):** `useActiveWorkspace()` hook exposes `{workspace, switchTo, workspaces[]}`
- **API routes:** call `requireWorkspaceAccess(req)` first to extract & validate workspace context

### Workspace Switcher (Header)

- Dropdown: workspace avatar + name + role badge
- List all workspaces user belongs to (sorted by last accessed)
- Footer action: "+ Create New Workspace" (modal, name input only)
- Click workspace → set cookie → `router.refresh()` to re-fetch data

### Member Invitation Flow

**Owner/Admin invite:**
- Settings → Members → "Invite member" button
- Modal: email + role (admin | member)
- Submit → INSERT workspace_invitations with random token, expires_at = now + 7 days
- Send email with link `/invite/[token]`

**Recipient flow:**
- Click link → /invite/[token] → server validates token (not expired, not accepted)
- Branch:
  - **No account** → /signup?invite=token → after verify → auto-accept invitation
  - **Account, logged in** → confirmation page → click accept → INSERT workspace_members + UPDATE invitations.accepted_at
  - **Account, logged out** → /login?invite=token → after login → auto-accept

**Permission rules:**
- Each workspace has exactly **one owner** (tracked by `workspaces.owner_user_id`; the owner is also in `workspace_members` with `role='owner'`, kept in sync atomically)
- INSERT workspace_invitations: owner/admin only
- DELETE workspace_members:
  - Owner can remove admin/member; **cannot remove self** unless ownership is transferred first
  - Admin can remove member (not owner, not other admins)
  - Member can only leave (remove self)
- Transfer ownership: owner picks a member → atomic transaction updates `workspaces.owner_user_id` AND swaps roles in `workspace_members` (current owner → admin, target → owner)
- Workspace deletion (owner only): hard delete with cascade; confirmation modal must require typing workspace name

### Password Reset

- /forgot-password → `supabase.auth.resetPasswordForEmail`
- /reset-password?token=... → form for new password

### Middleware Update

- **Public routes:** `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/invite/[token]`, `/verify`, `/verify-pending`
- **Auth gate:** not logged in → redirect /login
- **Email gate:** logged in but email not confirmed → /verify-pending
- **Onboarding gate:** logged in + 0 workspaces → /onboarding
- **Workspace gate:** logged in + workspace cookie invalid → reset cookie → continue

---

## 4. API Refactor Pattern

### New Helpers

**`src/lib/workspace-context.ts`:**
```ts
export async function requireWorkspaceAccess(
  req: NextRequest
): Promise<{ workspace: Workspace; userId: string; role: WorkspaceRole }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not authenticated");

  const wsId = req.cookies.get("adlance_active_workspace_id")?.value
    ?? req.headers.get("X-Workspace-Id");
  if (!wsId) throw new ApiError(400, "No active workspace");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("workspace_id", wsId)
    .eq("user_id", user.id)
    .single();
  if (!member) throw new ApiError(403, "Not a member of this workspace");

  return { workspace: member.workspaces, userId: user.id, role: member.role };
}

export function requireRole(role: WorkspaceRole, allowed: WorkspaceRole[]) {
  if (!allowed.includes(role)) throw new ApiError(403, "Insufficient role");
}
```

**`src/lib/key-provider.ts` (rewrite):**
```ts
export async function getWorkspaceApiKey(
  workspaceId: string,
  provider: ApiKeyProvider
): Promise<string> {
  const cached = keyCache.get(`${workspaceId}:${provider}`);
  if (cached && Date.now() - cached.at < 60_000) return cached.key;

  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_api_keys")
    .select("encrypted_key")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .single();
  if (!data) throw new MissingApiKeyError(provider);

  const key = decryptKey(data.encrypted_key);
  keyCache.set(`${workspaceId}:${provider}`, { key, at: Date.now() });
  return key;
}

export class MissingApiKeyError extends Error {
  constructor(public provider: string) {
    super(`Missing ${provider} API key — go to Settings → API Keys`);
  }
}
```

### AI Client Signature Update

All AI clients accept `workspaceId` as first parameter:

```ts
// Before
export async function claudeVisionAnalyze(prompt, imageData) {
  const apiKey = await requireApiKey("anthropic_api_key");
  const client = new Anthropic({ apiKey });
  // ...
}

// After
export async function claudeVisionAnalyze(workspaceId, prompt, imageData) {
  const apiKey = await getWorkspaceApiKey(workspaceId, "anthropic");
  const client = new Anthropic({ apiKey });
  // ...
}
```

Affected:
- `src/services/claudeClient.ts` — `claudeVisionAnalyze`, `claudeTextGenerate`
- `src/services/geminiClient.ts` — `geminiGenerate`
- `src/services/kieClient.ts` — `generateImage`

### Service Layer Pattern

CRUD services receive `workspaceId` in constructor:
```ts
const service = new BrandService(supabase, workspace.id);
const brands = await service.list();  // auto-scoped
```

All queries add `.eq("workspace_id", this.workspaceId)` or join via brands. RLS enforces at DB layer; service-level filter is defense in depth.

### API Route Pattern

```ts
export async function POST(req: NextRequest) {
  try {
    const { workspace, userId, role } = await requireWorkspaceAccess(req);
    // requireRole(role, ['owner', 'admin']);

    const supabase = await createClient();
    const service = new BrandService(supabase, workspace.id);
    const result = await service.create({ ... });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
```

### Routes to ADD

- `POST/GET /api/workspaces`
- `PATCH/DELETE /api/workspaces/[id]`
- `GET /api/workspaces/[id]/members`
- `POST /api/workspaces/[id]/invitations`
- `DELETE /api/workspaces/[id]/invitations/[invId]`
- `PATCH/DELETE /api/workspaces/[id]/members/[userId]`
- `GET /api/invite/[token]`
- `POST /api/invite/[token]/accept`
- `GET/PUT /api/workspace-api-keys`
- `GET/POST/PATCH/DELETE /api/workspace-concepts`

### Routes to MODIFY (workspace scoping)

`/api/brands`, `/api/brand-products/*`, `/api/brand-kit/*`, `/api/personas`, `/api/saved-ads`, `/api/product-markets/*`, `/api/brand-intelligence/*`, `/api/stealth/*`, `/api/generate-ads`, `/api/edit-ad`, `/api/save-ad`, `/api/content-adapt/*`, `/api/concepts` (read merges system + custom)

### Routes to REMOVE

- `/api/clients/*`
- `/api/admin/users/*`
- `/api/admin/settings/*`

### Routes UNCHANGED

`/api/google-fonts`, `/api/download-image`, `/api/auth/*`

---

## 5. Branding & Design System

### Branding Constants

**`src/lib/branding.ts`:**
```ts
export const BRANDING = {
  appName: "Adlance",
  appTagline: "Ad creation at the speed of thought",
  appDescription: "Generate on-brand static ads with AI in minutes",
  supportEmail: "support@adlance.com",
  domain: "adlance.com",
  logoLight: "/brand/logo-light.svg",
  logoDark: "/brand/logo-dark.svg",
  favicon: "/favicon.svg",
  socialPreview: "/brand/og-image.png",
} as const;
```

### PATI References to Purge

- `src/app/layout.tsx` — metadata
- `src/components/layout/DashboardLayout.tsx` — header, app name
- `src/app/login/page.tsx` — copy
- `src/features/guide/guide-data.ts` — guide content
- `package.json` — name field
- `README.md`, `docs/*` — basic update; full doc rewrite deferred
- `CLAUDE.md` — project description
- All `@patigroup.com` / `@patiagency.com` strings — remove email domain restriction
- Logo / favicon assets

### Color Palette (AI-tool style, dark mode default)

**Tailwind config:**
```ts
darkMode: "class",
theme: {
  extend: {
    colors: {
      background: {
        DEFAULT: "hsl(0 0% 4%)",
        subtle: "hsl(0 0% 7%)",
        muted: "hsl(0 0% 10%)",
        elevated: "hsl(0 0% 13%)",
      },
      foreground: {
        DEFAULT: "hsl(0 0% 98%)",
        muted: "hsl(0 0% 64%)",
        subtle: "hsl(0 0% 45%)",
      },
      border: {
        DEFAULT: "hsl(0 0% 15%)",
        subtle: "hsl(0 0% 12%)",
        strong: "hsl(0 0% 25%)",
      },
      accent: {
        DEFAULT: "hsl(263 85% 65%)",  // Violet #8b5cf6
        hover: "hsl(263 85% 70%)",
        subtle: "hsl(263 60% 25%)",
        muted: "hsl(263 30% 15%)",
        fg: "hsl(0 0% 100%)",
      },
      success: "hsl(142 70% 45%)",
      warning: "hsl(38 92% 55%)",
      danger: "hsl(0 72% 51%)",
    },
    fontFamily: {
      sans: ["var(--font-geist-sans)", "Inter", "system-ui"],
      mono: ["var(--font-geist-mono)", "monospace"],
    },
    borderRadius: {
      DEFAULT: "8px",
      lg: "12px",
      xl: "16px",
    },
  },
},
```

**Accent: Violet `#8b5cf6`** (Anthropic/Claude-aligned, AI-native vibe).

### Typography

- Sans: **Geist Sans** via `next/font/google`
- Mono: **Geist Mono** for code/prompt display
- Weights: 400 / 500 / 600 / 700
- Tracking: `-0.02em` for headings, normal for body

### shadcn/ui Theme

- Update `globals.css` CSS variables (HSL format per shadcn convention)
- Refactor components by swapping CSS variables; no component code changes needed
- Default theme: dark (light mode toggle deferred)

### Hardcoded Color Replacement

Mass search-replace `#17cf54`, `bg-[#17cf54]`, `text-[#17cf54]`, etc. → `bg-accent`, `text-accent`, etc.

### Logo / Favicon

- Create placeholder SVG: wordmark "Adlance" with accent color
- New files: `public/brand/logo-light.svg`, `logo-dark.svg`, `public/favicon.svg`
- Delete: `public/logo.png`, `public/favicon.jpg`

### Email Templates

Update Supabase Auth → Email Templates manually via dashboard:
- Confirm signup, reset password, magic link, invite
- Replace "Supabase" → "Adlance"; use violet brand color
- Document procedure in `docs/email-templates.md`

---

## 6. UI/UX Changes

### App Shell

**Header (sticky top):** `[Adlance logo] [Workspace Switcher ▾]   [Search ⌘K] [User ▾]`

**Sidebar (left, ~220px, collapsible):**
- ✦ Generate → `/`
- ✦ Stealth Ads → `/stealth-ads`
- ✦ Library → `/library`
- ─────────
- 🎨 Brands → `/brands`
- 💡 Concepts → `/concepts`
- ─────────
- ⚙ Settings → `/settings`
- 📖 Guide → `/guide`

### Page Inventory

| Route | Status | Notes |
|---|---|---|
| `/` | Restyle | Generate ads (existing logic) |
| `/stealth-ads` | Restyle | Stealth (existing logic) |
| `/library` | Restyle | Saved ads |
| `/brands` | **NEW** | List view (grid of brands) |
| `/brands/[id]` | Refactor from `/brand-setup` | Tabs: Identity / Kit / Products / Personas / Research |
| `/concepts` | Restyle | Tabs: System (read-only) / My Workspace (CRUD, owner/admin) |
| `/settings` | **NEW** | Tabs: General / Members / API Keys / Activity |
| `/account` | **NEW** | Profile, change password |
| `/admin` | **NEW** | Platform admin only — workspaces overview + system concepts CRUD |
| `/onboarding` | **NEW** | 3-step wizard |
| `/login` | Restyle | Centered card + marketing copy |
| `/signup` | **NEW** | Centered card |
| `/forgot-password` | Restyle | Existing logic |
| `/reset-password` | Restyle | Existing logic |
| `/invite/[token]` | **NEW** | 3 branches (no account / logged in / logged out) |
| `/verify-pending` | **NEW** | Check email message + resend |
| `/guide` | Restyle | Update content for SaaS context |

### Components to REMOVE

- `NewClientModal`, `RenameClientModal`, `DeleteClientModal`
- `AdminUsersClient`, `CreateUserDialog`, `UserActionsMenu`
- `ApiKeysClient` (admin version)
- `ActivityLog` (admin version)

### Components to ADD

- `WorkspaceSwitcher`, `CreateWorkspaceModal`, `InviteMemberModal`
- `MembersList`, `WorkspaceApiKeysForm`
- `OnboardingWizard` (3-step container)
- `BrandsListPage`, `EmptyState`
- `Sidebar`, `AppShell`, `UserMenu`

### Components to RESTYLE (logic unchanged)

`BrandSetupForm`, `BrandProductSection`, `AdCopySection`, `ConceptSection`, `TargetAudienceSection`, `MarketSection`, `LanguageSection`, `OutputVolumeSection`, `GenerateProgress`, `LibraryView`, `StealthView`, etc. — swap Tailwind classes only.

### Permissions Matrix (Settings)

| Tab | Owner | Admin | Member |
|---|---|---|---|
| General | RW + danger zone | R | R |
| Members | RW | RW (no role change) | R |
| API Keys | RW | RW | R (masked) |
| Activity | R | R | R |

### Responsive

Desktop-first. Mobile: sidebar collapses to hamburger, forms stack vertically. Mobile is optional polish.

---

## 7. Implementation Phases (sequenced)

8 phases following Approach 3 (Foundation First).

### Phase 1 — Schema Migration & Encryption Foundation

**Deliverables:**
- Migration SQL: drop/alter/create tables per Section 2
- RLS policies + helper function `auth.user_in_workspace()`
- Storage bucket policies (path-based)
- `src/lib/crypto.ts` — AES-256-GCM helpers + `ADLANCE_ENCRYPTION_KEY` env validation
- Trigger `handle_new_user()`
- Re-seed system `concept_prompts` (8-10 prompts)

**Dependencies:** None

**Verification:**
- Manual SQL: 2 users → 2 workspaces → 2 brands → query isolation confirmed
- Encrypt/decrypt round-trip test
- Trigger creates profile row on auth.users insert

---

### Phase 2 — Auth & Tenancy Core (Backend)

**Deliverables:**
- Refactor `src/middleware.ts` (public routes, auth/email/onboarding/workspace gates)
- `src/lib/workspace-context.ts` (helpers per Section 4)
- API routes: workspaces CRUD, members, invitations, accept-invite
- Services: `workspaceService`, `workspaceMemberService`, `workspaceInvitationService`
- API tests for membership flows

**Dependencies:** Phase 1

**Verification:**
- Vitest: signup → tạo workspace → invite → accept → membership exists
- Tenancy isolation: user A cannot see workspace B

---

### Phase 3 — Service Layer Refactor

**Deliverables:**
- `src/lib/key-provider.ts` rewrite — `getWorkspaceApiKey(workspaceId, provider)`
- AI clients accept `workspaceId` (claude, gemini, kie)
- All CRUD services scope by workspace
- Add `WorkspaceConceptService`, `WorkspaceApiKeysService`
- All API routes call `requireWorkspaceAccess` first
- Routes modified: brands, brand-products, brand-kit, personas, saved-ads, product-markets, brand-intelligence, stealth, generate-ads, edit-ad, save-ad, content-adapt, concepts (system + custom merge)
- Routes removed: /api/clients/*, /api/admin/users/*, /api/admin/settings/*

**Dependencies:** Phase 1, 2

**Verification:**
- 144 existing tests pass (with workspace mocks added)
- New tests: missing API key error, tenant isolation, custom vs system concepts

---

### Phase 4 — Theme Refactor (Tailwind + shadcn)

**Deliverables:**
- `tailwind.config.ts` rewrite (palette, fonts, radius)
- `src/app/globals.css` CSS variables; `dark` class on `<html>` default
- `src/app/layout.tsx` Geist font via `next/font/google`
- shadcn/ui components restyled via CSS variables (no component code changes)
- Search-replace hardcoded `#17cf54` → `bg-accent`, etc.

**Dependencies:** May parallel with Phase 3

**Verification:**
- `grep -r "#17cf54" src/` returns 0
- Visual review: all pages render with new theme + dark mode + Geist font

---

### Phase 5 — Rebrand (Search-Replace)

**Deliverables:**
- `src/lib/branding.ts` — BRANDING constant
- Replace "PATI Group", "PATI", "Static Ads Generator", "patigroup.com", "patiagency.com" everywhere
- `package.json` name = "adlance", description update
- `src/app/layout.tsx` metadata from BRANDING
- New logo/favicon SVGs in `public/brand/`
- Delete `public/logo.png`, `public/favicon.jpg`
- `CLAUDE.md` update
- `docs/email-templates.md` instructions

**Dependencies:** May parallel with Phase 3, 4

**Verification:**
- `grep -ri "pati" src/ public/ package.json` returns 0
- Browser tab title "Adlance"
- Login page shows "Adlance" + tagline

---

### Phase 6 — UI Shell & Workspace Switcher

**Deliverables:**
- `AppShell.tsx`, `Sidebar.tsx`, `WorkspaceSwitcher.tsx`, `UserMenu.tsx`, `CreateWorkspaceModal.tsx`
- Refactor `AppProvider` to expose active workspace context
- Update all pages to use `AppShell`
- Delete obsolete: `DashboardLayout`, `NewClientModal`, `RenameClientModal`, `DeleteClientModal`

**Dependencies:** Phase 2, 3, 4, 5

**Verification:**
- Switch workspace via switcher → data refreshes
- Create new workspace from switcher → auto-switch to it

---

### Phase 7 — Settings, Onboarding, Auth Pages

**Deliverables:**
- `/settings` with tabs: General, Members, API Keys, Activity
- `/account` profile + change password
- `/admin` for platform admin
- `/signup` page
- `/onboarding` 3-step wizard
- `/verify-pending`
- `/invite/[token]` with 3 branches
- Restyle `/login`, `/forgot-password`, `/reset-password`
- `EmptyState` component for brands/library/custom-concepts
- `InviteMemberModal`

**Dependencies:** Phase 6

**Verification:**
- E2E manual: signup → verify → onboarding → brand → first ad
- Permission test: member sees API Keys masked, no edit

---

### Phase 8 — Cleanup & Polish

**Deliverables:**
- Delete obsolete pages: `/admin/users`, `/admin/settings` (old)
- Delete obsolete components per Section 6
- Update `/guide` content for SaaS
- Rewrite `README.md` (basic structure)
- Note outdated `docs/*.md` files
- Test sweep: 144+ tests pass
- TypeScript check clean
- `npm run build` success

**Dependencies:** Phase 1-7

**Verification:**
- `npm run build && npm test && npx tsc --noEmit` pass
- Manual smoke test: full signup-to-ad flow + invite member
- `grep -ri "pati\|client_id\|app_settings" src/` cleanup confirmed

---

### Estimated Effort

| Phase | Complexity | Time (solo dev, focused) |
|---|---|---|
| 1. Schema + Encryption | High | 1-2 days |
| 2. Auth + Tenancy core | High | 2-3 days |
| 3. Service refactor | High | 3-4 days |
| 4. Theme refactor | Medium | 1 day |
| 5. Rebrand | Low | 0.5 day |
| 6. UI Shell | Medium | 2 days |
| 7. Settings + Onboarding | High | 3-4 days |
| 8. Cleanup | Low | 1 day |
| **Total** | | **~14-18 days** |

---

## 8. Out of Scope

### Not building

- Stripe / Payment / Billing
- Quota enforcement / Rate limiting
- Usage tracking / Analytics dashboard
- Marketing site (`/landing`, `/pricing`, `/about`, blog) — only `/login` with marketing copy
- Custom domain / White-label
- Public API
- Webhooks (outgoing)
- Mobile app
- i18n / Multi-language UI
- SSO / SAML / OAuth providers (Google, GitHub login) — email + password only
- 2FA / MFA
- Audit log advanced UI (only basic list)
- Workspace-level branding/customization
- Light mode toggle (dark default; light deferred)
- Email notifications beyond Supabase Auth defaults
- Onboarding tour beyond 3-step wizard
- Search ⌘K functionality (UI mock only)
- Workspace soft delete / grace period (hard delete with confirmation)
- PATI data migration tool
- Full documentation rewrite (only basic README)

### Deferred to future iterations

- Stripe + free/pro tier
- Per-workspace logo/branding
- Light mode toggle
- Google OAuth login
- Workspace activity log advanced UI
- Marketing site + pricing page
- Public docs site
- Mobile app
- Search ⌘K functional

### Risks (acknowledged)

- ⚠️ **BYO keys = signup friction** — mitigation: clear "How to get this key" links + "Skip for now" option
- ⚠️ **Encryption key rotation** — if `ADLANCE_ENCRYPTION_KEY` leaks → all workspace keys leak. Document rotation procedure (re-encrypt all rows with new key)
- ⚠️ **No quota = potential storage abuse** — Supabase storage cost for saved ads images. Monitor; soft limit may be needed later
- ⚠️ **Refactor risk** — 8 phases, ~2 weeks, many files touched. Mitigation: keep 144 existing tests passing throughout Phase 3

---

## 9. Testing Strategy

### Existing Foundation

- Vitest 4 + jsdom + @testing-library/react
- 144 tests in `src/app/api/__tests__/`
- After refactor: `clients.test.ts` removed; others updated for workspace context

### Test Categories to Add

**1. Unit tests — New helpers**
- `crypto.test.ts` — encrypt/decrypt round-trip, wrong key fails, malformed ciphertext throws
- `workspace-context.test.ts` — `requireWorkspaceAccess` returns 401/403/400 correctly, `requireRole` enforces
- `key-provider.test.ts` — cache hit/miss, missing key throws `MissingApiKeyError`

**2. API tests — New routes**
- `workspaces.test.ts` — CRUD with permission checks
- `workspace-members.test.ts` — invite, accept, role change, leave
- `workspace-invitations.test.ts` — token validation, expiry, accept flow
- `workspace-api-keys.test.ts` — write encrypts, read returns masked
- `workspace-concepts.test.ts` — CRUD with permission checks

**3. Tenancy isolation tests (CRITICAL)**

`tenancy-isolation.test.ts`:
- 2 users in 2 different workspaces
- User A creates brand → user B context returns empty
- User B cannot read user A's API keys
- User B GET /api/saved-ads sees no W1 ads
- User B GET /api/concepts sees system + own custom only
- User A spoofs cookie to W2 → 403

**4. RLS tests (database-level)**

`rls-policies.test.ts` — raw SQL with different `auth.uid()` contexts (defense in depth beyond service-layer filter)

**5. Refactor tests — Existing routes**

Update with `mockWorkspaceContext(userId, workspaceId, role)` helper; verify pass with workspace-scoped behavior.

**6. Auth flow tests**

- `signup.test.ts` — validation, duplicate email
- `signup-trigger.test.ts` — trigger creates profile
- `onboarding.test.ts` — workspace + keys + first brand
- `invitation-flow.test.ts` — full e2e

### Test Helpers

`src/lib/__tests__/test-helpers.ts`:
```ts
export async function setupTestWorkspace(supabase, opts?);
export async function setupTwoIsolatedWorkspaces(supabase);
export function mockWorkspaceContext(userId, workspaceId, role = 'owner');
```

### Manual E2E Checklist

Document in `docs/manual-qa-checklist.md`:

1. ☐ Anonymous → /login → Sign up link → /signup
2. ☐ Signup with valid email → check email → click verify → /verify-pending → /login
3. ☐ Login → 0 workspaces → /onboarding step 1
4. ☐ Onboarding step 1: enter "My Workspace" → step 2
5. ☐ Onboarding step 2: enter 3 API keys → step 3
6. ☐ Onboarding step 3: skip → / (empty state, "Create your first brand")
7. ☐ /brands → Create brand → /brands/[id] (brand setup)
8. ☐ Setup brand identity, kit, add product → save
9. ☐ / → select product → fill form → Generate → SSE stream → first ad
10. ☐ Click "Save" on ad → /library → ad appears
11. ☐ /settings → Members → Invite team@test.com as Member → email sent
12. ☐ Open invite link in incognito → signup → auto-joined
13. ☐ Invited user login → /settings → Members tab visible (read-only)
14. ☐ /settings → API Keys → invited user (member) sees masked, no edit
15. ☐ Owner /settings → Danger zone → Delete workspace → cascade clean

### Coverage Goal

- Lines: ≥80% on `src/services/`, `workspace-context.ts`, `key-provider.ts`, `crypto.ts`
- 100% on tenancy-isolation tests (no skip, no flaky)
- API routes: happy path + 401 + 403 + validation errors

### CI

GitHub Actions setup deferred. Manual: run `npm test && npm run build` before each commit.

---

## End of Spec

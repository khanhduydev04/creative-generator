# Adlance Phase 1 — Schema Migration & Encryption Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PATI internal-tool schema with the multi-tenant Adlance schema (workspaces + members + per-workspace API keys + custom concepts + invitations + activity log), add app-level AES-256-GCM encryption helpers, attach RLS policies that isolate workspaces from each other, set up the auto-create-profile trigger, and re-seed system concepts.

**Architecture:** Supabase PostgreSQL hosts all tenant data. Workspace membership is the single source of truth for tenant access (`auth.user_in_workspace(ws_id)` helper). API keys are stored encrypted at rest in `workspace_api_keys` and decrypted on demand by `src/lib/crypto.ts` using a master key from env. Existing brand-scoped tables (`brand_kits`, `brand_products`, etc.) gain new RLS policies that traverse `brands.workspace_id` to enforce isolation. System data (`concept_prompts`, hardcoded stealth scenes) is preserved/re-seeded.

**Tech Stack:** Supabase (PostgreSQL + Auth + Storage), Node 20+ `crypto` module (AES-256-GCM), TypeScript 5, Vitest 4.

**Spec reference:** `docs/superpowers/specs/2026-04-26-adlance-saas-conversion-design.md` Section 2 (Data Model) + Section 7 (Phase 1 Deliverables).

---

## ⚠️ Pre-flight WARNING (read before Task 1)

This phase **drops PATI tables and wipes their data**. The user explicitly approved this in spec Section 1 ("Same Supabase project, fresh data wipe"). However, before applying migrations:

1. Verify the user is on a **feature branch** (not main) so they can roll back the codebase if needed
2. Verify the user has noted any data they want to keep externally (this plan re-seeds `concept_prompts` from current DB state, but does NOT preserve brands, products, saved_ads, etc.)
3. The migration is **irreversible at the data level** — once dropped, PATI brands/products/saved_ads are gone

If the user is uncertain, STOP and confirm before running Task 4 (the first destructive migration).

---

## File Structure

**Files to CREATE:**
- `src/lib/crypto.ts` — AES-256-GCM `encryptKey` / `decryptKey` helpers
- `src/lib/__tests__/crypto.test.ts` — round-trip + tamper tests
- `supabase/migration_adlance_drop_alter.sql` — drop obsolete tables, alter `profiles` and `brands`
- `supabase/migration_adlance_create_tables.sql` — create 6 new workspace tables
- `supabase/migration_adlance_rls_policies.sql` — helper function + RLS policies for all tables
- `supabase/migration_adlance_storage_rls.sql` — storage bucket path-based RLS
- `supabase/migration_adlance_trigger_handle_new_user.sql` — auto-create profile on signup
- `supabase/migration_adlance_seed_system_concepts.sql` — re-seed `concept_prompts` from preserved data
- `docs/adlance-tenancy-isolation-test.sql` — manual SQL test for verification

**Files to MODIFY:**
- `src/lib/env.ts` — add `ADLANCE_ENCRYPTION_KEY` to schema (required, server-only)
- `.env.local` — add `ADLANCE_ENCRYPTION_KEY=<64-char hex>` (user's local file, not committed)
- `.env.local.template` (recreate from git history if missing) — document `ADLANCE_ENCRYPTION_KEY`

**Files NOT touched in Phase 1** (deferred to later phases):
- Any `src/services/*.ts` (Phase 3)
- Any `src/app/api/**/route.ts` (Phase 3)
- Any UI files (Phases 4-7)
- `src/lib/key-provider.ts` (Phase 3 — will be rewritten then)

---

## Task 1: Set up encryption master key in environment

**Files:**
- Modify: `.env.local` (user's local, not committed)
- Recreate: `.env.local.template` (committed; was deleted in working tree)

**Why:** The crypto helper (Task 2) requires `ADLANCE_ENCRYPTION_KEY` to be present in env when imported. We need this key generated and recorded BEFORE writing crypto code so the test can run.

- [ ] **Step 1: Generate a 32-byte (256-bit) encryption key as 64-character hex**

Run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Expected output: 64 hex characters, e.g. `7f3a9c2e5b1d4f8a6c9e1b3d5f7a9c2e4b6d8f1a3c5e7b9d1f3a5c7e9b1d3f5a`

- [ ] **Step 2: Append the key to `.env.local`** (or create the file if missing)

Add this line (substitute the actual hex from Step 1):
```
ADLANCE_ENCRYPTION_KEY=7f3a9c2e5b1d4f8a6c9e1b3d5f7a9c2e4b6d8f1a3c5e7b9d1f3a5c7e9b1d3f5a
```

- [ ] **Step 3: Recreate `.env.local.template`** documenting all required env vars (the file was deleted in working tree per git status)

Create `.env.local.template`:
```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# AI providers — Phase 3 will move these to per-workspace storage.
# For now, keep these for backward compat during refactor.
GOOGLE_API_KEY=AIza...
KIE_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
GOOGLE_CONSOLE_API_KEY=AIza...
SPREADSHEET_ID=1abc...

# Adlance encryption master key (required, Phase 1+)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# DO NOT commit the actual value. DO NOT change this in production without
# re-encrypting all rows in workspace_api_keys (key rotation procedure).
ADLANCE_ENCRYPTION_KEY=
```

- [ ] **Step 4: Commit the template (NOT the .env.local with the real key)**

```bash
git add .env.local.template
git commit -m "chore(config): restore env template with ADLANCE_ENCRYPTION_KEY"
```

Expected: Single commit, working tree clean for `.env.local.template`. The actual `.env.local` remains uncommitted (gitignored).

---

## Task 2: Implement crypto.ts with TDD

**Files:**
- Test: `src/lib/__tests__/crypto.test.ts`
- Create: `src/lib/crypto.ts`

**Why:** All API key storage depends on this module. TDD ensures we get the encrypt/decrypt round-trip + tamper detection right before any other code depends on it.

- [ ] **Step 1: Write the failing test file**

Create `src/lib/__tests__/crypto.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { encryptKey, decryptKey, CryptoError } from "../crypto";

beforeAll(() => {
  // Vitest reads .env.local automatically; ADLANCE_ENCRYPTION_KEY must be set.
  if (!process.env.ADLANCE_ENCRYPTION_KEY) {
    throw new Error("ADLANCE_ENCRYPTION_KEY missing in test env");
  }
});

describe("crypto", () => {
  it("encrypts then decrypts a string round-trip", () => {
    const plaintext = "sk-ant-api03-abc123-XYZ";
    const cipher = encryptKey(plaintext);
    expect(cipher).not.toEqual(plaintext);
    expect(decryptKey(cipher)).toEqual(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "sk-ant-api03-same";
    const c1 = encryptKey(plaintext);
    const c2 = encryptKey(plaintext);
    expect(c1).not.toEqual(c2);
    expect(decryptKey(c1)).toEqual(plaintext);
    expect(decryptKey(c2)).toEqual(plaintext);
  });

  it("throws CryptoError on tampered ciphertext", () => {
    const cipher = encryptKey("secret");
    // Flip one character in the middle (auth tag region)
    const tampered = cipher.slice(0, -4) + "0000";
    expect(() => decryptKey(tampered)).toThrow(CryptoError);
  });

  it("throws CryptoError on malformed ciphertext", () => {
    expect(() => decryptKey("not-valid-base64!@#")).toThrow(CryptoError);
    expect(() => decryptKey("")).toThrow(CryptoError);
  });

  it("handles unicode and long strings", () => {
    const plaintext = "🔑 emoji + " + "a".repeat(1000);
    expect(decryptKey(encryptKey(plaintext))).toEqual(plaintext);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (module not found)**

Run:
```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```
Expected: FAIL with "Cannot find module '../crypto'" or similar.

- [ ] **Step 3: Implement `src/lib/crypto.ts`**

Create `src/lib/crypto.ts`:
```ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;        // 96 bits, recommended for GCM
const AUTH_TAG_LENGTH = 16;  // 128 bits, default GCM tag size

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

function getKey(): Buffer {
  const hex = process.env.ADLANCE_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new CryptoError(
      "ADLANCE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Output format (base64): iv (12B) || authTag (16B) || ciphertext
 */
export function encryptKey(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt ciphertext produced by encryptKey().
 * Throws CryptoError on tamper, wrong key, or malformed input.
 */
export function decryptKey(cipherB64: string): string {
  let buf: Buffer;
  try {
    buf = Buffer.from(cipherB64, "base64");
  } catch {
    throw new CryptoError("Invalid base64 ciphertext");
  }
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new CryptoError("Ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (e) {
    throw new CryptoError(`Decryption failed: ${e instanceof Error ? e.message : "unknown"}`);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/lib/__tests__/crypto.test.ts
```
Expected: 5/5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto.ts src/lib/__tests__/crypto.test.ts
git commit -m "feat(lib): add AES-256-GCM crypto helpers for workspace API keys"
```

---

## Task 3: Add ADLANCE_ENCRYPTION_KEY to env validation

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/__tests__/env.test.ts` (add test case)

- [ ] **Step 1: Read current env test to understand the pattern**

Run:
```bash
cat src/lib/__tests__/env.test.ts
```
(Just read; do not edit yet.)

- [ ] **Step 2: Add a failing test for ADLANCE_ENCRYPTION_KEY validation**

Add this test to `src/lib/__tests__/env.test.ts` (append to the existing describe block; if the test file uses a different pattern, mirror that pattern):
```ts
it("throws when ADLANCE_ENCRYPTION_KEY is missing", () => {
  const originalKey = process.env.ADLANCE_ENCRYPTION_KEY;
  delete process.env.ADLANCE_ENCRYPTION_KEY;
  try {
    expect(() => validateEnv()).toThrow(/ADLANCE_ENCRYPTION_KEY/);
  } finally {
    if (originalKey) process.env.ADLANCE_ENCRYPTION_KEY = originalKey;
  }
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
npx vitest run src/lib/__tests__/env.test.ts
```
Expected: New test FAILS (validateEnv does not yet check ADLANCE_ENCRYPTION_KEY).

- [ ] **Step 4: Add ADLANCE_ENCRYPTION_KEY entry to ENV_SCHEMA in src/lib/env.ts**

In `src/lib/env.ts`, add this entry to the `ENV_SCHEMA` array (place it after `KIE_API_KEY` block):
```ts
  {
    name: "ADLANCE_ENCRYPTION_KEY",
    required: true,
    isPublic: false,
    description: "Master key (64-char hex / 32 bytes) for AES-256-GCM encryption of per-workspace API keys",
  },
```

- [ ] **Step 5: Run all env tests to verify they pass**

Run:
```bash
npx vitest run src/lib/__tests__/env.test.ts
```
Expected: All env tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts
git commit -m "chore(config): require ADLANCE_ENCRYPTION_KEY in env validation"
```

---

## Task 4: Drop obsolete PATI tables + alter profiles/brands

**Files:**
- Create: `supabase/migration_adlance_drop_alter.sql`

**Why:** This is the first destructive migration. It removes the `clients` hierarchy layer, drops the global `app_settings` and `activity_log` (replaced by per-workspace equivalents), strips the global role columns from `profiles`, and detaches `brands` from `clients` to attach to `workspaces` later.

⚠️ **IRREVERSIBLE.** Confirm with the user before running Step 3.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migration_adlance_drop_alter.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — Drop obsolete PATI tables + alter existing
-- ============================================================================
-- This migration is destructive. PATI clients/brands/products/saved_ads data
-- will be lost. System data (concept_prompts, stealth_scenes) is preserved.
-- ============================================================================

BEGIN;

-- Drop tables that have FKs into the ones we're about to alter, in order.
-- (saved_ads references brands; deleting brands cascades to product_markets,
-- brand_kits, brand_products, persona_profiles, brand_research_summaries.)

-- 1. Drop obsolete top-level tables ------------------------------------------
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;

-- 2. Wipe brand-scoped data (brands cascade-deletes children) ----------------
-- We DELETE rather than DROP because the schema is reused in Task 6.
DELETE FROM public.saved_ads;
DELETE FROM public.kie_task_results;
DELETE FROM public.brand_research_summaries;
DELETE FROM public.persona_profiles;
DELETE FROM public.product_markets;
DELETE FROM public.brand_products;
DELETE FROM public.brand_kits;
DELETE FROM public.brands;

-- 3. Drop clients table ------------------------------------------------------
DROP TABLE IF EXISTS public.clients CASCADE;

-- 4. Alter profiles ----------------------------------------------------------
-- Remove global role/department columns; add platform admin flag.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS department;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- Wipe profiles (PATI users). The corresponding auth.users entries are
-- preserved here — old PATI users will be locked out of the app since they
-- have no profile rows, but their auth records remain. To fully clear them,
-- the operator must delete them via Supabase Studio → Auth → Users
-- (post-migration manual step; see Task 4 Step 6).
DELETE FROM public.profiles;

-- 5. Alter brands ------------------------------------------------------------
ALTER TABLE public.brands DROP COLUMN IF EXISTS client_id;
-- workspace_id will be added in Task 5 (after workspaces table is created).

COMMIT;
```

- [ ] **Step 2: Confirm with the user before applying**

This is the first destructive step. Ask the user:

> "About to apply `migration_adlance_drop_alter.sql` which will DROP `clients`, `app_settings`, `activity_log`, wipe all PATI brands/products/saved_ads/users, and remove role columns from `profiles`. This is irreversible. Confirm to proceed?"

Do NOT run Step 3 without explicit user confirmation.

- [ ] **Step 3: Apply the migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with:
- name: `adlance_drop_alter`
- query: (the full SQL contents of `supabase/migration_adlance_drop_alter.sql`)

Expected: success response from MCP. If the project ref is not set in MCP context, fall back to running the SQL via `mcp__supabase__execute_sql` in a single transaction, or ask the user to apply via Supabase Studio SQL editor.

- [ ] **Step 4: Verify drops + alters via Supabase MCP**

Use `mcp__supabase__execute_sql` to run:
```sql
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='clients') AS clients_exists,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='app_settings') AS app_settings_exists,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='activity_log') AS activity_log_exists,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role') AS profiles_role,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='is_platform_admin') AS profiles_admin,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='brands' AND column_name='client_id') AS brands_clientid;
```
Expected: `clients_exists=0, app_settings_exists=0, activity_log_exists=0, profiles_role=0, profiles_admin=1, brands_clientid=0`.

- [ ] **Step 5: Commit the migration file**

```bash
git add supabase/migration_adlance_drop_alter.sql
git commit -m "feat(db): drop obsolete PATI tables and alter profiles/brands"
```

- [ ] **Step 6: Post-migration cleanup — manually delete PATI auth users**

In Supabase Studio → Authentication → Users, delete all existing PATI users (`*@patigroup.com`, `*@patiagency.com`, etc.). This is non-blocking but required before declaring Phase 1 fully done — orphaned auth users (without profile rows) will cause confusion if they try to log in.

This step is performed by the user via the dashboard, NOT via SQL/MCP, to avoid permission issues with the auth schema.

---

## Task 5: Create new workspace tables

**Files:**
- Create: `supabase/migration_adlance_create_tables.sql`

**Why:** Sets up the 6 core tables that define the multi-tenant model: workspaces, members, API keys, custom concepts, invitations, activity log. Also adds the `workspace_id` FK to `brands`.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migration_adlance_create_tables.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — Create workspace tables
-- ============================================================================
-- Defines the multi-tenant primitives. Run AFTER migration_adlance_drop_alter.
-- ============================================================================

BEGIN;

-- 1. workspaces --------------------------------------------------------------
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$')
);
CREATE INDEX workspaces_owner_idx ON public.workspaces(owner_user_id);

-- 2. workspace_members -------------------------------------------------------
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX workspace_members_user_idx ON public.workspace_members(user_id);

-- 3. workspace_api_keys (encrypted at rest) ----------------------------------
CREATE TABLE public.workspace_api_keys (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic','google','kie','google_console')),
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (workspace_id, provider)
);

-- 4. workspace_concepts (custom user concepts; system concepts stay in concept_prompts)
CREATE TABLE public.workspace_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  requires_competitor BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workspace_concepts_workspace_idx ON public.workspace_concepts(workspace_id);

-- 5. workspace_invitations ---------------------------------------------------
CREATE TABLE public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workspace_invitations_workspace_idx ON public.workspace_invitations(workspace_id);
CREATE INDEX workspace_invitations_email_idx ON public.workspace_invitations(email);

-- 6. workspace_activity_log --------------------------------------------------
CREATE TABLE public.workspace_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workspace_activity_log_workspace_idx ON public.workspace_activity_log(workspace_id, created_at DESC);

-- 7. Attach brands to workspaces ---------------------------------------------
ALTER TABLE public.brands
  ADD COLUMN workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE;
CREATE INDEX brands_workspace_idx ON public.brands(workspace_id);

-- 8. updated_at auto-update trigger (reusable) -------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workspace_concepts_set_updated_at
  BEFORE UPDATE ON public.workspace_concepts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with:
- name: `adlance_create_tables`
- query: (full SQL above)

- [ ] **Step 3: Verify all 6 new tables exist + brands has workspace_id**

Use `mcp__supabase__execute_sql`:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'workspaces','workspace_members','workspace_api_keys',
    'workspace_concepts','workspace_invitations','workspace_activity_log'
  )
ORDER BY table_name;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='brands' AND column_name='workspace_id';
```
Expected: 6 rows for tables; brands.workspace_id exists, type uuid, NOT NULL.

- [ ] **Step 4: Commit**

```bash
git add supabase/migration_adlance_create_tables.sql
git commit -m "feat(db): create workspace tables for multi-tenant model"
```

---

## Task 6: RLS helper function + policies for all tables

**Files:**
- Create: `supabase/migration_adlance_rls_policies.sql`

**Why:** RLS is the security boundary. The `auth.user_in_workspace()` helper makes policies readable; without it, every policy would inline a sub-query.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migration_adlance_rls_policies.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — RLS policies
-- ============================================================================
-- Helper function + policies for all tables. Apply AFTER create_tables.
-- ============================================================================

BEGIN;

-- Helper: is the current auth user a member of the given workspace?
CREATE OR REPLACE FUNCTION auth.user_in_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

-- Helper: is the current auth user owner/admin of the given workspace?
CREATE OR REPLACE FUNCTION auth.user_workspace_role(ws_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid();
$$;

-- Helper: is the current auth user a platform admin?
CREATE OR REPLACE FUNCTION auth.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================================================
-- profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
    OR auth.is_platform_admin()
  );

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND is_platform_admin = (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()));
  -- Users cannot self-promote to platform admin.

-- ============================================================================
-- workspaces
-- ============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT USING (auth.user_in_workspace(id) OR auth.is_platform_admin());

DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid() OR auth.is_platform_admin());

DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;
CREATE POLICY workspaces_delete ON public.workspaces
  FOR DELETE USING (owner_user_id = auth.uid());

-- ============================================================================
-- workspace_members
-- ============================================================================
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_members_select ON public.workspace_members;
CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT USING (auth.user_in_workspace(workspace_id) OR auth.is_platform_admin());

DROP POLICY IF EXISTS workspace_members_insert ON public.workspace_members;
CREATE POLICY workspace_members_insert ON public.workspace_members
  FOR INSERT WITH CHECK (
    -- Owner can add anyone; admin can add admin/member; user can add self if accepting invite
    -- (invite acceptance bypasses RLS via service role in route handler)
    auth.user_workspace_role(workspace_id) IN ('owner','admin')
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS workspace_members_update ON public.workspace_members;
CREATE POLICY workspace_members_update ON public.workspace_members
  FOR UPDATE USING (auth.user_workspace_role(workspace_id) = 'owner');

DROP POLICY IF EXISTS workspace_members_delete ON public.workspace_members;
CREATE POLICY workspace_members_delete ON public.workspace_members
  FOR DELETE USING (
    auth.user_workspace_role(workspace_id) IN ('owner','admin')
    OR user_id = auth.uid()  -- self-leave
  );

-- ============================================================================
-- workspace_api_keys
-- ============================================================================
ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_api_keys_select ON public.workspace_api_keys;
CREATE POLICY workspace_api_keys_select ON public.workspace_api_keys
  FOR SELECT USING (auth.user_in_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_api_keys_write ON public.workspace_api_keys;
CREATE POLICY workspace_api_keys_write ON public.workspace_api_keys
  FOR ALL USING (auth.user_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (auth.user_workspace_role(workspace_id) IN ('owner','admin'));

-- ============================================================================
-- workspace_concepts
-- ============================================================================
ALTER TABLE public.workspace_concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_concepts_select ON public.workspace_concepts;
CREATE POLICY workspace_concepts_select ON public.workspace_concepts
  FOR SELECT USING (auth.user_in_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_concepts_write ON public.workspace_concepts;
CREATE POLICY workspace_concepts_write ON public.workspace_concepts
  FOR ALL USING (auth.user_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (auth.user_workspace_role(workspace_id) IN ('owner','admin'));

-- ============================================================================
-- workspace_invitations
-- ============================================================================
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_invitations_select ON public.workspace_invitations;
CREATE POLICY workspace_invitations_select ON public.workspace_invitations
  FOR SELECT USING (auth.user_workspace_role(workspace_id) IN ('owner','admin'));

DROP POLICY IF EXISTS workspace_invitations_write ON public.workspace_invitations;
CREATE POLICY workspace_invitations_write ON public.workspace_invitations
  FOR ALL USING (auth.user_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (auth.user_workspace_role(workspace_id) IN ('owner','admin'));

-- Token-based reads (for /invite/[token] page) bypass RLS via service role
-- in the route handler — no separate policy needed.

-- ============================================================================
-- workspace_activity_log
-- ============================================================================
ALTER TABLE public.workspace_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_activity_log_select ON public.workspace_activity_log;
CREATE POLICY workspace_activity_log_select ON public.workspace_activity_log
  FOR SELECT USING (auth.user_in_workspace(workspace_id));

-- Inserts are server-side only (service role); no insert policy needed.

-- ============================================================================
-- brands (workspace-scoped now)
-- ============================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_select ON public.brands;
CREATE POLICY brands_select ON public.brands
  FOR SELECT USING (auth.user_in_workspace(workspace_id));

DROP POLICY IF EXISTS brands_write ON public.brands;
CREATE POLICY brands_write ON public.brands
  FOR ALL USING (auth.user_in_workspace(workspace_id))
  WITH CHECK (auth.user_in_workspace(workspace_id));

-- ============================================================================
-- Brand-scoped tables (RLS via brands.workspace_id join)
-- ============================================================================
-- Helper macro pattern: USING (EXISTS (SELECT 1 FROM brands WHERE id = brand_id AND auth.user_in_workspace(workspace_id)))

-- brand_kits
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_kits_all ON public.brand_kits;
CREATE POLICY brand_kits_all ON public.brand_kits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- brand_products
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_products_all ON public.brand_products;
CREATE POLICY brand_products_all ON public.brand_products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- product_markets (joins via brand_products.brand_id → brands.workspace_id)
ALTER TABLE public.product_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_markets_all ON public.product_markets;
CREATE POLICY product_markets_all ON public.product_markets
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brand_products p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = product_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brand_products p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = product_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- persona_profiles
ALTER TABLE public.persona_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS persona_profiles_all ON public.persona_profiles;
CREATE POLICY persona_profiles_all ON public.persona_profiles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- brand_research_summaries
ALTER TABLE public.brand_research_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_research_summaries_all ON public.brand_research_summaries;
CREATE POLICY brand_research_summaries_all ON public.brand_research_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- saved_ads
ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_ads_all ON public.saved_ads;
CREATE POLICY saved_ads_all ON public.saved_ads
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- kie_task_results (user-scoped, not workspace-scoped — task is per-user request)
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
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND auth.user_in_workspace(b.workspace_id)
  ));

-- ============================================================================
-- concept_prompts (system, read-only for users)
-- ============================================================================
ALTER TABLE public.concept_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concept_prompts_select ON public.concept_prompts;
CREATE POLICY concept_prompts_select ON public.concept_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);  -- any authenticated user

DROP POLICY IF EXISTS concept_prompts_write ON public.concept_prompts;
CREATE POLICY concept_prompts_write ON public.concept_prompts
  FOR ALL USING (auth.is_platform_admin())
  WITH CHECK (auth.is_platform_admin());

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `adlance_rls_policies` and the full SQL above.

- [ ] **Step 3: Verify policies exist**

Use `mcp__supabase__execute_sql`:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
Expected: at least one policy per table for: workspaces, workspace_members, workspace_api_keys, workspace_concepts, workspace_invitations, workspace_activity_log, brands, brand_kits, brand_products, product_markets, persona_profiles, brand_research_summaries, saved_ads, kie_task_results, stealth_scenes, concept_prompts, profiles.

- [ ] **Step 4: Verify helper functions exist**

```sql
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_schema = 'auth'
  AND routine_name IN ('user_in_workspace', 'user_workspace_role', 'is_platform_admin');
```
Expected: 3 rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_adlance_rls_policies.sql
git commit -m "feat(db): add RLS policies for tenant isolation"
```

---

## Task 7: Storage RLS policies (path-based)

**Files:**
- Create: `supabase/migration_adlance_storage_rls.sql`

**Why:** Storage buckets currently rely on bucket-level public policies. With multi-tenancy, paths must be `{workspace_id}/{brand_id}/{filename}` and policies must check workspace membership via the path prefix.

**Note on existing files:** Files already in the buckets that don't follow the new `{workspace_id}/...` path convention will remain readable (public READ policy still applies) but will not be writable until the path is updated. Since Task 4 wiped most user data, only system assets (concept reference images, etc.) may be affected. Phase 3 (service refactor) will rewrite all upload paths to the new convention.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migration_adlance_storage_rls.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — Storage RLS policies (path-based)
-- ============================================================================
-- Path convention: {workspace_id}/{brand_id}/{filename}
-- The first path segment (foldername(name)[1]) is the workspace UUID.
--
-- Drops the legacy `campaign-inputs` bucket (unused). Other buckets keep their
-- public read but get authenticated write/delete restricted by membership.
-- ============================================================================

BEGIN;

-- 1. Drop legacy unused bucket (best effort — manual via Supabase Studio
--    if the SQL approach below is not permitted).
-- The user may need to manually delete `campaign-inputs` via Studio if files exist.
-- Documenting here for reference; not enforced via SQL.

-- 2. Storage RLS policies on storage.objects ---------------------------------
-- Drop legacy policies (names may vary; use IF EXISTS to be safe)
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write images" ON storage.objects;

-- Public READ (kept for image hot-linking in generated ads + brand assets)
CREATE POLICY "adlance_buckets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('brand-assets', 'generated-ads', 'images'));

-- Authenticated INSERT — workspace member only, path must start with workspace UUID
CREATE POLICY "adlance_buckets_member_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('brand-assets', 'generated-ads', 'images')
  AND auth.user_in_workspace((storage.foldername(name))[1]::uuid)
);

-- Authenticated UPDATE — workspace member only
CREATE POLICY "adlance_buckets_member_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('brand-assets', 'generated-ads', 'images')
  AND auth.user_in_workspace((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id IN ('brand-assets', 'generated-ads', 'images')
  AND auth.user_in_workspace((storage.foldername(name))[1]::uuid)
);

-- Authenticated DELETE — workspace owner/admin only
CREATE POLICY "adlance_buckets_member_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('brand-assets', 'generated-ads', 'images')
  AND auth.user_workspace_role((storage.foldername(name))[1]::uuid) IN ('owner', 'admin')
);

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `adlance_storage_rls`.

- [ ] **Step 3: Verify storage policies exist**

```sql
SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  AND policyname LIKE 'adlance%' ORDER BY policyname;
```
Expected: 4 policies (`adlance_buckets_public_read`, `adlance_buckets_member_insert`, `adlance_buckets_member_update`, `adlance_buckets_member_delete`).

- [ ] **Step 4: Document the campaign-inputs bucket cleanup**

If the `campaign-inputs` bucket exists, ask the user to delete it manually via Supabase Studio → Storage. This is non-blocking for Phase 1.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_adlance_storage_rls.sql
git commit -m "feat(db): add path-based storage RLS for workspace isolation"
```

---

## Task 8: handle_new_user trigger

**Files:**
- Create: `supabase/migration_adlance_trigger_handle_new_user.sql`

**Why:** When a user signs up via Supabase Auth, a row is inserted into `auth.users`. We need a corresponding row in `public.profiles` automatically. This trigger handles that.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migration_adlance_trigger_handle_new_user.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — Auto-create profile on signup
-- ============================================================================
-- When a new user is inserted into auth.users, automatically create their
-- corresponding row in public.profiles.
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

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `adlance_trigger_handle_new_user`.

- [ ] **Step 3: Verify trigger exists**

```sql
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```
Expected: 1 row, `event_object_schema = 'auth'`, `event_object_table = 'users'`.

- [ ] **Step 4: Functional test — create test auth user via Supabase admin API**

Use `mcp__supabase__execute_sql` to verify by inserting via auth schema (simulates real signup):
```sql
-- This requires the service role; if MCP runs as service role, OK.
-- If not, the user must invite a test user via Supabase Studio Auth panel,
-- then run the verification query below.
SELECT id, email FROM auth.users LIMIT 1;
SELECT id, email, full_name, is_platform_admin FROM public.profiles LIMIT 1;
```
Expected: if any auth.users row exists, a corresponding profiles row should exist with same id and email.

If no users exist yet (DB was wiped in Task 4): skip this functional test until Phase 2 onboarding flow exists. The trigger structure is verified in Step 3.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_adlance_trigger_handle_new_user.sql
git commit -m "feat(db): add handle_new_user trigger for auto profile creation"
```

---

## Task 9: Re-seed system concept_prompts

**Files:**
- Create: `supabase/migration_adlance_seed_system_concepts.sql`

**Why:** The PATI data wipe in Task 4 left `concept_prompts` table intact (it's not brand-scoped, no FK to anything we dropped), so existing system concepts should still be there. This task is a SAFETY NET: if any concepts were inadvertently affected, we re-insert a baseline set. Also documents what the system concepts ARE so a future operator can re-seed.

- [ ] **Step 1: Inspect current state of concept_prompts**

Use `mcp__supabase__execute_sql`:
```sql
SELECT concept_id, label, requires_competitor, length(prompt) AS prompt_chars
FROM public.concept_prompts
ORDER BY concept_id;
```

Record the output. Three possibilities:
- (a) Rows exist and look correct → no re-seed needed; document this in the migration file as a no-op for now.
- (b) Rows exist but some are missing → write INSERT ... ON CONFLICT DO NOTHING for the missing ones.
- (c) Table is empty (unexpected) → STOP and ask the user where to source the system concept content from (likely from git history of `src/lib/concepts.ts` or backup).

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migration_adlance_seed_system_concepts.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — Re-seed system concept_prompts (idempotent)
-- ============================================================================
-- The concept_prompts table contains globally-available creative strategies.
-- These are platform IP and read-only for end users.
-- Inserts use ON CONFLICT DO NOTHING so re-runs are safe.
--
-- NOTE: If you are running this on a fresh Supabase project with no concepts,
-- replace the placeholder rows below with the actual concept content (see
-- Step 1 of the plan: query existing data first, then transcribe).
-- ============================================================================

BEGIN;

-- Example placeholder structure — REPLACE before applying if seeding fresh:
-- INSERT INTO public.concept_prompts (concept_id, label, description, requires_competitor, prompt, reference_images)
-- VALUES (
--   'authenticity-first',
--   'Authenticity First',
--   'Lean into honest, unpolished visuals to build trust',
--   false,
--   'Generate an ad that feels candid, with natural lighting and real-life staging...',
--   ARRAY[]::TEXT[]
-- ) ON CONFLICT (concept_id) DO NOTHING;

-- For an existing project with concepts already in place, this migration is a no-op.
-- The COMMIT below ensures the empty transaction is recorded in migration history.

COMMIT;
```

If Step 1 showed concepts already exist (case a), the migration above is a no-op — that's fine. If concepts need seeding (case b/c), write the actual INSERT statements before applying.

- [ ] **Step 3: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `adlance_seed_system_concepts`.

- [ ] **Step 4: Verify final concept count**

```sql
SELECT count(*) AS total_system_concepts FROM public.concept_prompts;
```
Expected: same count as before, or higher if rows were added.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_adlance_seed_system_concepts.sql
git commit -m "chore(db): document system concept_prompts seeding"
```

---

## Task 10: Manual tenancy isolation verification

**Files:**
- Create: `docs/adlance-tenancy-isolation-test.sql`

**Why:** Before declaring Phase 1 done, prove that the RLS isolation actually works end-to-end. Two test users in two test workspaces — each must NOT see the other's data.

- [ ] **Step 1: Write the verification SQL script**

Create `docs/adlance-tenancy-isolation-test.sql`:
```sql
-- ============================================================================
-- Adlance Phase 1 — Tenancy Isolation Manual Verification
-- ============================================================================
-- Run via Supabase Studio SQL editor (not MCP) so we can switch auth roles.
-- Goal: prove user A in workspace W1 cannot see workspace W2's data.
--
-- Cleanup: delete test users at the end (commented out by default).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SETUP: Create two test users via auth.users (requires service role).
-- In Supabase Studio, you can use the Auth panel UI to create them faster.
-- ---------------------------------------------------------------------------

-- Step 1: Create users via Studio Auth panel:
--   user_a@adlance-test.com  (password: test1234)
--   user_b@adlance-test.com  (password: test1234)
--
-- (The handle_new_user trigger will populate public.profiles automatically.)

-- Step 2: Capture their UUIDs:
SELECT id, email FROM auth.users
WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
-- Note the two UUIDs as :user_a_id and :user_b_id below.

-- Step 3: Create one workspace per user via service role (bypasses RLS):
INSERT INTO public.workspaces (name, slug, owner_user_id) VALUES
  ('Workspace A', 'workspace-a', '<user_a_id>'),
  ('Workspace B', 'workspace-b', '<user_b_id>');

INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ((SELECT id FROM public.workspaces WHERE slug='workspace-a'), '<user_a_id>', 'owner'),
  ((SELECT id FROM public.workspaces WHERE slug='workspace-b'), '<user_b_id>', 'owner');

-- Step 4: Create one brand per workspace:
INSERT INTO public.brands (name, workspace_id) VALUES
  ('Brand A1', (SELECT id FROM public.workspaces WHERE slug='workspace-a')),
  ('Brand B1', (SELECT id FROM public.workspaces WHERE slug='workspace-b'));

-- ---------------------------------------------------------------------------
-- VERIFY: Switch to user A's auth context and confirm isolation.
-- ---------------------------------------------------------------------------

-- In Supabase Studio: open SQL editor → top-right "Run as" → select user_a@adlance-test.com
SELECT id, name FROM public.brands;
-- Expected: 1 row only (Brand A1).

SELECT id, name FROM public.workspaces;
-- Expected: 1 row only (Workspace A).

SELECT * FROM public.workspace_api_keys;
-- Expected: 0 rows (none created yet).

-- Switch to user B and repeat:
SELECT id, name FROM public.brands;
-- Expected: 1 row only (Brand B1).

-- ---------------------------------------------------------------------------
-- ATTEMPT CROSS-TENANT WRITE (should be blocked by RLS)
-- ---------------------------------------------------------------------------

-- As user A, try to insert a brand into workspace B:
-- INSERT INTO public.brands (name, workspace_id) VALUES
--   ('Hack Attempt', (SELECT id FROM public.workspaces WHERE slug='workspace-b'));
-- Expected: ERROR — new row violates RLS policy.

-- ---------------------------------------------------------------------------
-- CLEANUP (uncomment when done)
-- ---------------------------------------------------------------------------
-- DELETE FROM auth.users WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
-- (CASCADE will clean up profiles, workspaces, members, brands.)
```

- [ ] **Step 2: Run the test manually via Supabase Studio**

Open Supabase Studio → SQL Editor → paste relevant sections of `docs/adlance-tenancy-isolation-test.sql` and execute step-by-step. Use the "Run as" feature to switch between user A and user B contexts.

Expected outcomes (record in plan task notes):
- ☐ User A sees 1 brand (Brand A1), not Brand B1
- ☐ User B sees 1 brand (Brand B1), not Brand A1
- ☐ User A sees 1 workspace, not B's workspace
- ☐ Cross-tenant INSERT attempt fails with RLS violation

- [ ] **Step 3: Run encryption + env tests one more time**

```bash
npx vitest run src/lib/__tests__/crypto.test.ts src/lib/__tests__/env.test.ts
```
Expected: all green.

- [ ] **Step 4: Run full test suite to verify no regressions**

```bash
npm test
```
Expected: existing tests pass except those that depend on dropped tables (e.g. `clients.test.ts`, anything reading `app_settings`). Note any failures — they will be addressed in Phase 3 (service refactor). For Phase 1 completion, **only the tests in `src/lib/__tests__/` must all pass**; API/integration test failures are EXPECTED at this point because schema is ahead of services.

Record which tests fail and why (likely: `clients.test.ts`, `brands.test.ts`, anything querying old columns).

- [ ] **Step 5: Cleanup test data and commit**

After verifying isolation, clean up:
```sql
DELETE FROM auth.users WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
```

Commit the verification doc:
```bash
git add docs/adlance-tenancy-isolation-test.sql
git commit -m "docs(test): add tenancy isolation verification SQL"
```

---

## Task 11: Phase 1 wrap-up

**Files:** None (verification + commit summary)

- [ ] **Step 1: Verify clean working tree**

```bash
git status
```
Expected: clean working tree (or only `.env.local` showing as modified, which is gitignored).

- [ ] **Step 2: Verify all Phase 1 commits**

```bash
git log --oneline 4010cde..HEAD
```
Expected commits (in roughly this order):
- chore(config): restore env template with ADLANCE_ENCRYPTION_KEY
- feat(lib): add AES-256-GCM crypto helpers for workspace API keys
- chore(config): require ADLANCE_ENCRYPTION_KEY in env validation
- feat(db): drop obsolete PATI tables and alter profiles/brands
- feat(db): create workspace tables for multi-tenant model
- feat(db): add RLS policies for tenant isolation
- feat(db): add path-based storage RLS for workspace isolation
- feat(db): add handle_new_user trigger for auto profile creation
- chore(db): document system concept_prompts seeding
- docs(test): add tenancy isolation verification SQL

- [ ] **Step 3: Verify build still succeeds**

```bash
npm run build
```
Expected: build succeeds OR fails ONLY due to `key-provider.ts` / services that read dropped tables. If the failure is in those expected files, that's acceptable — it confirms Phase 3 has work waiting. Document the failure mode.

- [ ] **Step 4: Verify TypeScript still compiles for the lib code**

```bash
npx tsc --noEmit
```
Expected: type errors only in services/routes that reference dropped columns. `src/lib/crypto.ts`, `src/lib/env.ts` and tests must compile clean.

- [ ] **Step 5: Update task tracking + summary message**

Tell the user:

> "Phase 1 complete. Schema is now multi-tenant Adlance. RLS isolation verified manually. AES-256-GCM crypto helpers in place. App build will fail (expected) until Phase 2 wires up the new auth flow + Phase 3 refactors services to use workspace_api_keys instead of app_settings. Ready to write Phase 2 plan when you are."

---

## Phase 1 Definition of Done

- ☐ All 11 tasks above completed
- ☐ All `src/lib/__tests__/` tests pass (crypto + env)
- ☐ All migrations applied to Supabase project successfully
- ☐ Manual tenancy isolation test confirms RLS works
- ☐ All migration SQL files committed
- ☐ `.env.local.template` updated and committed
- ☐ User has acknowledged that app routes/services will be broken until Phases 2-3

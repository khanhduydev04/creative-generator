# Shared Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển app từ "brand riêng tư mỗi user" sang "workspace dùng chung 1 pool", với admin (`ceo`/`super_admin`) quản tạo/xóa brand + Apify config, collaborator (`member`) sửa brand/sản phẩm/kit và tạo content.

**Architecture:** RLS-first. Postgres là nguồn sự thật phân quyền qua 2 helper `is_active_user()` / `is_admin()`. Service layer bỏ filter `owner_user_id` ở đường đọc; route thêm guard admin cho hành động nhạy cảm (403 thân thiện + phòng thủ 2 lớp). UI ẩn nút tạo/xóa brand với member.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + RLS), @tanstack/react-query, Vitest.

## Global Constraints

- TypeScript: không `any`, không `as X` trừ khi có comment giải thích an toàn (CLAUDE.md).
- Không barrel `index.ts`; import trực tiếp từ source.
- Server Component mặc định; `"use client"` phải có comment lý do.
- Roles: admin = `'ceo'` | `'super_admin'`; collaborator = `'member'` (từ [src/features/auth/types.ts](../../../src/features/auth/types.ts)).
- Helper UI gating có sẵn: `isAdmin(role: UserRole)` trong `src/features/auth/types.ts`.
- Migration mới đặt tại `supabase/migrations/` theo số thứ tự (`12_…`, `13_…`).
- DB project ref: `xoacptvywciqcafpsxeh` (áp dụng migration qua Supabase MCP `apply_migration`/`execute_sql` hoặc Supabase CLI).
- `owner_user_id` GIỮ LẠI trên `brands` làm attribution "ai tạo", KHÔNG dùng lọc quyền xem.
- OUT OF SCOPE: `user_concepts` (personal, không phải brand data) giữ nguyên per-user; app KHÔNG tự tạo Apify task; KHÔNG membership/org table.

---

## File Structure

**Tạo mới:**
- `supabase/migrations/12_shared_workspace_helpers.sql` — helpers + profiles sync + brands policies + soft-delete trigger.
- `supabase/migrations/13_shared_workspace_child_rls.sql` — policies cho toàn bộ bảng brand-family con.
- `src/lib/__tests__/rls-client.ts` — helper tạo Supabase client scoped theo user (RLS-enforced) cho test.

**Sửa:**
- `src/services/brandService.ts` — bỏ filter owner ở list/get/update.
- `src/services/brandKitService.ts` — `verifyBrandOwnership` → `verifyBrandExists`, bỏ JOIN owner.
- `src/services/brandProductService.ts` — như trên.
- `src/services/personaService.ts` — như trên.
- `src/services/savedAdService.ts` — như trên.
- `src/services/stealthSceneService.ts` — như trên.
- `src/app/api/brands/route.ts` — guard admin cho `POST`.
- `src/app/api/brands/[id]/route.ts` — guard admin cho `DELETE`.
- `src/app/api/video/apify-config/route.ts` — guard admin cho `PUT`.
- `src/lib/auth/verify-admin.ts` — thêm overload nhận `userId` đã có (tránh gọi `getUser` 2 lần) — chỉ nếu cần; mặc định dùng nguyên trạng.
- `src/components/layout/DashboardLayout.tsx` — ẩn "New Brand" + "Delete" với member.
- `src/types/database.types.ts` — regenerate sau migration.
- `src/__tests__/user-isolation.test.ts` — đổi tiền đề sang shared-pool + RLS thật.

---

## Task 1: Migration 12 — Helpers, profiles sync, brands policies, soft-delete trigger

**Files:**
- Create: `supabase/migrations/12_shared_workspace_helpers.sql`

**Interfaces:**
- Produces (SQL, dùng bởi Task 2 & tests):
  - `public.is_active_user() returns boolean`
  - `public.is_admin() returns boolean`
  - Trigger `brands_guard_admin_columns` trên `public.brands`.
  - `brands` policies: `brands_select_shared`, `brands_insert_admin`, `brands_update_active`, `brands_delete_admin`.

- [ ] **Step 1: Viết file migration**

```sql
-- supabase/migrations/12_shared_workspace_helpers.sql
-- Shared workspace: helper fns, profiles admin-flag sync, brands RLS + soft-delete guard.
BEGIN;

-- 1) Helper: đang đăng nhập + active
CREATE OR REPLACE FUNCTION public.is_active_user()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active
  );
$$;

-- 2) Helper: admin (ceo/super_admin) + active
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active AND role IN ('ceo','super_admin')
  );
$$;

-- 3) Đồng bộ is_platform_admin = (role admin) — client gating đọc field này qua /api/user/me
UPDATE public.profiles
  SET is_platform_admin = (role IN ('ceo','super_admin'));

CREATE OR REPLACE FUNCTION public.sync_platform_admin_flag()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    NEW.is_platform_admin := (NEW.role IN ('ceo','super_admin'));
    RETURN NEW;
  END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_platform_admin ON public.profiles;
CREATE TRIGGER profiles_sync_platform_admin
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_admin_flag();

-- 4) brands RLS: đọc chung; tạo/xóa admin; sửa cho mọi active user
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brands_select       ON public.brands;
DROP POLICY IF EXISTS brands_write        ON public.brands;
DROP POLICY IF EXISTS brands_select_shared ON public.brands;
DROP POLICY IF EXISTS brands_insert_admin  ON public.brands;
DROP POLICY IF EXISTS brands_update_active ON public.brands;
DROP POLICY IF EXISTS brands_delete_admin  ON public.brands;

CREATE POLICY brands_select_shared ON public.brands
  FOR SELECT USING (public.is_active_user());
CREATE POLICY brands_insert_admin ON public.brands
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY brands_update_active ON public.brands
  FOR UPDATE USING (public.is_active_user()) WITH CHECK (public.is_active_user());
CREATE POLICY brands_delete_admin ON public.brands
  FOR DELETE USING (public.is_admin());

-- 5) Soft-delete guard: chỉ admin được đổi deleted_at / owner_user_id
CREATE OR REPLACE FUNCTION public.guard_brand_admin_columns()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
        OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id)
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'only admin can change deleted_at/owner_user_id';
    END IF;
    RETURN NEW;
  END;
$$;

DROP TRIGGER IF EXISTS brands_guard_admin_columns ON public.brands;
CREATE TRIGGER brands_guard_admin_columns
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.guard_brand_admin_columns();

COMMIT;
```

- [ ] **Step 2: Áp dụng migration**

Run (Supabase MCP): `apply_migration` với name `12_shared_workspace_helpers` và nội dung file trên.
Hoặc CLI: `supabase db push` (nếu dùng local-linked).
Expected: thành công, không lỗi.

- [ ] **Step 3: Verify helpers + sync bằng SQL**

Run (Supabase MCP `execute_sql`):
```sql
SELECT proname FROM pg_proc WHERE proname IN ('is_active_user','is_admin','guard_brand_admin_columns');
SELECT COUNT(*) FILTER (WHERE is_platform_admin) AS admins,
       COUNT(*) FILTER (WHERE role IN ('ceo','super_admin')) AS role_admins
FROM public.profiles;
SELECT policyname FROM pg_policies WHERE tablename = 'brands' ORDER BY policyname;
```
Expected: 3 functions; `admins == role_admins`; policies = `brands_delete_admin, brands_insert_admin, brands_select_shared, brands_update_active`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/12_shared_workspace_helpers.sql
git commit -m "feat(rls): shared-workspace helpers + brands policies + soft-delete guard"
```

---

## Task 2: Migration 13 — RLS cho toàn bộ bảng brand-family con

**Files:**
- Create: `supabase/migrations/13_shared_workspace_child_rls.sql`

**Interfaces:**
- Consumes: `public.is_active_user()`, `public.is_admin()` (Task 1).
- Produces: policy mới trên 14 bảng con; thay toàn bộ policy `*_all` cũ dựa trên `owner_user_id`.

- [ ] **Step 1: Viết file migration**

```sql
-- supabase/migrations/13_shared_workspace_child_rls.sql
-- Thay policy owner-based bằng shared-pool. brand_apify_config: write = admin.
BEGIN;

-- brand_apify_config: đọc chung, ghi admin
ALTER TABLE public.brand_apify_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_apify_config_all        ON public.brand_apify_config;
DROP POLICY IF EXISTS brand_apify_config_select     ON public.brand_apify_config;
DROP POLICY IF EXISTS brand_apify_config_write_admin ON public.brand_apify_config;
CREATE POLICY brand_apify_config_select ON public.brand_apify_config
  FOR SELECT USING (public.is_active_user());
CREATE POLICY brand_apify_config_write_admin ON public.brand_apify_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Các bảng con còn lại: FOR ALL = is_active_user()
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'brand_kits','brand_products','product_markets','persona_profiles',
  'brand_research_summaries','saved_ads','stealth_scenes','competitor_videos',
  'transcripts','brand_scripts','voice_presets','voice_ratings','generated_audios'
];
DECLARE oldpolicies text[] := ARRAY[
  'brand_kits_all','brand_products_all','product_markets_all','persona_profiles_all',
  'brand_research_summaries_all','saved_ads_all','stealth_scenes_all','competitor_videos_all',
  'transcripts_all','brand_scripts_all','voice_presets_all','voice_ratings_all','generated_audios_all'
];
DECLARE i int;
BEGIN
  FOR i IN 1 .. array_length(tables,1) LOOP
    t := tables[i];
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', oldpolicies[i], t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_shared', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_active_user()) WITH CHECK (public.is_active_user());',
      t || '_shared', t);
  END LOOP;
END $$;

COMMIT;
```

> Lưu ý: nếu một bảng trong danh sách không tồn tại trên DB hiện tại, `format`+`EXECUTE` sẽ lỗi → kiểm tra trước bằng Step 2 và xóa tên thừa khỏi mảng. `product_markets`/`brand_research_summaries` có trong adlance-snapshot nhưng cần xác nhận còn trên DB live.

- [ ] **Step 2: Xác nhận bảng tồn tại trước khi áp dụng**

Run (Supabase MCP `execute_sql`):
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = ANY(ARRAY['brand_kits','brand_products','product_markets',
    'persona_profiles','brand_research_summaries','saved_ads','stealth_scenes',
    'competitor_videos','transcripts','brand_scripts','voice_presets',
    'voice_ratings','generated_audios','brand_apify_config'])
ORDER BY table_name;
```
Expected: liệt kê các bảng có thật. Xóa khỏi 2 mảng trong file bất kỳ tên KHÔNG xuất hiện, giữ thứ tự `tables`/`oldpolicies` khớp index.

- [ ] **Step 3: Áp dụng migration**

Run: `apply_migration` name `13_shared_workspace_child_rls`.
Expected: thành công.

- [ ] **Step 4: Verify policies**

Run (Supabase MCP `execute_sql`):
```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('brand_apify_config','brand_kits','brand_products','saved_ads','transcripts')
ORDER BY tablename, policyname;
```
Expected: `brand_apify_config` có `brand_apify_config_select` + `brand_apify_config_write_admin`; mỗi bảng con khác có `<table>_shared`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/13_shared_workspace_child_rls.sql
git commit -m "feat(rls): shared-pool policies for brand-family child tables"
```

---

## Task 3: Test helper — Supabase client scoped theo user (RLS-enforced)

**Files:**
- Create: `src/lib/__tests__/rls-client.ts`

**Interfaces:**
- Produces: `createUserClient(email: string, password?: string): Promise<SupabaseClient<Database>>` — client dùng anon key + session JWT của user → RLS áp dụng. `setProfileRole(userId, role)` helper.

- [ ] **Step 1: Viết helper**

```ts
// src/lib/__tests__/rls-client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import type { UserRole } from '@/features/auth/types'

const DEFAULT_PASSWORD = 'Test1234!'

/** Client scoped theo user (anon key + session) → RLS được thực thi. */
export async function createUserClient(
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('missing supabase env for rls-client')

  const client = createClient<Database>(url, anon)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`)
  return client
}

/** Đặt role + active cho profile (admin client, bypass RLS). */
export async function setProfileRole(userId: string, role: UserRole): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role, is_active: true })
    .eq('id', userId)
  if (error) throw new Error(`setProfileRole failed: ${error.message}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/__tests__/rls-client.ts
git commit -m "test: add RLS-scoped supabase client helper"
```

---

## Task 4: RLS integration test — shared pool + admin gating + soft-delete guard

**Files:**
- Modify: `src/__tests__/user-isolation.test.ts` (đổi tên mô tả + đảo tiền đề)
- Test: cùng file

**Interfaces:**
- Consumes: `createUserClient`, `setProfileRole` (Task 3); `setupTwoIsolatedUsers`, `teardownTestUser` (test-helpers).

- [ ] **Step 1: Thay nội dung file test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { setupTwoIsolatedUsers, teardownTestUser } from '@/lib/__tests__/test-helpers'
import { createUserClient, setProfileRole } from '@/lib/__tests__/rls-client'

let admin: { userId: string; email: string }
let member: { userId: string; email: string }
let brandId: string

beforeAll(async () => {
  const [a, b] = await setupTwoIsolatedUsers()
  admin = a
  member = b
  await setProfileRole(admin.userId, 'super_admin')
  await setProfileRole(member.userId, 'member')

  // Admin tạo brand bằng admin client (seed)
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('brands')
    .insert({ name: 'Shared-Brand', owner_user_id: admin.userId })
    .select()
    .single()
  if (error || !data) throw new Error('seed brand failed')
  brandId = data.id
})

afterAll(async () => {
  await teardownTestUser(admin.userId)
  await teardownTestUser(member.userId)
})

describe('shared workspace RLS', () => {
  it('member thấy brand do admin tạo (pool chung)', async () => {
    const client = await createUserClient(member.email)
    const { data } = await client.from('brands').select('id').eq('id', brandId)
    expect(data).toHaveLength(1)
  })

  it('member sửa được tên brand', async () => {
    const client = await createUserClient(member.email)
    const { error } = await client
      .from('brands')
      .update({ name: 'Renamed-By-Member' })
      .eq('id', brandId)
    expect(error).toBeNull()
  })

  it('member KHÔNG tạo được brand (insert bị RLS chặn)', async () => {
    const client = await createUserClient(member.email)
    const { data, error } = await client
      .from('brands')
      .insert({ name: 'Nope', owner_user_id: member.userId })
      .select()
    // RLS chặn → không có row trả về (error hoặc data rỗng)
    expect(data ?? []).toHaveLength(0)
    expect(error).not.toBeNull()
  })

  it('member KHÔNG soft-delete được brand (trigger chặn)', async () => {
    const client = await createUserClient(member.email)
    const { error } = await client
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', brandId)
    expect(error).not.toBeNull()
  })

  it('admin soft-delete được brand', async () => {
    const client = await createUserClient(admin.email)
    const { error } = await client
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', brandId)
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 2: Chạy test — kỳ vọng PASS sau khi migration đã áp dụng**

Run: `npx vitest run src/__tests__/user-isolation.test.ts`
Expected: 5 test PASS. (Nếu FAIL ở "member sửa được tên" hoặc "admin soft-delete" → kiểm tra migration đã áp dụng đúng DB mà test trỏ tới.)

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/user-isolation.test.ts
git commit -m "test(rls): shared-pool visibility + admin gating + soft-delete guard"
```

---

## Task 5: BrandService — bỏ filter owner ở đường đọc/sửa

**Files:**
- Modify: `src/services/brandService.ts`

**Interfaces:**
- Produces: `listBrands()` trả mọi brand chưa xóa; `getBrandById(id)` không lọc owner; `updateBrand(id, updates)` không lọc owner. `createBrand`/`deleteBrand` giữ nguyên (RLS chặn).

- [ ] **Step 1: Sửa `listBrands` — bỏ `.eq('owner_user_id', this.userId)`**

```ts
  async listBrands(): Promise<BrandRow[]> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }
```

- [ ] **Step 2: Sửa `getBrandById` — bỏ filter owner**

```ts
  async getBrandById(id: string): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw new ApiError(404, 'brand_not_found')
    return data
  }
```

- [ ] **Step 3: Sửa `updateBrand` — bỏ filter owner**

```ts
  async updateBrand(
    id: string,
    updates: { name?: string; description?: string },
  ): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new ApiError(404, 'brand_not_found')
    return data
  }
```

> `createBrand` và `deleteBrand` giữ nguyên — RLS (`brands_insert_admin` / `brands_delete_admin`) tự chặn member. `userId` vẫn dùng cho `createBrand` (gán `owner_user_id` attribution).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: không lỗi mới ở `brandService.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/services/brandService.ts
git commit -m "refactor(brand): drop owner filter from read/update (RLS shared pool)"
```

---

## Task 6: Brand-family services — `verifyBrandOwnership` → `verifyBrandExists`, bỏ JOIN owner

**Files:**
- Modify: `src/services/brandKitService.ts`
- Modify: `src/services/brandProductService.ts`
- Modify: `src/services/personaService.ts`
- Modify: `src/services/savedAdService.ts`
- Modify: `src/services/stealthSceneService.ts`

**Interfaces:**
- Produces: mỗi service có `private async verifyBrandExists(brandId): Promise<void>` chỉ check brand tồn tại + chưa xóa; mọi truy vấn đọc bỏ `.eq('brands.owner_user_id', this.userId)` và bỏ JOIN `brands!inner(owner_user_id)` khi JOIN chỉ phục vụ lọc owner.

- [ ] **Step 1: `brandProductService.ts` — thay `verifyBrandOwnership`**

```ts
  /** Verify the parent brand exists (not soft-deleted). RLS handles authz. */
  private async verifyBrandExists(brandId: string): Promise<void> {
    const { data } = await this.supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .is('deleted_at', null)
      .single()
    if (!data) throw new ApiError(404, 'brand_not_found')
  }
```

- [ ] **Step 2: `brandProductService.ts` — bỏ JOIN owner ở `getByBrandId` & `getById`**

```ts
  async getByBrandId(brandId: string): Promise<BrandProductRow[]> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }

  async getById(id: string): Promise<BrandProductRow | null> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new ApiError(500, 'db_error', error.message)
    }
    return data ?? null
  }
```

- [ ] **Step 3: `brandProductService.ts` — đổi lời gọi trong `create`**

Sửa dòng `await this.verifyBrandOwnership(product.brand_id)` → `await this.verifyBrandExists(product.brand_id)`.

- [ ] **Step 4: Áp dụng cùng pattern cho 4 service còn lại**

Với `brandKitService.ts`, `personaService.ts`, `savedAdService.ts`, `stealthSceneService.ts`:
1. Đổi `verifyBrandOwnership` → `verifyBrandExists` (body như Step 1: chỉ `.eq('id', brandId).is('deleted_at', null)`, bỏ `.eq('owner_user_id', this.userId)`).
2. Trong mọi truy vấn đọc: bỏ `.eq('brands.owner_user_id', this.userId)`. Nếu JOIN `brands!inner(...)` chỉ dùng để lọc owner thì đổi `.select('*, brands!inner(owner_user_id)')` → `.select('*')` và bỏ đoạn strip `brands` ở map kết quả (trả thẳng `data ?? []`).
3. Đổi mọi lời gọi `this.verifyBrandOwnership(...)` → `this.verifyBrandExists(...)`.

Ví dụ `savedAdService.ts` `getByBrand` (tham chiếu [savedAdService.ts:39](../../../src/services/savedAdService.ts#L39)):
```ts
  async getByBrand(brandId: string): Promise<SavedAdRow[]> {
    const { data, error } = await this.supabase
      .from('saved_ads')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
    if (error) throw new ApiError(500, 'db_error', error.message)
    return data ?? []
  }
```

- [ ] **Step 5: Quét sạch — không còn `verifyBrandOwnership` hay filter owner ở brand-family services**

Run: `npx vitest run` chưa cần; chạy grep kiểm tra:
`rg "verifyBrandOwnership|owner_user_id" src/services/brandKitService.ts src/services/brandProductService.ts src/services/personaService.ts src/services/savedAdService.ts src/services/stealthSceneService.ts`
Expected: KHÔNG còn match (trừ bình luận nếu có — xóa luôn). `brandService.ts` còn 1 match hợp lệ ở `createBrand` insert `owner_user_id` (attribution) — không nằm trong 5 file này.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: không lỗi mới.

- [ ] **Step 7: Commit**

```bash
git add src/services/brandKitService.ts src/services/brandProductService.ts src/services/personaService.ts src/services/savedAdService.ts src/services/stealthSceneService.ts
git commit -m "refactor(services): verifyBrandExists + drop owner JOIN filters (shared pool)"
```

---

## Task 7: Route guards — admin cho tạo/xóa brand & sửa Apify config

**Files:**
- Modify: `src/app/api/brands/route.ts`
- Modify: `src/app/api/brands/[id]/route.ts`
- Modify: `src/app/api/video/apify-config/route.ts`
- Test: `src/app/api/__tests__/brand-admin-guard.test.ts` (Create)

**Interfaces:**
- Consumes: `verifyAdmin()` + `isVerifyError()` từ [src/lib/auth/verify-admin.ts](../../../src/lib/auth/verify-admin.ts) (trả `NextResponse` 401/403 nếu không phải admin).

- [ ] **Step 1: `POST /api/brands` — guard admin**

Thêm vào đầu `POST` (sau `try {`), trước khi đọc body:
```ts
import { verifyAdmin, isVerifyError } from '@/lib/auth/verify-admin'
// ...
  try {
    const guard = await verifyAdmin()
    if (isVerifyError(guard)) return guard
    const { userId } = guard
    // ... phần còn lại giữ nguyên, dùng userId từ guard thay cho requireUser
```
> Bỏ dòng `const { userId } = await requireUser(request)` ở `POST` (đã có `userId` từ guard). `GET` giữ nguyên `requireUser`.

- [ ] **Step 2: `DELETE /api/brands/[id]` — guard admin**

Trong `DELETE`, thay `const { userId } = await requireUser(request)` bằng:
```ts
    const guard = await verifyAdmin()
    if (isVerifyError(guard)) return guard
    const { userId } = guard
```
> `GET` và `PATCH` giữ `requireUser` (member sửa được brand qua PATCH).

- [ ] **Step 3: `PUT /api/video/apify-config` — guard admin**

Trong `PUT`, thay `await requireUser(request)` bằng:
```ts
    const guard = await verifyAdmin()
    if (isVerifyError(guard)) return guard
```
> `GET` giữ `requireUser` (member xem được trạng thái sync).

- [ ] **Step 4: Viết test guard**

```ts
// src/app/api/__tests__/brand-admin-guard.test.ts
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
```

- [ ] **Step 5: Chạy test**

Run: `npx vitest run src/app/api/__tests__/brand-admin-guard.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/brands/route.ts src/app/api/brands/[id]/route.ts src/app/api/video/apify-config/route.ts src/app/api/__tests__/brand-admin-guard.test.ts
git commit -m "feat(api): admin guard on brand create/delete + apify-config write"
```

---

## Task 8: UI gating — ẩn "New Brand" & "Delete" với member

**Files:**
- Modify: `src/components/layout/DashboardLayout.tsx`

**Interfaces:**
- Consumes: `useAuth().profile`, `isAdmin(role)` — đã import sẵn trong file ([DashboardLayout.tsx:5-6](../../../src/components/layout/DashboardLayout.tsx#L5-L6)).

- [ ] **Step 1: Khai báo biến `canManageBrands` gần `profile`**

Sau `const { profile, loading: authLoading, signOut } = useAuth();` ([:297](../../../src/components/layout/DashboardLayout.tsx#L297)) thêm:
```ts
  const canManageBrands = Boolean(profile && isAdmin(profile.role));
```

- [ ] **Step 2: Gate nút "New Brand" (block dòng 548-557)**

Bọc khối "New Brand" bằng điều kiện:
```tsx
                {canManageBrands && (
                  <div className={brands.length > 0 ? "mt-1 border-t border-border pt-1" : ""}>
                    <button
                      type="button"
                      onClick={() => { setDropdownOpen(false); setModal({ type: "new" }); }}
                      className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t.nav.newBrand}
                    </button>
                  </div>
                )}
```

- [ ] **Step 3: Gate nút "Delete" (block dòng 571-578), giữ "Rename" cho mọi user**

Bọc riêng nút Delete:
```tsx
                {canManageBrands && (
                  <button
                    type="button"
                    onClick={() => { setBrandActionsOpen(false); setModal({ type: "delete", brandId: selectedBrand.id, brandName: selectedBrand.name }); }}
                    className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t.nav.delete}
                  </button>
                )}
```

- [ ] **Step 4: Typecheck + build sanity**

Run: `npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 5: Verify thủ công (member account)**

Đăng nhập bằng tài khoản `role = 'member'` → mở brand dropdown: KHÔNG thấy "New Brand"; mở brand actions (...): thấy "Rename", KHÔNG thấy "Delete". Đăng nhập admin → thấy cả hai.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/DashboardLayout.tsx
git commit -m "feat(ui): hide brand create/delete for non-admin members"
```

---

## Task 9: Regenerate database.types.ts

**Files:**
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Regenerate types từ DB live**

Run (Supabase MCP): `generate_typescript_types` (project ref `xoacptvywciqcafpsxeh`), ghi đè `src/types/database.types.ts`.
Hoặc CLI: `supabase gen types typescript --project-id xoacptvywciqcafpsxeh > src/types/database.types.ts`
Expected: `profiles.Row` giờ có `role`, `is_active`, `department`, `is_platform_admin`, `created_by`, `last_login_at`.

- [ ] **Step 2: Typecheck toàn repo**

Run: `npx tsc --noEmit`
Expected: không lỗi. Nếu có nơi vỡ type do schema mới rõ hơn → sửa tại chỗ.

- [ ] **Step 3: Chạy toàn bộ test**

Run: `npx vitest run`
Expected: tất cả PASS (gồm RLS test Task 4, guard test Task 7).

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate database.types after shared-workspace migration"
```

---

## Self-Review (đã chạy)

**Spec coverage:**
- §2 ma trận quyền → Task 1 (brands), Task 2 (con + apify admin), Task 7 (route guard), Task 8 (UI). ✅
- §3 RLS helpers + trigger + role sync → Task 1. ✅
- §3.4 đồng bộ `is_platform_admin` → Task 1 Step 3. ✅
- §4 service bỏ owner filter → Task 5, Task 6. ✅
- §4.2 route guard → Task 7. ✅
- §5 UI gating → Task 8 (apify UI bỏ vì chưa tồn tại — ghi rõ). ✅
- §7 regenerate types + update tests → Task 9, Task 4. ✅

**Placeholder scan:** không có TBD/TODO; mọi step có code/command thật. ✅

**Type consistency:** `verifyBrandExists` thống nhất Task 6; `createUserClient`/`setProfileRole` định nghĩa Task 3, dùng Task 4; `verifyAdmin`/`isVerifyError` khớp signature file thật. ✅

**Lưu ý cho người thực thi:** Migration (Task 1-2) phải áp dụng vào ĐÚNG DB mà test (Task 4) và app trỏ tới. Test RLS cần `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong env test.

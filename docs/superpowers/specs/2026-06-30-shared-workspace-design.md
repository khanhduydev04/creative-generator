# Shared Workspace — Pool dùng chung + Admin quản setup

**Date:** 2026-06-30
**Status:** Approved (design)
**Approach:** RLS-first (DB là nguồn sự thật cho phân quyền)

---

## 1. Mục tiêu

Chuyển app từ mô hình **"brand riêng tư mỗi user"** (mọi brand service scope cứng
`owner_user_id = auth.uid()`) sang **"workspace dùng chung"** cho tool nội bộ:

- Mọi user active đăng nhập đều thấy & dùng **cùng một pool brand** (không còn brand riêng tư).
- **Admin** (`ceo` / `super_admin`) quản lý hạ tầng: tạo/xóa brand, cấu hình Apify.
- **Collaborator** (`member`) vào dùng ngay: sửa brand, sản phẩm, brand kit, tạo content —
  không cần tự tạo brand hay setup.

Mô hình account đã bỏ signup (admin tạo tài khoản). Member đăng nhập là vào thẳng pool.

---

## 2. Ma trận phân quyền

| Hành động | Admin (`ceo`/`super_admin`) | Collaborator (`member`) |
|---|:---:|:---:|
| Xem mọi brand + dữ liệu con | ✅ | ✅ |
| **Tạo** brand | ✅ | ❌ |
| **Xóa** brand (soft delete) | ✅ | ❌ |
| Sửa brand (tên/mô tả) | ✅ | ✅ |
| Sửa sản phẩm (`brand_products`) | ✅ | ✅ |
| Sửa Brand Kit (logo/font/màu) | ✅ | ✅ |
| Cấu hình Apify (task_id/cron) | ✅ | ❌ |
| Tạo content (script/transcribe/ads/persona/saved ad/stealth…) | ✅ | ✅ |

---

## 3. Tầng DB / RLS (migration `12_shared_workspace_rls.sql`)

### 3.1 Helper functions (SECURITY DEFINER, STABLE)

```sql
-- Đang đăng nhập + active
create or replace function public.is_active_user() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

-- Là admin (ceo/super_admin) + active
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role in ('ceo','super_admin')
  );
$$;
```

### 3.2 Policy theo bảng

| Bảng | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `brands` | `is_active_user()` | `is_admin()` | `is_active_user()` † | `is_admin()` |
| `brand_products` | `is_active_user()` | `is_active_user()` | `is_active_user()` | `is_active_user()` |
| `brand_kits` | `is_active_user()` | `is_active_user()` | `is_active_user()` | `is_active_user()` |
| `brand_apify_config` | `is_active_user()` | `is_admin()` | `is_admin()` | `is_admin()` |
| content con (scripts, transcripts, persona_profiles, saved_ads, stealth_scenes, generated_audio…) | `is_active_user()` | `is_active_user()` | `is_active_user()` | `is_active_user()` |

Tất cả policy cũ dựa trên `owner_user_id = auth.uid()` (gồm policy `brand_apify_config_all`
trong migration 10) bị **DROP và thay** bằng các policy trên.

### 3.3 Soft-delete guard (trigger)

`deleteBrand` = `UPDATE brands SET deleted_at = now()`. RLS UPDATE không phân biệt được
"sửa tên" (collab OK) với "set deleted_at" (admin only). Giải pháp:

```sql
create or replace function public.guard_brand_admin_columns()
  returns trigger language plpgsql security definer set search_path = public as $$
  begin
    if (new.deleted_at is distinct from old.deleted_at
        or new.owner_user_id is distinct from old.owner_user_id)
       and not public.is_admin() then
      raise exception 'only admin can change deleted_at/owner_user_id';
    end if;
    return new;
  end;
$$;

create trigger brands_guard_admin_columns
  before update on public.brands
  for each row execute function public.guard_brand_admin_columns();
```

Collab update tên/mô tả thoải mái; đụng `deleted_at`/`owner_user_id` → bị chặn ở DB.

### 3.4 Lưu ý nhất quán role

Client suy ra role từ `is_platform_admin` trả về bởi `/api/user/me`
([context.tsx:45](../../../src/features/auth/context.tsx#L45)), trong khi DB dùng cột `role`.
Migration phải đảm bảo `is_platform_admin = (role in ('ceo','super_admin'))` — hoặc đổi
`/api/user/me` trả thẳng `role` để client gating khớp với RLS server-side. Spec chọn:
**đảm bảo `is_platform_admin` đồng bộ với `role`** (giữ contract client hiện tại).

---

## 4. Tầng Service & API Routes

RLS là nguồn sự thật → service bỏ filter owner ở đường đọc; route thêm guard admin cho
hành động nhạy cảm (403 thân thiện + phòng thủ 2 lớp).

### 4.1 Services
- `BrandService.listBrands` → bỏ `.eq('owner_user_id', userId)`, giữ `.is('deleted_at', null)`.
- `BrandService.getBrandById` → bỏ filter owner.
- `BrandService.updateBrand` → bỏ filter owner (RLS + trigger lo).
- `verifyBrandOwnership` (BrandKitService, brandProductService, personaService,
  savedAdService, stealthSceneService…) → đổi thành `verifyBrandExists`: chỉ check brand
  tồn tại + `deleted_at IS NULL`, **bỏ** `.eq('owner_user_id', userId)`.
- `createBrand` / `deleteBrand` giữ logic; RLS chặn nếu không phải admin.
- `owner_user_id` vẫn lưu ở `brands` làm attribution "ai tạo", không dùng lọc quyền xem.

### 4.2 Routes (thêm `verifyAdmin` guard — dùng [verify-admin.ts](../../../src/lib/auth/verify-admin.ts))
- `POST /api/brands` (tạo) → require admin.
- `DELETE /api/brands/[id]` (xóa) → require admin.
- `PUT /api/video/apify-config` → require admin.
- Còn lại (list/get/update brand, products, kit, content) → `requireUser` như cũ.

---

## 5. UI / Flow

### 5.1 Onboarding
Member đăng nhập → vào thẳng pool brand chung, **không có bước tạo brand**.
Pool rỗng → empty state "Chưa có brand, liên hệ admin" (member không thấy nút tạo).

### 5.2 Gating bằng `isAdmin(profile.role)` (helper sẵn có [auth/types.ts](../../../src/features/auth/types.ts))
- Ẩn nút **"Tạo brand"** & **"Xóa brand"** với member.
- Form Apify config: member thấy **read-only** (trạng thái sync, `last_synced_at`),
  không sửa task_id / toggle cron.
- Brand edit, Products tab, Brand Kit: member **dùng đầy đủ** như admin.

---

## 6. Apify (không đổi cấu trúc)

Cron [sync-apify](../../../src/app/api/cron/sync-apify/route.ts) đã tự quét mọi config
`is_enabled` bằng admin client (bypass RLS) → **giữ nguyên**. "Tự động khi tạo brand" =
admin dán `task_id` ở form tạo brand → ghi `brand_apify_config` → cron tự cuốn vào vòng
sync. Không cần cron-job-per-brand riêng. Lịch scrape vẫn nằm trong Apify; app chỉ pull
run SUCCEEDED gần nhất.

---

## 7. Dọn dẹp & Test

- **Regenerate `database.types.ts`** sau migration (đang stale — thiếu `role`, `is_active`,
  `department`, `is_platform_admin` đồng bộ…).
- **Cập nhật [user-isolation.test.ts](../../../src/__tests__/user-isolation.test.ts):**
  tiền đề "user A không thấy brand user B" đảo ngược → mọi active user thấy chung pool.
- **Thêm test RLS:** member bị chặn tạo/xóa brand + sửa apify; admin được; trigger
  soft-delete chặn member set `deleted_at`.

---

## 8. Phạm vi KHÔNG làm (YAGNI)

- Không làm app tự tạo Apify task qua API (chốt: paste task_id thủ công).
- Không làm membership/org table hay chia nhóm (chốt: 1 pool chung).
- Không làm share-per-brand chọn lọc.
- Không làm permission ngoài 2 cấp admin/member.

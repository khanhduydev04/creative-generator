# Plan B — Option B: Pull-cron đồng bộ Apify (thay webhook)

**Bối cảnh & quyết định:** Tần suất cào chỉ ~2 lần/tuần → webhook realtime là overkill và
kéo theo gánh nặng bảo mật (admin client bypass RLS, cần verify chữ ký) + rủi ro timeout 30s.
Chọn **pull-cron**: một Vercel Cron gọi định kỳ, tự lấy dataset của **lần run SUCCEEDED gần
nhất** cho mỗi brand qua Apify API, rồi upsert. Không có inbound endpoint công khai, dễ retry,
không bị giới hạn timeout của webhook.

**Tiền đề:** Plan A đã xong (`upsertVideos` gọi RPC giữ nguyên `status`). Cron tái cào liên tục
nên BẮT BUỘC có Plan A trước, nếu không mỗi lần cron chạy sẽ reset status.

**Luồng:**
```
Apify Schedule (cấu hình trên apify.com, mỗi brand 1 actor-task)
        │  chạy định kỳ, sinh dataset mới mỗi run
        ▼
Vercel Cron  ── GET /api/cron/sync-apify  (header Authorization: Bearer CRON_SECRET)
        │   với mỗi brand_apify_config (is_enabled = true):
        │     1. GET Apify: last SUCCEEDED run của task → { runId, defaultDatasetId }
        │     2. nếu runId === last_run_id → skip (đã sync)
        │     3. GET dataset items → upsertVideos(brandId, items, runId)  [RPC, giữ status]
        │     4. update last_run_id / last_dataset_id / last_synced_at
        ▼
competitor_videos  ──►  UI Stage 2 (Winner) ──► Stage 3/4/5 (không đổi)
```

**Apify API dùng:**
- Last succeeded run của task:
  `GET https://api.apify.com/v2/actor-tasks/{taskId}/runs/last?status=SUCCEEDED&token={APIFY_TOKEN}`
  → `{ data: { id, defaultDatasetId, status, finishedAt, ... } }`
- Dataset items:
  `GET https://api.apify.com/v2/datasets/{datasetId}/items?clean=true&format=json&token={APIFY_TOKEN}`

---

## File Map

**Create:**
- `supabase/migrations/10_brand_apify_config.sql` — bảng cấu hình Apify per-brand + RLS
- `src/services/apifySyncService.ts` — logic fetch last run + dataset (dùng chung cron & manual)
- `src/services/brandApifyConfigService.ts` — CRUD `brand_apify_config`
- `src/app/api/cron/sync-apify/route.ts` — endpoint cron (GET, verify CRON_SECRET)
- `src/app/api/video/apify-config/route.ts` — GET + PUT config cho UI (optional task 6)
- `vercel.json` — lịch cron

**Modify:**
- `src/lib/env.ts` — thêm `APIFY_TOKEN` (optional), `CRON_SECRET` (optional)
- `.env.local.template` — tài liệu 2 biến mới
- `src/features/video/types.ts` — thêm type `BrandApifyConfig`
- `src/lib/query/keys.ts` — thêm key `apifyConfig` (cho UI task 6)

---

## Task 1 — Migration: bảng `brand_apify_config`

**File:** Create `supabase/migrations/10_brand_apify_config.sql`

- [ ] **Step 1:** Viết migration:

```sql
-- supabase/migrations/10_brand_apify_config.sql
-- Per-brand Apify pull-sync config. One row per brand (UNIQUE brand_id).

BEGIN;

CREATE TABLE public.brand_apify_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID        NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  apify_task_id   TEXT        NOT NULL,
  is_enabled      BOOLEAN     NOT NULL DEFAULT true,
  last_run_id     TEXT,
  last_dataset_id TEXT,
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX brand_apify_config_enabled_idx
  ON public.brand_apify_config(is_enabled) WHERE is_enabled = true;

DROP TRIGGER IF EXISTS brand_apify_config_set_updated_at ON public.brand_apify_config;
CREATE TRIGGER brand_apify_config_set_updated_at
  BEFORE UPDATE ON public.brand_apify_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.brand_apify_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_apify_config_all ON public.brand_apify_config
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

COMMIT;
```

- [ ] **Step 2:** Apply trên Supabase. Verify table + RLS:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname='public' AND tablename='brand_apify_config';
```

Kỳ vọng: 1 dòng, `rowsecurity = true`. (Cron dùng admin client nên bypass RLS khi đọc.)

---

## Task 2 — Env vars

**Files:** Modify `src/lib/env.ts`, `.env.local.template`

- [ ] **Step 1:** Trong `ENV_SCHEMA` (`src/lib/env.ts`) thêm 2 entry (đều `required: false` để app
vẫn boot khi chưa cấu hình; pull-sync chỉ là tính năng tuỳ chọn):

```typescript
  {
    name: "APIFY_TOKEN",
    required: false,
    isPublic: false,
    description: "Apify API token (pull-sync competitor videos)",
  },
  {
    name: "CRON_SECRET",
    required: false,
    isPublic: false,
    description: "Shared secret Vercel Cron gửi qua Authorization header",
  },
```

- [ ] **Step 2:** Thêm vào `.env.local.template`:

```
# ─── Apify pull-sync (OPTIONAL) ──────────────────────────────────────────────
# Token: https://console.apify.com/account/integrations
APIFY_TOKEN=apify_api_...
# Secret để bảo vệ /api/cron/sync-apify. Vercel Cron tự gửi: Authorization: Bearer <CRON_SECRET>
# Tạo: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CRON_SECRET=
```

- [ ] **Step 3:** `npx tsc --noEmit` → 0 lỗi.

---

## Task 3 — `apifySyncService.ts` (logic dùng chung)

**File:** Create `src/services/apifySyncService.ts`

- [ ] **Step 1:** Viết service. Nó KHÔNG đụng DB — chỉ gọi Apify API và trả về items + runId.
Upsert do caller làm (qua `CompetitorVideoService.upsertVideos`).

```typescript
import type { ApifyVideoItem } from "@/services/competitorVideoService";

const APIFY_BASE = "https://api.apify.com/v2";
const RUN_FETCH_TIMEOUT_MS = 15_000;
const DATASET_FETCH_TIMEOUT_MS = 25_000;

export interface ApifyLastRun {
  runId: string;
  datasetId: string;
}

interface ApifyRunResponse {
  data?: { id?: string; defaultDatasetId?: string; status?: string };
}

/** Lấy run SUCCEEDED gần nhất của một actor-task. Trả null nếu chưa có run nào. */
export async function fetchLastSucceededRun(
  taskId: string,
  token: string,
): Promise<ApifyLastRun | null> {
  const url = `${APIFY_BASE}/actor-tasks/${encodeURIComponent(taskId)}/runs/last?status=SUCCEEDED&token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(RUN_FETCH_TIMEOUT_MS) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`apify_run_fetch_failed_${res.status}`);

  // Safe: Apify trả JSON theo shape ApifyRunResponse
  const json = (await res.json()) as ApifyRunResponse;
  const runId = json.data?.id;
  const datasetId = json.data?.defaultDatasetId;
  if (!runId || !datasetId) return null;
  return { runId, datasetId };
}

/** Lấy toàn bộ items của một dataset. */
export async function fetchDatasetItems(
  datasetId: string,
  token: string,
): Promise<ApifyVideoItem[]> {
  const url = `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(DATASET_FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`apify_dataset_fetch_failed_${res.status}`);
  // Safe: dataset items endpoint trả mảng JSON theo shape ApifyVideoItem
  return (await res.json()) as ApifyVideoItem[];
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → 0 lỗi.

---

## Task 4 — `brandApifyConfigService.ts`

**File:** Create `src/services/brandApifyConfigService.ts`

- [ ] **Step 1:** Viết service CRUD + cập nhật trạng thái sync:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandApifyConfig } from "@/features/video/types";

export class BrandApifyConfigService {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Tất cả config đang bật — dùng bởi cron (admin client). */
  async listEnabled(): Promise<BrandApifyConfig[]> {
    const { data, error } = await this.supabase
      .from("brand_apify_config")
      .select("*")
      .eq("is_enabled", true);
    if (error) throw new Error(error.message);
    return (data ?? []) as BrandApifyConfig[];
  }

  async getByBrand(brandId: string): Promise<BrandApifyConfig | null> {
    const { data, error } = await this.supabase
      .from("brand_apify_config")
      .select("*")
      .eq("brand_id", brandId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as BrandApifyConfig | null;
  }

  async upsertConfig(
    brandId: string,
    apifyTaskId: string,
    isEnabled: boolean,
  ): Promise<BrandApifyConfig> {
    const { data, error } = await this.supabase
      .from("brand_apify_config")
      .upsert(
        { brand_id: brandId, apify_task_id: apifyTaskId, is_enabled: isEnabled },
        { onConflict: "brand_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as BrandApifyConfig;
  }

  async markSynced(
    brandId: string,
    runId: string,
    datasetId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("brand_apify_config")
      .update({
        last_run_id: runId,
        last_dataset_id: datasetId,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("brand_id", brandId);
    if (error) throw new Error(error.message);
  }

  async markError(brandId: string, message: string): Promise<void> {
    const { error } = await this.supabase
      .from("brand_apify_config")
      .update({ last_error: message })
      .eq("brand_id", brandId);
    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 2:** Thêm type vào `src/features/video/types.ts`:

```typescript
export interface BrandApifyConfig {
  id: string;
  brand_id: string;
  apify_task_id: string;
  is_enabled: boolean;
  last_run_id: string | null;
  last_dataset_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3:** `npx tsc --noEmit` → 0 lỗi.

---

## Task 5 — Cron route `/api/cron/sync-apify`

**File:** Create `src/app/api/cron/sync-apify/route.ts`

- [ ] **Step 1:** Viết route. Verify `CRON_SECRET` qua header; dùng admin client (bypass RLS để
đọc mọi brand); xử lý từng brand trong try/catch riêng để 1 brand lỗi không chặn brand khác.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandApifyConfigService } from "@/services/brandApifyConfigService";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import { fetchLastSucceededRun, fetchDatasetItems } from "@/services/apifySyncService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface BrandSyncResult {
  brandId: string;
  status: "synced" | "skipped" | "error";
  upserted?: number;
  message?: string;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "apify_token_missing" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const configService = new BrandApifyConfigService(supabase);
  const videoService = new CompetitorVideoService(supabase, "cron");

  const configs = await configService.listEnabled();
  const results: BrandSyncResult[] = [];

  for (const cfg of configs) {
    try {
      const lastRun = await fetchLastSucceededRun(cfg.apify_task_id, token);
      if (!lastRun) {
        results.push({ brandId: cfg.brand_id, status: "skipped", message: "no_run" });
        continue;
      }
      if (lastRun.runId === cfg.last_run_id) {
        results.push({ brandId: cfg.brand_id, status: "skipped", message: "already_synced" });
        continue;
      }

      const items = await fetchDatasetItems(lastRun.datasetId, token);
      const upserted = await videoService.upsertVideos(cfg.brand_id, items, lastRun.runId);
      await configService.markSynced(cfg.brand_id, lastRun.runId, lastRun.datasetId);
      results.push({ brandId: cfg.brand_id, status: "synced", upserted });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      console.error(`[cron/sync-apify] brand ${cfg.brand_id} failed:`, message);
      await configService.markError(cfg.brand_id, message).catch(() => undefined);
      results.push({ brandId: cfg.brand_id, status: "error", message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
```

- [ ] **Step 2:** `npx tsc --noEmit` → 0 lỗi.

---

## Task 6 — Cấu hình lịch Vercel Cron

**File:** Create `vercel.json` (root project)

- [ ] **Step 1:** Tạo `vercel.json` với lịch chạy (ví dụ Thứ 2 & Thứ 5, 02:00 UTC):

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-apify",
      "schedule": "0 2 * * 1,4"
    }
  ]
}
```

- [ ] **Step 2:** Trên Vercel → Project → Settings → Environment Variables: thêm `APIFY_TOKEN`
và `CRON_SECRET`. Vercel Cron tự gửi `Authorization: Bearer <CRON_SECRET>` khi biến tồn tại.

> **Lưu ý gói Vercel:** Hobby chỉ cho cron chạy 1 lần/ngày và lịch giới hạn. Nếu ở Hobby, đổi
> schedule thành `0 2 * * *` (mỗi ngày) — route đã idempotent (skip khi `runId` trùng) nên chạy
> dày hơn lịch Apify cũng vô hại. Pro/Enterprise dùng được lịch tuỳ ý như trên.

---

## Task 7 (Optional) — API config + UI quản lý task per-brand

> Nếu chưa muốn làm UI, có thể seed config trực tiếp bằng SQL:
> `INSERT INTO brand_apify_config (brand_id, apify_task_id) VALUES ('<uuid>', '<taskId>');`
> Task này thêm cách quản lý qua giao diện thay vì SQL tay.

**Files:**
- Create `src/app/api/video/apify-config/route.ts` (GET + PUT)
- Modify `src/lib/query/keys.ts` — thêm `apifyConfig: { detail: (brandId) => ["apify-config", brandId] }`
- Modify `src/app/app/video/page.tsx` — thêm ô nhập `apify_task_id` vào modal Sync hiện có

- [ ] **Step 1:** Route GET/PUT (user-scoped, dùng `requireUser` + RLS):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { BrandApifyConfigService } from "@/services/brandApifyConfigService";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");
    if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

    const supabase = await createClient();
    const config = await new BrandApifyConfigService(supabase).getByBrand(brandId);
    return NextResponse.json({ config });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireUser(request);
    const body = (await request.json()) as {
      brandId?: string;
      apifyTaskId?: string;
      isEnabled?: boolean;
    };
    if (!body.brandId || !body.apifyTaskId) {
      return NextResponse.json({ error: "brandId and apifyTaskId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const config = await new BrandApifyConfigService(supabase).upsertConfig(
      body.brandId,
      body.apifyTaskId.trim(),
      body.isEnabled ?? true,
    );
    return NextResponse.json({ config });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2:** Thêm vào modal Sync hiện có trên `/app/video/page.tsx` một ô input
`apify_task_id` + nút "Lưu cấu hình" gọi `PUT /api/video/apify-config`. (Có thể tái dùng
state modal sẵn có; chỉ thêm 1 input + 1 mutation.) Bổ sung i18n key tương ứng trong
`vi.ts`/`en.ts` (`apifyTaskId`, `saveConfig`, `configSaved`).

- [ ] **Step 3:** `npx tsc --noEmit && npm run build` → 0 lỗi, build pass.

---

## Quan hệ với webhook hiện có

- `/api/apify/webhook` và `/api/video/sync-apify` (sync tay theo datasetId) **giữ lại làm fallback**.
  Sau khi pull-cron chạy ổn, có thể tắt webhook trên Apify dashboard (không cần xóa code).
- Cả 3 đường (cron, webhook, sync tay) đều đi qua `upsertVideos` → RPC của Plan A → đều an toàn
  với `status`.

---

## Thứ tự thực thi

1. **Plan A trước** (bắt buộc — nếu không cron sẽ phá `status`).
2. Task 1 (migration) + Task 2 (env) — song song được.
3. Task 3 + Task 4 (services) — song song được.
4. Task 5 (cron route) — phụ thuộc Task 3+4.
5. Task 6 (vercel.json) — phụ thuộc Task 5.
6. Task 7 (UI config) — optional, làm cuối hoặc seed SQL tay.

**Kiểm thử nhanh sau khi xong (local):** set `CRON_SECRET` + `APIFY_TOKEN` trong `.env.local`,
seed 1 config bằng SQL, rồi:
```
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/sync-apify
```
Kỳ vọng JSON `{ ok: true, results: [{ status: "synced", upserted: N }] }`, và DB có video mới.

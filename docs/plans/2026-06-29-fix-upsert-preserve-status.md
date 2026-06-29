# Plan A — RPC upsert giữ nguyên `status` khi re-scrape

**Vấn đề:** `CompetitorVideoService.upsertVideos` đang gọi
`.upsert(rows, { onConflict: "brand_id,tiktok_url", ignoreDuplicates: false })`
với `status: "pending"` cứng trong mỗi row. Khi scheduled run cào lại cùng 1 video,
upsert **update toàn bộ cột** → `status` của video đã được nhân sự đánh `winner`/`rejected`
bị reset về `pending`. Mất quyết định của con người mỗi lần cron chạy.

**Mục tiêu:** Khi conflict, **chỉ cập nhật metrics** (views/likes/shares/comments/scraped_at/
author_handle/cover_url/apify_run_id) và **giữ nguyên** `status`, `scrape_status`, `created_at`.
Row mới (chưa tồn tại) vẫn insert với `status='pending'` như cũ.

**Cách làm:** Tạo Postgres function `upsert_competitor_videos` dùng
`INSERT ... ON CONFLICT DO UPDATE SET <chỉ metrics>`, để `CompetitorVideoService.upsertVideos`
gọi qua `supabase.rpc(...)`. Phần mapping field theo actor (Apify) vẫn giữ ở TypeScript.

**Bảo mật / RLS:** Function để mặc định `SECURITY INVOKER` (KHÔNG dùng `SECURITY DEFINER`).
- Webhook gọi bằng **admin client** (service role) → service role bypass RLS → chạy được.
- Manual sync gọi bằng **client của user đã đăng nhập** → RLS policy `competitor_videos_all`
  (kiểm tra brand ownership) vẫn áp dụng → user chỉ ghi được vào brand của mình.
Đây chính là hành vi mong muốn; tuyệt đối không đặt `SECURITY DEFINER` (sẽ thành lỗ hổng
leo thang quyền cho manual sync).

---

## File Map

**Create:**
- `supabase/migrations/09_upsert_competitor_videos_rpc.sql` — function RPC mới

**Modify:**
- `src/services/competitorVideoService.ts` — `upsertVideos` gọi RPC thay vì `.upsert`

---

## Task 1 — Migration: function `upsert_competitor_videos`

**File:** Create `supabase/migrations/09_upsert_competitor_videos_rpc.sql`

- [ ] **Step 1:** Viết file migration:

```sql
-- supabase/migrations/09_upsert_competitor_videos_rpc.sql
-- Upsert competitor videos but PRESERVE human-set status on conflict.
-- On INSERT: status defaults to 'pending'. On CONFLICT: only metrics are updated;
-- status / scrape_status / created_at are left untouched.
-- SECURITY INVOKER (default) so existing RLS on competitor_videos still applies for
-- authenticated callers; the service-role (webhook) caller bypasses RLS as usual.

BEGIN;

CREATE OR REPLACE FUNCTION public.upsert_competitor_videos(
  p_brand_id     uuid,
  p_videos       jsonb,
  p_apify_run_id text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.competitor_videos (
    brand_id, tiktok_url, video_id, views, likes, shares, comments,
    author_handle, cover_url, scraped_at, apify_run_id, status, scrape_status
  )
  SELECT
    p_brand_id,
    elem->>'tiktok_url',
    elem->>'video_id',
    (elem->>'views')::bigint,
    (elem->>'likes')::bigint,
    (elem->>'shares')::bigint,
    (elem->>'comments')::bigint,
    elem->>'author_handle',
    elem->>'cover_url',
    NULLIF(elem->>'scraped_at', '')::timestamptz,
    p_apify_run_id,
    'pending',
    'success'
  FROM jsonb_array_elements(p_videos) AS elem
  WHERE elem->>'tiktok_url' IS NOT NULL
  ON CONFLICT (brand_id, tiktok_url) DO UPDATE SET
    views         = EXCLUDED.views,
    likes         = EXCLUDED.likes,
    shares        = EXCLUDED.shares,
    comments      = EXCLUDED.comments,
    author_handle = COALESCE(EXCLUDED.author_handle, public.competitor_videos.author_handle),
    cover_url     = COALESCE(EXCLUDED.cover_url, public.competitor_videos.cover_url),
    scraped_at    = COALESCE(EXCLUDED.scraped_at, public.competitor_videos.scraped_at),
    apify_run_id  = COALESCE(EXCLUDED.apify_run_id, public.competitor_videos.apify_run_id);
    -- NOTE: status, scrape_status, created_at, video_id are intentionally NOT updated

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMIT;
```

- [ ] **Step 2:** Apply trên Supabase (SQL Editor → New query → paste & run).

- [ ] **Step 3:** Verify function tồn tại:

```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'upsert_competitor_videos';
```

Kỳ vọng: 1 dòng, `prosecdef = false` (tức INVOKER, không phải DEFINER).

---

## Task 2 — Sửa `upsertVideos` để gọi RPC

**File:** Modify `src/services/competitorVideoService.ts`

- [ ] **Step 1:** Thay thân method `upsertVideos` (giữ nguyên signature + phần `.filter`/`.map`,
chỉ đổi cách map row cho khớp tên cột RPC và đổi `.upsert` → `.rpc`):

```typescript
  async upsertVideos(
    brandId: string,
    items: ApifyVideoItem[],
    apifyRunId?: string,
  ): Promise<number> {
    if (items.length === 0) return 0;

    const rows = items
      .filter((item) => item.webVideoUrl?.includes("tiktok.com"))
      .map((item) => ({
        tiktok_url: item.webVideoUrl!,
        video_id: item.id ?? extractTikTokVideoId(item.webVideoUrl!),
        views: item.playCount ?? null,
        likes: item.diggCount ?? null,
        shares: item.shareCount ?? null,
        comments: item.commentCount ?? null,
        author_handle: item.authorMeta?.name ?? null,
        // Safe: handles both object {default} format (clockworks) and legacy string[] format
        cover_url: Array.isArray(item.covers)
          ? (item.covers[0] ?? null)
          : (item.covers?.default ?? null),
        scraped_at: item.createTime
          ? new Date(item.createTime * 1000).toISOString()
          : new Date().toISOString(),
      }));

    if (rows.length === 0) return 0;

    const { data, error } = await this.supabase.rpc("upsert_competitor_videos", {
      p_brand_id: brandId,
      p_videos: rows,
      p_apify_run_id: apifyRunId ?? null,
    });

    if (error) throw new Error(error.message);
    // Safe: RPC returns an integer row count
    return typeof data === "number" ? data : rows.length;
  }
```

> Lưu ý: bỏ các field `brand_id`, `status`, `scrape_status`, `apify_run_id` khỏi từng row
> (RPC tự gắn). `extractTikTokVideoId` ở cuối file giữ nguyên.

- [ ] **Step 2:** TypeScript check:

```
npx tsc --noEmit
```

Kỳ vọng: 0 lỗi.

---

## Task 3 — Smoke test (regression cho bug status)

- [ ] **Step 1:** Trong Supabase SQL Editor, lấy 1 `brand_id` thật rồi chạy:

```sql
-- Insert lần 1 (giả lập scrape lần đầu)
SELECT public.upsert_competitor_videos(
  '<BRAND_UUID>'::uuid,
  '[{"tiktok_url":"https://www.tiktok.com/@x/video/123","video_id":"123","views":1000,"likes":50,"shares":1,"comments":2,"author_handle":"x","cover_url":null,"scraped_at":"2026-06-29T00:00:00Z"}]'::jsonb,
  'run_test_1'
);

-- Nhân sự đánh winner
UPDATE public.competitor_videos
SET status = 'winner'
WHERE tiktok_url = 'https://www.tiktok.com/@x/video/123';

-- Insert lần 2 (giả lập scheduled run cào lại, views tăng)
SELECT public.upsert_competitor_videos(
  '<BRAND_UUID>'::uuid,
  '[{"tiktok_url":"https://www.tiktok.com/@x/video/123","video_id":"123","views":99999,"likes":8000,"shares":10,"comments":20,"author_handle":"x","cover_url":null,"scraped_at":"2026-07-06T00:00:00Z"}]'::jsonb,
  'run_test_2'
);

-- Kiểm tra: status PHẢI vẫn là 'winner', views PHẢI = 99999
SELECT status, views, likes, apify_run_id, scraped_at
FROM public.competitor_videos
WHERE tiktok_url = 'https://www.tiktok.com/@x/video/123';
```

Kỳ vọng: `status = 'winner'` (giữ nguyên), `views = 99999` (đã update). Sau đó xóa row test.

- [ ] **Step 2:** `npm run build` — kỳ vọng build pass.

---

## Thứ tự thực thi

Task 1 → Task 2 → Task 3. Không có việc song song.
Plan B (pull-cron) phụ thuộc plan này: nó dùng `upsertVideos` đã sửa.

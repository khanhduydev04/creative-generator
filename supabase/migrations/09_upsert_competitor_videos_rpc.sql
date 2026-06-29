-- supabase/migrations/09_upsert_competitor_videos_rpc.sql
-- Upsert competitor videos but PRESERVE human-set status on conflict.
-- On INSERT: status defaults to 'pending'. On CONFLICT: only metrics are updated;
-- status / scrape_status / created_at / video_id are left untouched.
-- SECURITY INVOKER (default) so existing RLS on competitor_videos still applies for
-- authenticated callers; the service-role (webhook/cron) caller bypasses RLS as usual.

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
    -- NOTE: status, scrape_status, created_at, video_id intentionally NOT updated

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMIT;

-- Page view tracking table
CREATE TABLE public.page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_session_path ON public.page_views (session_id, path);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY page_views_admin_read ON public.page_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = true)
  );

-- RPC functions for analytics aggregation
CREATE OR REPLACE FUNCTION public.count_unique_sessions(since_date TIMESTAMPTZ)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT session_id) FROM public.page_views WHERE created_at >= since_date;
$$;

CREATE OR REPLACE FUNCTION public.daily_page_view_stats(since_date TIMESTAMPTZ)
RETURNS TABLE(date TEXT, views BIGINT, visitors BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    to_char(created_at::date, 'YYYY-MM-DD') AS date,
    COUNT(*) AS views,
    COUNT(DISTINCT session_id) AS visitors
  FROM public.page_views
  WHERE created_at >= since_date
  GROUP BY created_at::date
  ORDER BY created_at::date;
$$;

CREATE OR REPLACE FUNCTION public.top_pages(since_date TIMESTAMPTZ, page_limit INT)
RETURNS TABLE(path TEXT, views BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT path, COUNT(*) AS views
  FROM public.page_views
  WHERE created_at >= since_date
  GROUP BY path
  ORDER BY views DESC
  LIMIT page_limit;
$$;

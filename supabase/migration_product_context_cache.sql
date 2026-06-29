-- Migration: Add product URL + cached product context to brand_products
-- Run this in Supabase SQL Editor

-- Product landing page URL (persisted so users don't re-enter each session)
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS product_url text;

-- Full ProductContext JSON blob (scraped via Gemini, cached for reuse)
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS cached_product_context jsonb;

-- When the context was last scraped (for staleness checks)
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS context_cached_at timestamptz;

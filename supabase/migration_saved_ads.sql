-- Migration: Create saved_ads metadata table
-- Tracks saved ad images with product association for filtering
-- Storage remains in Supabase Storage (generated-ads bucket); this table stores metadata

CREATE TABLE IF NOT EXISTS saved_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  product_id UUID REFERENCES brand_products(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  headline TEXT,
  concept TEXT,
  prompt TEXT,
  source TEXT NOT NULL DEFAULT 'workspace',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_saved_ads_brand_id ON saved_ads(brand_id);
CREATE INDEX idx_saved_ads_brand_product ON saved_ads(brand_id, product_id);
CREATE INDEX idx_saved_ads_created_at ON saved_ads(created_at DESC);

-- RLS policies
ALTER TABLE saved_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read saved_ads"
  ON saved_ads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert saved_ads"
  ON saved_ads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete saved_ads"
  ON saved_ads FOR DELETE
  TO authenticated
  USING (true);

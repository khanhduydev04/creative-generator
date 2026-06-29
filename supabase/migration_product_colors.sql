-- Migration: Add per-product color columns to brand_products
-- Products can override brand colors for ad generation.
-- NULL = fall back to brand-level colors.

ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS primary_color_1 text;
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS primary_color_2 text;
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS secondary_color_1 text;
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS secondary_color_2 text;
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS accent_color_1 text;
ALTER TABLE brand_products ADD COLUMN IF NOT EXISTS accent_color_2 text;

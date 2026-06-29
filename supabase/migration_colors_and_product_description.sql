-- Migration: Expand brand colors to 2 per tier + add product description
-- Date: 2026-03-12

-- ─── 1. brand_kits: rename old color columns and add new ones ───────────────

-- Rename existing single-color columns to _1 variants
ALTER TABLE brand_kits RENAME COLUMN primary_color TO primary_color_1;
ALTER TABLE brand_kits RENAME COLUMN secondary_color TO secondary_color_1;
ALTER TABLE brand_kits RENAME COLUMN accent_color TO accent_color_1;

-- Add _2 variant columns
ALTER TABLE brand_kits ADD COLUMN primary_color_2 text;
ALTER TABLE brand_kits ADD COLUMN secondary_color_2 text;
ALTER TABLE brand_kits ADD COLUMN accent_color_2 text;

-- ─── 2. brand_products: add description column ─────────────────────────────

ALTER TABLE brand_products ADD COLUMN description text;

-- Migration: stealth_scenes table for custom scene library (per-brand)
-- Run this in the Supabase SQL editor

create table stealth_scenes (
  id                uuid primary key default gen_random_uuid(),
  brand_id          uuid not null references brands(id) on delete cascade,
  scene_id          text not null,
  category          text not null,
  name              text not null,
  description       text not null,
  placement_method  text not null,
  best_for_products text[] not null default '{}',
  best_for_audiences text[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(brand_id, scene_id)
);

-- Index for fast lookup by brand
create index idx_stealth_scenes_brand_id on stealth_scenes(brand_id);

-- RLS policies (same pattern as product_markets)
alter table stealth_scenes enable row level security;

create policy "Users can read stealth scenes for their brands"
  on stealth_scenes for select
  using (true);

create policy "Users can insert stealth scenes"
  on stealth_scenes for insert
  with check (true);

create policy "Users can update stealth scenes"
  on stealth_scenes for update
  using (true);

create policy "Users can delete stealth scenes"
  on stealth_scenes for delete
  using (true);

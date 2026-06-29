-- ============================================================
-- Migration: Add brand_products table
-- Run this in Supabase SQL Editor after the initial migration
-- ============================================================

-- ─── 15. brand_products ──────────────────────────────────────
create table if not exists public.brand_products (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_brand_products_brand_id on public.brand_products(brand_id);

-- RLS
alter table public.brand_products enable row level security;

create policy "Allow all for anon" on public.brand_products
  for all to anon using (true) with check (true);

create policy "Allow all for authenticated" on public.brand_products
  for all to authenticated using (true) with check (true);

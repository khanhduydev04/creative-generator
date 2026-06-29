-- Migration: product_markets
-- Per-product market system with competitor data source

create table product_markets (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references brand_products(id) on delete cascade,
  market_code     text not null,
  market_label    text not null,
  language        text not null default 'en-US',
  sheet_url       text,
  spreadsheet_id  text,
  sheet_gid       integer,
  sheet_name      text,
  cached_csv      text,
  cached_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(product_id, market_code)
);

-- Index for fast lookups by product
create index idx_product_markets_product_id on product_markets(product_id);

-- Enable RLS
alter table product_markets enable row level security;

-- Permissive policies (matching brand_products pattern)
create policy "Allow anon read product_markets"
  on product_markets for select to anon using (true);

create policy "Allow anon insert product_markets"
  on product_markets for insert to anon with check (true);

create policy "Allow anon update product_markets"
  on product_markets for update to anon using (true) with check (true);

create policy "Allow anon delete product_markets"
  on product_markets for delete to anon using (true);

create policy "Allow authenticated read product_markets"
  on product_markets for select to authenticated using (true);

create policy "Allow authenticated insert product_markets"
  on product_markets for insert to authenticated with check (true);

create policy "Allow authenticated update product_markets"
  on product_markets for update to authenticated using (true) with check (true);

create policy "Allow authenticated delete product_markets"
  on product_markets for delete to authenticated using (true);

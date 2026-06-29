-- ============================================================
-- Static Ads Generator — Full Database Migration
-- Supabase Project: zkfpstjatlsrcbzrqklm
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── 1. clients ────────────────────────────────────────────
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ─── 2. brands ─────────────────────────────────────────────
create table public.brands (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_brands_client_id on public.brands(client_id);

-- ─── 3. brand_kits ─────────────────────────────────────────
create table public.brand_kits (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  typography text,
  font_source text check (font_source in ('google', 'local')),
  font_file_paths jsonb,
  font_specimen_path text,
  primary_color text,
  secondary_color text,
  accent_color text,
  logo_light_path text,
  logo_dark_path text,
  updated_at timestamptz not null default now()
);

create unique index idx_brand_kits_brand_id on public.brand_kits(brand_id);

-- ─── 4. brand_research_summaries ───────────────────────────
create table public.brand_research_summaries (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_brand_research_summaries_brand_id on public.brand_research_summaries(brand_id);

-- ─── 5. persona_profiles ───────────────────────────────────
create table public.persona_profiles (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  research_summary_id uuid references public.brand_research_summaries(id) on delete set null,
  title text not null,
  pain text,
  angle text,
  emotion text,
  source text not null check (source in ('ai', 'manual')),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_persona_profiles_brand_id on public.persona_profiles(brand_id);

-- ─── 6. campaigns ──────────────────────────────────────────
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'generating', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaigns_client_id on public.campaigns(client_id);
create index idx_campaigns_brand_id on public.campaigns(brand_id);

-- ─── 7. campaign_reference_inputs ──────────────────────────
create table public.campaign_reference_inputs (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  style_reference_path text,
  product_identity_path text,
  brand_asset_path text,
  updated_at timestamptz not null default now()
);

create unique index idx_campaign_reference_inputs_campaign_id on public.campaign_reference_inputs(campaign_id);

-- ─── 8. campaign_selected_profiles (join table) ────────────
create table public.campaign_selected_profiles (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  persona_profile_id uuid not null references public.persona_profiles(id) on delete cascade,
  primary key (campaign_id, persona_profile_id)
);

-- ─── 9. campaign_output_settings ───────────────────────────
create table public.campaign_output_settings (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  requested_output_count integer not null default 5,
  aspect_ratio text not null default '1:1' check (aspect_ratio in ('1:1', '4:5', '9:16')),
  use_brand_kit boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index idx_campaign_output_settings_campaign_id on public.campaign_output_settings(campaign_id);

-- ─── 10. reference_analyses ────────────────────────────────
create table public.reference_analyses (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  analysis_json jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_reference_analyses_campaign_id on public.reference_analyses(campaign_id);

-- ─── 11. prompt_plans ──────────────────────────────────────
create table public.prompt_plans (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  plan_json jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_prompt_plans_campaign_id on public.prompt_plans(campaign_id);

-- ─── 12. generation_prompts ────────────────────────────────
create table public.generation_prompts (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  prompt_plan_id uuid references public.prompt_plans(id) on delete set null,
  persona_profile_id uuid references public.persona_profiles(id) on delete set null,
  prompt_text text not null,
  aspect_ratio text,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index idx_generation_prompts_campaign_id on public.generation_prompts(campaign_id);

-- ─── 13. generation_jobs ───────────────────────────────────
create table public.generation_jobs (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  job_type text not null,
  provider text,
  input_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_generation_jobs_campaign_id on public.generation_jobs(campaign_id);

-- ─── 14. generated_ads ─────────────────────────────────────
create table public.generated_ads (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  generation_prompt_id uuid references public.generation_prompts(id) on delete set null,
  persona_profile_id uuid references public.persona_profiles(id) on delete set null,
  parent_ad_id uuid references public.generated_ads(id) on delete set null,
  title text,
  segment_label text,
  angle_label text,
  image_path text not null,
  generation_prompt text,
  metadata_json jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_generated_ads_campaign_id on public.generated_ads(campaign_id);
create index idx_generated_ads_persona_profile_id on public.generated_ads(persona_profile_id);

-- ─── RLS Policies (permissive for now — tighten with auth later) ────
alter table public.clients enable row level security;
alter table public.brands enable row level security;
alter table public.brand_kits enable row level security;
alter table public.brand_research_summaries enable row level security;
alter table public.persona_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_reference_inputs enable row level security;
alter table public.campaign_selected_profiles enable row level security;
alter table public.campaign_output_settings enable row level security;
alter table public.reference_analyses enable row level security;
alter table public.prompt_plans enable row level security;
alter table public.generation_prompts enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generated_ads enable row level security;

-- Allow anon/authenticated full access (no auth implemented yet)
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'clients', 'brands', 'brand_kits', 'brand_research_summaries',
      'persona_profiles', 'campaigns', 'campaign_reference_inputs',
      'campaign_selected_profiles', 'campaign_output_settings',
      'reference_analyses', 'prompt_plans', 'generation_prompts',
      'generation_jobs', 'generated_ads'
    ])
  loop
    execute format(
      'create policy "Allow all for anon" on public.%I for all to anon using (true) with check (true)',
      tbl
    );
    execute format(
      'create policy "Allow all for authenticated" on public.%I for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

-- ─── Storage Buckets ───────────────────────────────────────
-- These must be created via Supabase Dashboard or API:
-- 1. brand-assets (public)
-- 2. campaign-inputs (public)
-- 3. generated-ads (public)
--
-- Or run these via Supabase SQL Editor:
insert into storage.buckets (id, name, public) values ('brand-assets', 'brand-assets', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('campaign-inputs', 'campaign-inputs', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('generated-ads', 'generated-ads', true) on conflict (id) do nothing;

-- Storage RLS: allow public read and anon upload
create policy "Public read brand-assets" on storage.objects for select to anon, authenticated using (bucket_id = 'brand-assets');
create policy "Anon upload brand-assets" on storage.objects for insert to anon, authenticated with check (bucket_id = 'brand-assets');
create policy "Anon update brand-assets" on storage.objects for update to anon, authenticated using (bucket_id = 'brand-assets');
create policy "Anon delete brand-assets" on storage.objects for delete to anon, authenticated using (bucket_id = 'brand-assets');

create policy "Public read campaign-inputs" on storage.objects for select to anon, authenticated using (bucket_id = 'campaign-inputs');
create policy "Anon upload campaign-inputs" on storage.objects for insert to anon, authenticated with check (bucket_id = 'campaign-inputs');
create policy "Anon update campaign-inputs" on storage.objects for update to anon, authenticated using (bucket_id = 'campaign-inputs');
create policy "Anon delete campaign-inputs" on storage.objects for delete to anon, authenticated using (bucket_id = 'campaign-inputs');

create policy "Public read generated-ads" on storage.objects for select to anon, authenticated using (bucket_id = 'generated-ads');
create policy "Anon upload generated-ads" on storage.objects for insert to anon, authenticated with check (bucket_id = 'generated-ads');
create policy "Anon update generated-ads" on storage.objects for update to anon, authenticated using (bucket_id = 'generated-ads');
create policy "Anon delete generated-ads" on storage.objects for delete to anon, authenticated using (bucket_id = 'generated-ads');

-- ─── Updated-at trigger function ───────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply auto-update triggers
create trigger set_updated_at before update on public.clients for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.brands for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.brand_kits for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.brand_research_summaries for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.campaigns for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.campaign_reference_inputs for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.campaign_output_settings for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.generation_jobs for each row execute function public.handle_updated_at();

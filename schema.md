-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.brands (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
name text NOT NULL,
description text,
deleted_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
owner_user_id uuid NOT NULL,
CONSTRAINT brands_pkey PRIMARY KEY (id),
CONSTRAINT brands_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.brand_kits (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
brand_id uuid NOT NULL,
typography text,
primary_color_1 text,
secondary_color_1 text,
accent_color_1 text,
logo_light_path text,
logo_dark_path text,
updated_at timestamp with time zone NOT NULL DEFAULT now(),
font_source text CHECK (font_source = ANY (ARRAY['google'::text, 'local'::text])),
font_file_paths jsonb,
font_specimen_path text,
primary_color_2 text,
secondary_color_2 text,
accent_color_2 text,
CONSTRAINT brand_kits_pkey PRIMARY KEY (id),
CONSTRAINT brand_kits_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.brand_research_summaries (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
brand_id uuid NOT NULL,
content text NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT brand_research_summaries_pkey PRIMARY KEY (id),
CONSTRAINT brand_research_summaries_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.persona_profiles (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
brand_id uuid NOT NULL,
research_summary_id uuid,
title text NOT NULL,
pain text,
angle text,
emotion text,
source text NOT NULL CHECK (source = ANY (ARRAY['ai'::text, 'manual'::text])),
deleted_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT persona_profiles_pkey PRIMARY KEY (id),
CONSTRAINT persona_profiles_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id),
CONSTRAINT persona_profiles_research_summary_id_fkey FOREIGN KEY (research_summary_id) REFERENCES public.brand_research_summaries(id)
);
CREATE TABLE public.kie_task_results (
task_id text NOT NULL,
status text NOT NULL DEFAULT 'pending'::text,
image_url text,
error_message text,
raw_payload jsonb,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT kie_task_results_pkey PRIMARY KEY (task_id)
);
CREATE TABLE public.brand_products (
id uuid NOT NULL DEFAULT uuid_generate_v4(),
brand_id uuid NOT NULL,
name text NOT NULL,
images ARRAY NOT NULL DEFAULT '{}'::text[],
created_at timestamp with time zone NOT NULL DEFAULT now(),
description text,
product_url text,
cached_product_context jsonb,
context_cached_at timestamp with time zone,
primary_color_1 text,
primary_color_2 text,
secondary_color_1 text,
secondary_color_2 text,
accent_color_1 text,
accent_color_2 text,
CONSTRAINT brand_products_pkey PRIMARY KEY (id),
CONSTRAINT brand_products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.concept_prompts (
id uuid NOT NULL DEFAULT gen_random_uuid(),
concept_id text NOT NULL UNIQUE,
label text NOT NULL,
description text DEFAULT ''::text,
requires_competitor boolean DEFAULT false,
created_at timestamp with time zone DEFAULT now(),
updated_at timestamp with time zone DEFAULT now(),
prompt text NOT NULL DEFAULT ''::text,
reference_images ARRAY DEFAULT '{}'::text[],
CONSTRAINT concept_prompts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.stealth_scenes (
id uuid NOT NULL DEFAULT gen_random_uuid(),
brand_id uuid NOT NULL,
scene_id text NOT NULL,
category text NOT NULL,
name text NOT NULL,
description text NOT NULL,
placement_method text NOT NULL,
best_for_products ARRAY NOT NULL DEFAULT '{}'::text[],
best_for_audiences ARRAY NOT NULL DEFAULT '{}'::text[],
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT stealth_scenes_pkey PRIMARY KEY (id),
CONSTRAINT stealth_scenes_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.profiles (
id uuid NOT NULL,
email text NOT NULL UNIQUE,
full_name text NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
created_by uuid,
is_platform_admin boolean NOT NULL DEFAULT false,
CONSTRAINT profiles_pkey PRIMARY KEY (id),
CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
CONSTRAINT profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.saved_ads (
id uuid NOT NULL DEFAULT gen_random_uuid(),
brand_id uuid NOT NULL,
product_id uuid,
storage_path text NOT NULL UNIQUE,
image_url text NOT NULL,
headline text,
concept text,
prompt text,
source text NOT NULL DEFAULT 'workspace'::text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT saved_ads_pkey PRIMARY KEY (id),
CONSTRAINT saved_ads_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id),
CONSTRAINT saved_ads_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.brand_products(id)
);
CREATE TABLE public.user_api_keys (
user_id uuid NOT NULL,
provider text NOT NULL CHECK (provider = ANY (ARRAY['anthropic'::text, 'google'::text, 'kie'::text])),
encrypted_key text NOT NULL,
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT user_api_keys_pkey PRIMARY KEY (user_id, provider),
CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_concepts (
id uuid NOT NULL DEFAULT gen_random_uuid(),
owner_user_id uuid NOT NULL,
label text NOT NULL,
description text,
prompt text NOT NULL,
reference_images ARRAY NOT NULL DEFAULT '{}'::text[],
requires_competitor boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT user_concepts_pkey PRIMARY KEY (id),
CONSTRAINT user_concepts_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.page_views (
id uuid NOT NULL DEFAULT gen_random_uuid(),
path text NOT NULL,
session_id text NOT NULL,
referrer text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT page_views_pkey PRIMARY KEY (id)
);

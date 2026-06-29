# Database Schema (Supabase PostgreSQL)

## Sơ đồ quan hệ

```
clients
  └── brands
        ├── brand_kits          (1:1)
        ├── brand_products      (1:N)
        │     └── product_markets (1:N)
        ├── brand_research_summaries (1:1)
        ├── persona_profiles    (1:N)
        │     └── generated_ads (1:N)
        └── concept_prompts     (global, không FK tới brands)
```

## Chi tiết các bảng

### clients
Khách hàng (agency/brand owner).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| name | text NOT NULL | Tên khách hàng |
| created_at | timestamptz | Thời điểm tạo |
| updated_at | timestamptz | Cập nhật lần cuối |
| deleted_at | timestamptz NULL | Soft delete |

### brands
Thương hiệu thuộc khách hàng.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| name | text NOT NULL | Tên thương hiệu |
| description | text NULL | Mô tả |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz NULL | Soft delete |

### brand_kits
Bộ nhận diện thương hiệu (colors, fonts, logos). Mỗi brand có 1 kit.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands | UNIQUE |
| typography | text NULL | Tên font (vd: "Inter", "Roboto") |
| font_source | text NULL | `'google'` hoặc `'local'` |
| font_file_paths | jsonb NULL | Đường dẫn file font local |
| font_specimen_path | text NULL | Ảnh mẫu font |
| logo_light_path | text NULL | Logo nền sáng |
| logo_dark_path | text NULL | Logo nền tối |
| primary_color_1 | text NULL | Hex color (vd: `#1A1A2E`) |
| primary_color_2 | text NULL | |
| secondary_color_1 | text NULL | |
| secondary_color_2 | text NULL | |
| accent_color_1 | text NULL | |
| accent_color_2 | text NULL | |
| updated_at | timestamptz | |

### brand_products
Sản phẩm thuộc thương hiệu. Mỗi sản phẩm có ảnh và landing page riêng.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands | |
| name | text NOT NULL | Tên sản phẩm |
| description | text NULL | Mô tả sản phẩm |
| images | text[] NOT NULL | Array URL ảnh sản phẩm (1-5) |
| created_at | timestamptz | |

### product_markets
Thị trường theo sản phẩm. Mỗi sản phẩm có nhiều thị trường, mỗi thị trường có nguồn dữ liệu đối thủ riêng.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| product_id | uuid FK → brand_products | |
| market_code | text NOT NULL | Mã thị trường (vd: `US`, `UK`, `DE`) |
| market_label | text NOT NULL | Tên hiển thị (vd: "United States") |
| language | text NOT NULL DEFAULT 'en-US' | Ngôn ngữ quảng cáo |
| sheet_url | text NULL | Google Sheets URL (dữ liệu đối thủ) |
| spreadsheet_id | text NULL | Extracted từ sheet_url |
| sheet_gid | integer NULL | Sheet tab ID |
| sheet_name | text NULL | Tên tab (vd: "Top 30 Competitors") |
| cached_csv | text NULL | CSV cache (tránh gọi API mỗi lần) |
| cached_at | timestamptz NULL | Thời điểm cache |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### concept_prompts
Chiến lược sáng tạo (concept) — global, dùng chung cho tất cả brands.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| concept_id | text UNIQUE NOT NULL | ID ngắn (vd: `data_hook`, `before_after`) |
| label | text NOT NULL | Tên hiển thị |
| description | text | Mô tả ngắn |
| requires_competitor | boolean DEFAULT false | Cần dữ liệu đối thủ? |
| prompt | text | Prompt sáng tạo (có thể chứa `### Variant A/B/C`) |
| reference_images | text[] DEFAULT '{}' | URL ảnh mẫu (tối đa 2) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### persona_profiles
Chân dung khách hàng mục tiêu.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands | |
| research_summary_id | uuid FK NULL → brand_research_summaries | |
| title | text NOT NULL | Tên persona (vd: "Fitness Enthusiasts 25-35") |
| pain | text NULL | Nỗi đau / vấn đề |
| angle | text NULL | Góc tiếp cận |
| emotion | text NULL | Cảm xúc mục tiêu |
| source | text DEFAULT 'manual' | `'ai'` hoặc `'manual'` |
| deleted_at | timestamptz NULL | Soft delete |
| created_at | timestamptz | |

### brand_research_summaries
Bản tóm tắt nghiên cứu thương hiệu (AI-generated hoặc viết tay).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands | UNIQUE |
| content | text | Nội dung markdown |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### saved_ads
Metadata ảnh quảng cáo đã lưu — liên kết với product để filter trong Library.
Ảnh thực tế lưu trong Supabase Storage (bucket `generated-ads`).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands | CASCADE delete |
| product_id | uuid FK NULL → brand_products | SET NULL on delete — cho phép filter theo product |
| storage_path | text UNIQUE | Đường dẫn trong Storage (`workspace/{brandId}/{date}/{file}`) |
| image_url | text | Public URL vĩnh viễn |
| headline | text NULL | Headline của ad |
| concept | text NULL | Concept đã dùng (e.g. `data_hook`, `Stealth: HUM_01`, `edit`) |
| prompt | text NULL | Prompt đã dùng để generate |
| source | text DEFAULT 'workspace' | Nguồn: `workspace`, `stealth`, `edit` |
| created_at | timestamptz | |

**Indexes:** `brand_id`, `(brand_id, product_id)`, `created_at DESC`

### generated_ads (legacy — không còn sử dụng)
Bảng cũ từ kiến trúc campaign-based. Không có service hay API route nào sử dụng.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| persona_profile_id | uuid FK NULL → persona_profiles | |
| parent_ad_id | uuid FK NULL → generated_ads | Nếu là bản edit |
| title | text NULL | |
| segment_label | text NULL | |
| angle_label | text NULL | |
| image_path | text NULL | Đường dẫn trong Supabase Storage |
| generation_prompt | text NULL | Prompt đã dùng |
| metadata_json | jsonb NULL | Metadata bổ sung |
| deleted_at | timestamptz NULL | |
| created_at | timestamptz | |

## Migration files

Chạy theo thứ tự:

```
supabase/migration.sql
supabase/migration_brand_products.sql
supabase/migration_colors_and_product_description.sql
supabase/migration_concept_prompts.sql
supabase/migration_concept_prompt_simplify.sql
supabase/migration_product_markets.sql
supabase/migration_product_context_cache.sql
supabase/migration_product_colors.sql
supabase/migration_saved_ads.sql
```

# Database Schema (Supabase PostgreSQL)

> Nguồn sự thật (ground truth): `src/types/database.types.ts` (Supabase-generated types) +
> `supabase/migrations/*.sql`. Tài liệu này được đồng bộ lại sau khi app chuyển từ mô hình
> multi-tenant SaaS (agency → `clients` → `brands`) sang **single-tenant shared workspace**:
> mọi user nội bộ active đều thấy chung một pool `brands`, không còn khái niệm client/tenant.
> Bảng `clients` và `product_markets` **đã bị xoá khỏi DB** (xem phần "Bảng đã xoá" bên dưới).

## Sơ đồ quan hệ

```
profiles (auth users, role-based)
  └── brands                          (owner_user_id FK, nhưng đọc là shared-pool)
        ├── brand_kits                (1:1)
        ├── brand_products            (1:N)
        ├── brand_research_summaries  (1:1)
        ├── persona_profiles          (1:N)
        │     └── (research_summary_id FK → brand_research_summaries, optional)
        ├── saved_ads                 (1:N, optional FK → brand_products)
        ├── stealth_scenes            (1:N)
        ├── brand_apify_config        (1:1)
        │
        ├── competitor_videos         (1:N)  ── Video Pipeline
        │     └── transcripts         (1:1)
        │           └── brand_scripts (1:N, cũng FK brand_id)
        │                 └── generated_audios (1:N, FK script_id + brand_id + voice_preset_id)
        ├── voice_presets             (1:N)  ── dùng bởi generated_audios
        └── voice_ratings             (1:N)

concept_prompts     (global, không FK tới brands — dùng chung cho mọi brand)
user_concepts       (per-user custom concepts, FK owner_user_id → profiles)
user_api_keys        (per-user BYOK keys, FK user_id → profiles)
kie_task_results     (global, KIE AI async job tracking — không FK)
page_views           (global, analytics — không FK tới brands/profiles)
```

## Chi tiết các bảng

### profiles
Người dùng nội bộ (auth.users mở rộng). Không còn multi-tenant — mọi `is_active = true` đều
thuộc chung một shared workspace.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | = `auth.users.id` |
| email | text NOT NULL | |
| full_name | text NOT NULL | |
| role | text NOT NULL DEFAULT 'member' | `'ceo'` \| `'super_admin'` \| `'member'` |
| department | text NULL | |
| is_active | boolean NOT NULL DEFAULT true | User bị deactivate sẽ mất mọi quyền RLS |
| is_platform_admin | boolean NOT NULL DEFAULT false | Đồng bộ tự động từ `role` qua trigger `sync_platform_admin_flag` (đọc bởi `/api/user/me`) |
| created_by | uuid NULL | |
| last_login_at | timestamptz NULL | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Triggers:** `protect_ceo_trigger`, `prevent_ceo_delete_trigger` (bảo vệ tài khoản CEO khỏi bị deactivate/đổi role/xoá).

### brands
Thương hiệu — đơn vị workspace cấp cao nhất (thay thế hoàn toàn vai trò của `clients` cũ). Mỗi
brand có products, personas, concepts riêng, video, ads riêng.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| owner_user_id | uuid FK → profiles NOT NULL | Người tạo brand; **không** dùng để giới hạn quyền đọc (xem RLS bên dưới) |
| name | text NOT NULL | Tên thương hiệu |
| description | text NULL | Mô tả |
| deleted_at | timestamptz NULL | Soft delete — chỉ admin mới đổi được cột này (trigger `guard_brand_admin_columns`) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### brand_kits
Bộ nhận diện thương hiệu (colors, fonts, logos). Mỗi brand có 1 kit.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| typography | text NULL | Tên font (vd: "Inter", "Roboto") |
| font_source | text NULL | `'google'` hoặc `'local'` |
| font_file_paths | jsonb NULL | Đường dẫn file font local |
| font_specimen_path | text NULL | Ảnh mẫu font |
| logo_light_path | text NULL | Logo nền sáng |
| logo_dark_path | text NULL | Logo nền tối |
| primary_color_1 / primary_color_2 | text NULL | Hex color (vd: `#1A1A2E`) |
| secondary_color_1 / secondary_color_2 | text NULL | |
| accent_color_1 / accent_color_2 | text NULL | |
| updated_at | timestamptz | |

### brand_products
Sản phẩm thuộc thương hiệu. Mỗi sản phẩm có ảnh, landing page, và các trường marketing dùng cho
script generation (Stage 4).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| name | text NOT NULL | Tên sản phẩm |
| description | text NULL | Mô tả sản phẩm |
| images | text[] NOT NULL | Array URL ảnh sản phẩm (1-5) |
| product_url | text NULL | Landing page URL |
| price | text NULL | Giá hiển thị (thêm ở migration 14) |
| attributes | text NULL | Đặc tính sản phẩm (vd: độ cay, nguyên liệu) |
| target_audience | text NULL | Đối tượng khách hàng mục tiêu |
| selling_points | text NULL | Điểm bán/USP (vd: freeship, giá tốt) |
| primary_color_1 / primary_color_2 | text NULL | Màu chủ đạo riêng cho sản phẩm |
| secondary_color_1 / secondary_color_2 | text NULL | |
| cached_product_context | jsonb NULL | Cache ngữ cảnh sản phẩm (AI-generated) |
| context_cached_at | timestamptz NULL | Thời điểm cache |
| created_at | timestamptz | |

> **Lưu ý:** bảng `product_markets` (thị trường/Google Sheets đối thủ theo sản phẩm) mô tả trong
> bản trước **không còn tồn tại trên DB live** — xem "Bảng đã xoá" bên dưới.

### brand_research_summaries
Bản tóm tắt nghiên cứu thương hiệu (AI-generated hoặc viết tay). 1:1 với brand.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL, UNIQUE | |
| content | text NOT NULL | Nội dung markdown |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### persona_profiles
Chân dung khách hàng mục tiêu.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| research_summary_id | uuid FK NULL → brand_research_summaries | |
| title | text NOT NULL | Tên persona (vd: "Fitness Enthusiasts 25-35") |
| pain | text NULL | Nỗi đau / vấn đề |
| angle | text NULL | Góc tiếp cận |
| emotion | text NULL | Cảm xúc mục tiêu |
| source | text NOT NULL | `'ai'` hoặc `'manual'` |
| deleted_at | timestamptz NULL | Soft delete |
| created_at | timestamptz | |

### concept_prompts
Chiến lược sáng tạo (concept) — global, dùng chung cho tất cả brands. Không có FK tới `brands`.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| concept_id | text NOT NULL | ID ngắn (vd: `data_hook`, `before_after`) |
| label | text NOT NULL | Tên hiển thị |
| description | text NULL | Mô tả ngắn |
| requires_competitor | boolean NULL DEFAULT false | Cần dữ liệu đối thủ? |
| prompt | text NOT NULL | Prompt sáng tạo (có thể chứa `### Variant A/B/C`) |
| reference_images | text[] NULL | URL ảnh mẫu (tối đa 2) |
| created_at | timestamptz NULL | |
| updated_at | timestamptz NULL | |

### user_concepts
Concept tuỳ chỉnh của riêng từng user (khác với `concept_prompts` global).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| owner_user_id | uuid FK → profiles NOT NULL | |
| label | text NOT NULL | |
| description | text NULL | |
| prompt | text NOT NULL | |
| reference_images | text[] NOT NULL DEFAULT '{}' | |
| requires_competitor | boolean NOT NULL DEFAULT false | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### stealth_scenes
Thư viện scene "stealth ad" tuỳ biến theo brand (đặt sản phẩm vào bối cảnh tự nhiên).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| scene_id | text NOT NULL | Mã scene nội bộ, UNIQUE theo `(brand_id, scene_id)` |
| category | text NOT NULL | |
| name | text NOT NULL | |
| description | text NOT NULL | |
| placement_method | text NOT NULL | Cách chèn sản phẩm vào scene |
| best_for_products | text[] NOT NULL DEFAULT '{}' | |
| best_for_audiences | text[] NOT NULL DEFAULT '{}' | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### saved_ads
Metadata ảnh quảng cáo đã lưu — liên kết với product để filter trong Library. Ảnh thực tế lưu
trong Supabase Storage (bucket `generated-ads`).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | CASCADE delete |
| product_id | uuid FK NULL → brand_products | SET NULL on delete — cho phép filter theo product |
| storage_path | text NOT NULL, UNIQUE | Đường dẫn trong Storage (`workspace/{brandId}/{date}/{file}`) |
| image_url | text NOT NULL | Public URL vĩnh viễn |
| headline | text NULL | Headline của ad |
| concept | text NULL | Concept đã dùng (vd. `data_hook`, `Stealth: HUM_01`, `edit`) |
| prompt | text NULL | Prompt đã dùng để generate |
| source | text NOT NULL DEFAULT 'workspace' | `'workspace'`, `'stealth'`, `'edit'` |
| created_at | timestamptz | |

**Indexes:** `brand_id`, `(brand_id, product_id)`, `created_at DESC`

### kie_task_results
Theo dõi job async của KIE AI (image generation provider). Global, không FK.

| Column | Type | Description |
|--------|------|-------------|
| task_id | text PK | ID job từ KIE AI |
| status | text NOT NULL DEFAULT 'pending' | |
| image_url | text NULL | Kết quả ảnh khi hoàn tất |
| error_message | text NULL | |
| raw_payload | jsonb NULL | Payload gốc từ webhook/poll |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### user_api_keys
BYOK — API key riêng theo user (nếu tính năng bring-your-own-key còn bật cho provider nào đó).

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid FK → profiles NOT NULL | Composite PK với `provider` |
| provider | text NOT NULL | Composite PK với `user_id` |
| encrypted_key | text NOT NULL | |
| updated_at | timestamptz | |

### page_views
Analytics đơn giản, global — không FK tới brands/profiles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| session_id | text NOT NULL | |
| path | text NOT NULL | |
| referrer | text NULL | |
| created_at | timestamptz | |

---

## Video Pipeline (tính năng mới)

Toàn bộ pipeline: scrape đối thủ trên TikTok (Apify) → transcript (Gemini) → viết script cho brand
→ tạo giọng đọc (TTS) → lưu audio. Mỗi bảng con FK trực tiếp hoặc gián tiếp về `brands`.

### brand_apify_config
Cấu hình đồng bộ Apify theo brand (pull-sync). Mỗi brand có tối đa 1 config.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL, UNIQUE | |
| apify_task_id | text NOT NULL | |
| is_enabled | boolean NOT NULL DEFAULT true | |
| last_run_id | text NULL | |
| last_dataset_id | text NULL | |
| last_synced_at | timestamptz NULL | |
| last_error | text NULL | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Cron job đọc bảng này bằng admin client (bypass RLS); CRUD từ UI đi qua RLS thường
(đọc = active user, ghi = admin only — xem phần RLS).

### competitor_videos
Video TikTok đối thủ đã scrape, gắn theo brand.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| tiktok_url | text NOT NULL | UNIQUE theo `(brand_id, tiktok_url)` |
| video_id | text NULL | ID video trên TikTok |
| views / likes / shares / comments | bigint NULL | |
| author_handle | text NULL | |
| cover_url | text NULL | |
| scraped_at | timestamptz NULL | |
| apify_run_id | text NULL | |
| status | text NOT NULL DEFAULT 'pending' | `'pending'` \| `'winner'` \| `'rejected'` |
| scrape_status | text NOT NULL DEFAULT 'success' | `'success'` \| `'failed'` |
| created_at | timestamptz | |

**Index:** `(brand_id, status)`. Upsert hàng loạt qua RPC `upsert_competitor_videos(p_brand_id, p_videos, p_apify_run_id?)`.

### transcripts
Bản transcript (Gemini transcription) của 1 video, 1:1 với `competitor_videos`.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| video_id | uuid FK → competitor_videos NOT NULL, UNIQUE | |
| whisper_status | text NOT NULL DEFAULT 'pending' | `'pending'` \| `'processing'` \| `'done'` \| `'failed'` (tên cột còn giữ "whisper" từ thiết kế ban đầu, hiện dùng Gemini) |
| raw_text | text NULL | Transcript gốc |
| edited_text | text NULL | Bản đã chỉnh sửa thủ công |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### brand_scripts
Script quảng cáo viết cho brand, dựa trên transcript đối thủ.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| transcript_id | uuid FK → transcripts NOT NULL | |
| brand_id | uuid FK → brands NOT NULL | |
| prompt_config | jsonb NOT NULL DEFAULT '{}' | Cấu hình prompt (Stage 4 script prompt v2) |
| raw_text | text NULL | Script do AI sinh ra |
| final_text | text NULL | Bản final sau chỉnh sửa |
| llm_model | text NULL | Model dùng để sinh script |
| tts_provider | text NOT NULL DEFAULT 'vbee' | `'vbee'` \| `'elevenlabs'` |
| elevenlabs_model | text NULL | `'eleven_v3'` \| `'eleven_flash_v2_5'` (chỉ dùng khi `tts_provider = 'elevenlabs'`) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Indexes:** `transcript_id`, `brand_id`.

### voice_presets
Giọng đọc đã cấu hình sẵn theo brand — hỗ trợ cả Vbee và ElevenLabs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| display_name | text NOT NULL | |
| voice_code | text NOT NULL | Mã giọng (Vbee) |
| provider | text NOT NULL DEFAULT 'vbee' | `'vbee'` \| `'elevenlabs'` |
| provider_voice_id | text NULL | Voice ID phía ElevenLabs |
| elevenlabs_model | text NULL | `'eleven_v3'` \| `'eleven_flash_v2_5'` |
| speed | numeric NOT NULL DEFAULT 1.0 | |
| pitch | numeric NOT NULL DEFAULT 1.0 | |
| pause_config | jsonb NULL | Cấu hình khoảng nghỉ |
| is_default | boolean NOT NULL DEFAULT false | |
| created_at | timestamptz | |

**Index:** `brand_id`.

### voice_ratings
Đánh giá chất lượng giọng đọc (Vbee) theo brand, dùng để chọn giọng tốt nhất.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| brand_id | uuid FK → brands NOT NULL | |
| vbee_voice_code | text NOT NULL | |
| score | smallint NOT NULL | 1–5 |
| note | text NULL | |
| rated_at | timestamptz | |

**Index:** `(brand_id, vbee_voice_code)`.

### generated_audios
File audio đã tạo từ script + voice preset.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| script_id | uuid FK → brand_scripts NOT NULL | |
| brand_id | uuid FK → brands NOT NULL | |
| voice_preset_id | uuid FK NULL → voice_presets | SET NULL on delete |
| provider | text NOT NULL DEFAULT 'vbee' | `'vbee'` \| `'elevenlabs'` |
| storage_path | text NULL | Đường dẫn Supabase Storage (nếu lưu local) |
| vbee_audio_url | text NULL | URL audio trả về từ Vbee (nếu không lưu Storage) |
| duration_secs | numeric NULL | |
| created_at | timestamptz | |

**Indexes:** `script_id`, `brand_id`.

---

## Bảng đã xoá (không còn trên DB live)

| Bảng | Lý do | Ghi chú |
|------|-------|---------|
| `clients` | Refactor bỏ mô hình multi-tenant agency → single-tenant shared workspace. `brands` giờ là đơn vị cao nhất, không còn FK `client_id`. | Từng được recreate tạm thời trong `supabase/migration_rollback_to_pati_baseline.sql` (rollback thử nghiệm) nhưng **không có trong `database.types.ts` hiện tại** — tức là đã bị drop lại trên DB thật. Không còn service/route nào query `clients`. |
| `product_markets` | Tính năng "market theo sản phẩm + Google Sheets đối thủ" bị loại bỏ khỏi schema. | Migration `13_shared_workspace_child_rls.sql` ghi rõ: *"product_markets excluded: table does not exist on live DB"*. **Cảnh báo:** `src/lib/sheets-reader.ts` vẫn còn code tham chiếu khái niệm này (đọc dữ liệu đối thủ từ Google Sheets) — cần rà soát vì bảng hậu thuẫn đã không còn tồn tại. |
| `generated_ads` | Bảng cũ từ kiến trúc campaign-based đời đầu, đã được thay bằng `saved_ads`. | Không xuất hiện trong `database.types.ts` hiện tại — đã bị drop hoàn toàn (không chỉ "legacy/unused" như tài liệu cũ mô tả). |

---

## Row-Level Security (RLS) — mô hình Shared Workspace

Toàn bộ app dùng mô hình **shared-pool**: không có tenant isolation theo client/workspace. Mọi
user có `profiles.is_active = true` đều đọc được chung một pool `brands` và toàn bộ dữ liệu con
của nó. Phân quyền dựa trên `profiles.role` (`ceo` / `super_admin` / `member`), không dựa trên
"ai sở hữu brand này".

Helper functions (`supabase/migrations/12_shared_workspace_helpers.sql`):
- `is_active_user()` — `true` nếu user hiện tại có `profiles.is_active = true`.
- `is_admin()` — `true` nếu user hiện tại active và có role `ceo` hoặc `super_admin`.

Chính sách theo bảng:
- **`brands`**: SELECT cho mọi active user; INSERT/DELETE chỉ admin; UPDATE cho mọi active user,
  nhưng cột `deleted_at` và `owner_user_id` chỉ admin được đổi (enforce bằng trigger
  `guard_brand_admin_columns`, không chỉ RLS).
- **`brand_apify_config`**: SELECT cho mọi active user; INSERT/UPDATE/DELETE chỉ admin (đồng bộ
  Apify là thao tác nhạy cảm về chi phí/quota).
- **Các bảng con còn lại** (`brand_kits`, `brand_products`, `brand_research_summaries`,
  `persona_profiles`, `saved_ads`, `stealth_scenes`, `competitor_videos`, `transcripts`,
  `brand_scripts`, `voice_presets`, `voice_ratings`, `generated_audios`): FOR ALL (SELECT/INSERT/
  UPDATE/DELETE) cho mọi active user — không phân biệt owner.
- **`profiles`**: user tự xem/sửa hồ sơ của mình; admin xem/sửa được tất cả; service role full
  access.
- **`concept_prompts`**, **`kie_task_results`**: mở cho mọi authenticated user (global data, không
  gắn brand).

> Lưu ý lịch sử: các migration đời đầu trong `src/services` comment (`competitor_videos_all`,
> `transcripts_all`, v.v. trong `08_video_module.sql`) dùng điều kiện
> `b.owner_user_id = auth.uid()` (mô hình per-owner). Điều này đã được **ghi đè** bởi
> `13_shared_workspace_child_rls.sql` sang mô hình shared-pool `is_active_user()`. Nếu đọc trực
> tiếp `08_video_module.sql` mà không đọc tiếp `12`/`13`, sẽ hiểu nhầm là RLS vẫn theo owner.

---

## Migration files

DB đã trải qua 2 giai đoạn: baseline PATI (không đánh số thư mục `supabase/migrations/`, các file
`.sql` rời nằm trực tiếp trong `supabase/`) → sau đó chuyển sang thư mục
`supabase/migrations/NN_*.sql` có đánh số thứ tự, bắt đầu từ Video Module.

**Giai đoạn 1 — baseline (chạy trước, file rời trong `supabase/`):**
```
supabase/migration.sql
supabase/migration_auth.sql
supabase/migration_brand_products.sql
supabase/migration_colors_and_product_description.sql
supabase/migration_concept_prompts.sql
supabase/migration_concept_prompt_simplify.sql
supabase/migration_product_markets.sql          # bảng này đã bị xoá sau đó — xem phần trên
supabase/migration_product_context_cache.sql
supabase/migration_product_colors.sql
supabase/migration_saved_ads.sql
supabase/migration_stealth_scenes.sql
supabase/migration_app_settings.sql
supabase/migration_anthropic_key.sql
supabase/migration_rollback_to_pati_baseline.sql  # rollback thử nghiệm Adlance→PATI, xem ghi chú ở trên
```

**Giai đoạn 2 — đánh số, Video Module trở đi (`supabase/migrations/`, chạy theo thứ tự số):**
```
supabase/migrations/08_video_module.sql              # competitor_videos, transcripts, brand_scripts,
                                                       # voice_presets, voice_ratings, generated_audios
supabase/migrations/09_upsert_competitor_videos_rpc.sql
supabase/migrations/10_brand_apify_config.sql
supabase/migrations/11_brand_product_marketing_fields.sql
supabase/migrations/12_shared_workspace_helpers.sql   # is_active_user(), is_admin(), brands RLS
supabase/migrations/13_shared_workspace_child_rls.sql # ghi đè RLS owner-based → shared-pool
supabase/migrations/14_script_prompt_v2.sql           # brand_products.price, brand_scripts.tts_provider
supabase/migrations/15_elevenlabs_provider.sql        # voice_presets/generated_audios provider columns
supabase/migrations/page_views.sql
```

> File 01–07 trong `supabase/migrations/` không tồn tại trong repo hiện tại — Video Module bắt đầu
> đánh số từ `08`. Có thể các số 01–07 tương ứng với các file rời ở Giai đoạn 1, hoặc đã bị xoá;
> chưa xác minh được lịch sử chính xác.

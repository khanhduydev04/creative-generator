# API Reference

Tất cả API routes nằm trong `src/app/api/`. Sử dụng Next.js App Router convention (export GET/POST/PUT/PATCH/DELETE).

> **Lưu ý:** Hầu hết routes được bảo vệ bởi `requireUser()` (yêu cầu đăng nhập). Một số routes ghi/xóa dữ liệu hệ thống dùng `verifyAdmin()`/`requireAdmin()` (chỉ admin). Các routes không có auth guard được đánh dấu rõ bên dưới. Xem [Security Notes](#security-notes) cuối trang.

---

## Brands

Brand là resource cấp cao nhất (workspace) của app — không còn khái niệm `Client` (route `/api/clients` đã bị xóa hoàn toàn trong lần refactor sang single-tenant).

### GET /api/brands
Lấy danh sách brands của user hiện tại.

**Auth:** `requireUser`
**Response:** `{ brands: Brand[] }`

### POST /api/brands
Tạo brand mới.

**Auth:** `verifyAdmin` (chỉ admin)
**Body:** `{ name: string, description?: string }`
**Response:** `201 { brand: Brand }`

### GET /api/brands/[id]
Lấy brand theo ID.

**Auth:** `requireUser`
**Response:** `{ brand: Brand }`

### PATCH /api/brands/[id]
Cập nhật brand.

**Auth:** `requireUser`
**Body:** `{ name?: string, description?: string }`
**Response:** `{ brand: Brand }`

### DELETE /api/brands/[id]
Xóa brand.

**Auth:** `verifyAdmin` (chỉ admin)
**Response:** `{ success: true }`

---

## Brand Kit (Colors, Fonts, Logos)

### GET /api/brand-kit/[brandId]
Lấy brand kit + logo URLs.

**Auth:** `requireUser`
**Response:** `{ kit: BrandKit | null, logoUrls: LogoUrls | null }`

### PUT /api/brand-kit/[brandId]
Cập nhật brand kit.

**Auth:** `requireUser`
**Body:**
```typescript
{
  typography?: string,          // Tên font
  font_source?: 'google' | 'local',
  primary_color_1?: string,     // Hex color
  primary_color_2?: string,
  secondary_color_1?: string,
  secondary_color_2?: string,
  accent_color_1?: string,
  accent_color_2?: string,
}
```
**Response:** `{ kit, logoUrls }`

### POST /api/brand-kit/[brandId]/logo
Upload logo. FormData: `file` (bắt buộc) + `logoType` (`light` | `dark`). Max 10MB, JPG/PNG/WEBP/SVG.

**Auth:** `requireUser`
**Response:** `201 { kit, logoUrls }`

### POST /api/brand-kit/[brandId]/font
Upload font files. FormData: `fontName` (bắt buộc) + `files[]` + `specimen` (optional) + `variants` (JSON string array). Max 5MB/file.

**Auth:** `requireUser`
**Response:** `201 { kit, logoUrls, specimenUrl }`

---

## Brand Products

### GET /api/brand-products?brandId=xxx
Lấy products theo brand. `brandId` bắt buộc.

**Auth:** `requireUser`
**Response:** `{ products: BrandProduct[] }`

### POST /api/brand-products
Tạo product mới.

**Auth:** `requireUser`
**Body:** `{ brand_id, name, images: string[] (1-5, bắt buộc), description?, product_url?, attributes?, target_audience?, selling_points?, price? }`
**Response:** `201 { product }`

### GET/PUT/DELETE /api/brand-products/[id]
CRUD product. PUT body: `{ name?, description?, images? (1-5), attributes?, target_audience?, selling_points?, price? }`

**Auth:** `requireUser`

### POST /api/brand-products/[id]/scrape-context
Scrape trang sản phẩm qua Gemini và cache context vào DB.

**Auth:** `requireUser`
**Body:** `{ url?: string }` (optional — fallback về `product_url` đã lưu nếu không truyền)
**Response:** `{ success: true, productContext, cachedAt }`

### POST /api/brand-products/[id]/upload
Upload ảnh sản phẩm (FormData: `file`). Max 10MB, JPG/PNG/WEBP.

**Auth:** `requireUser`
**Response:** `{ url: string, path: string }`

---

## Concepts

Concepts gồm 2 loại: **system concepts** (do admin quản lý, dùng chung) và **user concepts** (do từng user tự tạo).

### GET /api/concepts
Lấy toàn bộ concepts (system + custom), đã merge.

**Auth:** `requireUser`
**Response:** `{ system: ConceptPrompt[], custom: UserConcept[] }`

### PUT /api/concepts/[conceptId]
Cập nhật system concept.

**Auth:** `requireAdmin` (chỉ admin)
**Body:** `{ label?, description?, requires_competitor?, prompt?, reference_images?: string[] (max 2) }`
**Response:** `{ concept }`

### DELETE /api/concepts/[conceptId]
Xóa system concept.

**Auth:** `requireAdmin` (chỉ admin)
**Response:** `{ success: true }`

### POST /api/concepts/[conceptId]/upload
Upload reference image cho system concept. Max 10MB, JPG/PNG/WEBP.

**Auth:** `requireUser`
**Response:** `{ url, path }`

### GET /api/user-concepts
Lấy concepts tự tạo của user hiện tại.

**Auth:** `requireUser`
**Response:** `{ concepts: UserConcept[] }`

### POST /api/user-concepts
Tạo custom concept.

**Auth:** `requireUser`
**Body:** `{ label, prompt (bắt buộc), description?, reference_images?: string[], requires_competitor?: boolean }`
**Response:** object concept vừa tạo (không có wrapper)

### PATCH/DELETE /api/user-concepts/[id]
Cập nhật/xóa custom concept. PATCH body giống POST (tất cả optional).

**Auth:** `requireUser`
**Response PATCH:** object concept đã cập nhật (không có wrapper). **Response DELETE:** `{ ok: true }`

---

## Brand Intelligence & Personas

### GET/PUT /api/brand-intelligence/[brandId]
Lấy/lưu brand research summary (markdown).

**Auth:** `requireUser`
**Body PUT:** `{ content: string }`
**Response:** `{ summary }`

### POST /api/brand-intelligence/[brandId]/generate-personas
AI tự động tạo 10 personas từ research summary mới nhất.

**Auth:** `requireUser`
**Response:** `201 { personas }` (400 nếu chưa có research summary)

### GET /api/personas?brandId=xxx
Lấy personas theo brand. `brandId` bắt buộc.

**Auth:** `requireUser`
**Response:** `{ personas }`

### POST /api/personas
Tạo persona thủ công.

**Auth:** `requireUser`
**Body:** `{ brandId, title (bắt buộc), pain?, angle?, emotion?, researchSummaryId? }`
**Response:** `201 { persona }`

### GET/PATCH/DELETE /api/personas/[id]
CRUD persona. PATCH body: `{ title?, pain?, angle?, emotion? }`

**Auth:** `requireUser`

---

## Generation (Ads / Stealth / Competitor-Ref / Content-Adapt)

### POST /api/generate-ads
**Endpoint quan trọng nhất.** Tạo ảnh quảng cáo qua SSE stream (concept mode hoặc competitor_ref mode).

**Auth:** `requireUser`
**Response type:** `text/event-stream` (Server-Sent Events)

**Body:**
```typescript
{
  productId: string,
  productName: string,
  productDescription?: string,
  productImages: string[],         // URLs ảnh sản phẩm
  landingPageUrl: string,          // URL trang sản phẩm
  market?: string,                 // Market code
  language?: string,               // "en-US", "de", "fr", "es", "vi"
  generationMode?: "concept" | "competitor_ref",
  competitorRefImageUrl?: string,  // Chỉ cho mode competitor_ref
  conceptIds: string[],            // Chỉ cho mode concept
  adCopyOverride?: {
    headline?: string,
    bodyText?: string,
    additionalNotes?: string,
  },
  targetAudience: {
    title: string,
    pain: string | null,
    angle: string | null,
    emotion: string | null,
  },
  brandProfile: {
    brandName: string,
    logoUrl: string | null,
    primaryColor1: string,         // Hex colors
    primaryColor2: string,
    secondaryColor1: string,
    secondaryColor2: string,
    accentColor1: string,
    accentColor2: string,
    typography: string,
  },
  deepAnalysis?: boolean,          // Deep competitor analysis (slow)
  outputConfig: {
    aspectRatio: string,           // "1:1", "4:5", "9:16", "16:9"
    resolution?: string,           // "1K", "2K", "4K"
    funnelStage?: string,          // "awareness", "consideration"
    count?: number,                // 1-10 ads
  },
  cachedProductContext?: string,           // Cache từ /api/prepare-generation
  cachedResizedProductImageUrls?: string[],
  cachedResizedBrandLogoUrl?: string,
}
```

**SSE Events:**
```
event: step    → { step, status: "running"|"completed"|"failed", message }
event: meta    → { totalExpected }
event: result  → { imageUrl, taskId, prompt, headline, concept, market }
event: imageError → { error, headline, concept }
event: error   → { error }
event: done    → { totalResults, totalFailed }
```

### POST /api/edit-ad
Chỉnh sửa ảnh đã tạo qua KIE.

**Auth:** `requireUser`
**Body:** `{ originalImageUrl, editPrompt, originalPrompt?, brandContext, productContext, additionalImages?, aspectRatio?, resolution? }`
**Response:** `{ success, imageUrl, taskId, prompt }`

### POST /api/prepare-generation
Pre-cache product context + resize ảnh trước khi generate (tối ưu cho pack-mode nhiều ảnh).

**Auth:** `requireUser`
**Body:** `{ landingPageUrl, productImages: string[], brandLogoUrl? }`
**Response:** `{ success: true, productContext, resizedProductImageUrls, resizedBrandLogoUrl }`

### POST /api/stealth/plan
Lập kế hoạch stealth scenes qua Gemini (không kèm ảnh đối thủ tham khảo).

**Auth:** `requireUser`
**Body:** `{ productName, productDescription?, landingPageUrl, targetAudience, quantity?, sceneSelection?, market?, language?, aspectRatio?, sensitivityLevel?, audienceAgeRange?, brandId? }`
**Response:** `{ success: true, plans }`

### POST /api/stealth-ref/plan
Lập kế hoạch stealth scenes lấy cảm hứng từ ảnh đối thủ (competitor reference).

**Auth:** `requireUser`
**Body:** `{ productName, productDescription?, landingPageUrl, competitorRefImageUrl, targetAudience{title,pain,angle,emotion}, market?, language?, quantity, aspectRatio, sensitivityLevel?, audienceAgeRange?, cachedProductContext? }`
**Response:** `{ success: true, plans, analysis{adType,stealthCategory,mood,creativeConcept}, analysisSummary }`

### POST /api/stealth/generate
Tạo ảnh quảng cáo stealth từ plans đã lập, qua SSE stream.

**Auth:** `requireUser`
**Body:** `{ plans, productImages?, cachedResizedProductImageUrls?, referenceImageUrl?, referenceAnalysisSummary?, productName, productDescription, audienceAgeRange?, sensitivityLevel?, aspectRatio?, resolution? }`
**SSE Events:** `step`, `meta`, `result { imageUrl, taskId, prompt, sceneName, sceneId }`, `imageError`, `done`, `error`

### GET /api/stealth-scenes?brandId=xxx
Lấy custom stealth scenes theo brand.

**Auth:** `requireUser`
**Response:** `{ scenes }`

### POST /api/stealth-scenes
Tạo custom stealth scene.

**Auth:** `requireUser`
**Body:** `{ brand_id, scene_id, category, name, description, placement_method (bắt buộc), best_for_products?, best_for_audiences? }`
**Response:** `201 { scene }`

### PUT/DELETE /api/stealth-scenes/[id]
Cập nhật/xóa stealth scene. PUT body: `{ scene_id?, category?, name?, description?, placement_method?, best_for_products?, best_for_audiences? }`

**Auth:** `requireUser`

### POST /api/competitor-ref/upload
Upload ảnh đối thủ để dùng trong competitor_ref mode. Max 10MB, JPG/PNG/WEBP.

**Auth:** `requireUser`
**Response:** `{ url, path }`

### POST /api/content-adapt/generate
Thích ứng (adapt) nội dung mẫu sang nhiều ad image khác nhau qua Claude, SSE stream.

**Auth:** `requireUser`
**Body:** `{ items: [{ adImageUrl, sampleContent, identifier, label }], productData{...}, language, mode: "text-only" | "vision" }`
**SSE Events:** `meta { total }`, `step`, `result { index, identifier, label, adaptedContent }`, `error`, `done { total, failed }`

### POST /api/content-adapt/parse-excel
Parse file Excel upload thành rows. FormData: `file` (.xlsx/.xls).

**Auth:** không có guard
**Response:** `{ success: true, rows }` hoặc `400 { success: false, error }`

### POST /api/content-adapt/export
Export kết quả adapt ra CSV/JSON (không lưu DB).

**Auth:** không có guard
**Body:** `{ results: [{ label, caption, hashtags, callToAction }], format: "csv" | "json" }`
**Response:** file download trực tiếp (CSV có BOM hoặc JSON) qua `Content-Disposition`

---

## Library (Saved Ads)

### POST /api/save-ad
Lưu ảnh từ URL tạm (KIE) vào Supabase Storage + ghi metadata vào `saved_ads` table.

**Auth:** `requireUser` + SSRF guard (`assertSafeOutboundUrl`) trên `imageUrl`
**Body:**
```json
{
  "imageUrl": "https://...",
  "prompt": "...",
  "headline": "...",
  "concept": "data_hook",
  "market": "",
  "brandId": "uuid",
  "productId": "uuid (optional)",
  "productName": "Creatine Gummies",
  "source": "workspace | stealth | edit"
}
```
**SSRF Protection:** Chặn localhost, private IPs, .internal, .local, non-HTTPS.
**Response:** `{ success, storagePath, permanentUrl, metadata }`

### GET /api/saved-ads?brandId=xxx&productId=yyy
Lấy danh sách ảnh đã lưu. Query `saved_ads` DB table trước (hỗ trợ filter theo `productId`), fallback tới Storage listing cho legacy ads.

**Auth:** `requireUser`
**Query params:**
- `brandId` (required) — filter theo brand
- `productId` (optional) — filter theo product

**Response:** `{ ads: [{ name, storagePath, publicUrl, createdAt, productId, headline, concept, source }] }`

### DELETE /api/saved-ads
Xóa ảnh đã lưu khỏi cả Storage và `saved_ads` table.

**Auth:** `requireUser`
**Body:** `{ path: string }` hoặc `{ paths: string[] }` (bulk delete)

---

## Video — Competitors

Quản lý video TikTok đối thủ theo brand (nguồn thủ công hoặc sync tự động từ Apify).

### GET /api/video/competitors
Lấy danh sách video đối thủ, có phân trang + search server-side.

**Auth:** `requireUser`
**Query:** `brandId` (bắt buộc), `status?` (`pending` | `winner` | `rejected`), `page?` (default 1), `q?` (search)
**Response:** `{ videos, total, page, limit: 20 }`

### POST /api/video/competitors
Thêm video TikTok đối thủ thủ công.

**Auth:** `requireUser`
**Body:** `{ brandId, tiktokUrl }` (URL phải chứa `tiktok.com`)
**Response:** `201 { video }`; `409 { error }` nếu URL đã tồn tại cho brand này

### PATCH /api/video/competitors/[id]
Cập nhật trạng thái video.

**Auth:** `requireUser`
**Body:** `{ status: "pending" | "winner" | "rejected" }`
**Response:** `{ video }`

### GET /api/video/competitors/[id]/fetch-cdn
Resolve CDN URL phát được qua proxy tikwm.com cho video TikTok đã lưu.

**Auth:** `requireUser`
**Response:** `{ cdnUrl: string | null }`

---

## Video — Transcripts

### GET /api/video/transcripts?videoId=xxx
Lấy transcript theo video.

**Auth:** `requireUser`
**Response:** `{ transcript }`

### POST /api/video/transcripts
Tạo transcript record cho video.

**Auth:** `requireUser`
**Body:** `{ videoId }`
**Response:** `201 { transcript }`; nếu đã tồn tại transcript cho video này, trả về `200` với transcript hiện có (không lỗi)

### GET /api/video/transcripts/[id]
Lấy transcript theo ID.

**Auth:** `requireUser`
**Response:** `{ transcript }` hoặc `404 { error: "not_found" }`

### PATCH /api/video/transcripts/[id]
Lưu transcript đã chỉnh sửa thủ công.

**Auth:** `requireUser`
**Body:** `{ editedText: string }`
**Response:** `{ transcript }`

### POST /api/video/transcripts/[id]/run
Chạy transcription: fetch audio-only URL từ tikwm, tải audio, encode base64, gửi Gemini (`gemini-2.5-flash`) để chuyển giọng nói tiếng Việt thành văn bản, lưu raw text. Dùng Google API key riêng của user.

**Auth:** `requireUser`
**Response:** `{ transcript }` (đã cập nhật) hoặc lỗi: `video_not_found`, `tikwm_fetch_failed` (502), `music_url_unavailable` (502), `audio_fetch_failed` (502), `transcription_empty` (502)

> Có sẵn code fallback OpenAI Whisper nhưng đang bị comment out (giữ lại để bật lại sau nếu cần).

---

## Video — Scripts

### GET /api/video/scripts?transcriptId=xxx
Lấy danh sách scripts theo transcript.

**Auth:** `requireUser`
**Response:** `{ scripts }`

### POST /api/video/scripts
Sinh kịch bản AI qua Claude, SSE stream.

**Auth:** `requireUser` (validate body trước, trả JSON error nếu thiếu field hoặc auth fail trước khi mở stream)
**Body:**
```typescript
{
  transcriptId: string,
  brandId: string,
  productId?: string,
  promptConfig: {
    tone: string,              // bắt buộc
    notes?: string,
    attributes?: string,
    targetAudience?: string,
    sellingPoints?: string,
    ttsProvider?: "vbee" | "elevenlabs",
    elevenLabsModel?: string,
  },
}
```
**Response type:** `text/event-stream` (`Cache-Control: no-cache`, `Connection: keep-alive`)
**SSE Events:**
```
event: token → { text }         // streamed chunks
event: done  → { scriptId, rawText }
event: error → { message }
```
Sau khi stream xong, script được lưu vào DB qua `ScriptService.create`.

### PATCH /api/video/scripts/[id]
Lưu bản kịch bản đã hoàn thiện.

**Auth:** `requireUser`
**Body:** `{ finalText: string }`
**Response:** `{ script }`

---

## Video — Audio & Voice (Vbee + ElevenLabs)

### GET /api/video/audio
Lấy danh sách audio đã tạo.

**Auth:** `requireUser`
**Query:** `scriptId` HOẶC `brandId` (bắt buộc 1 trong 2)
**Response:** `{ audios }`

### POST /api/video/audio
Sinh audio TTS từ script bằng voice preset đã lưu (rẽ nhánh theo `preset.provider`: `elevenlabs` hoặc `vbee`), upload MP3 lên Supabase Storage bucket `generated-audio` (`audio/{brandId}/{scriptId}/{timestamp}.mp3`), ghi record `generated_audio`.

**Auth:** `requireUser`
**Body:** `{ scriptId, voicePresetId }`
**Provider ElevenLabs:** yêu cầu `process.env.ELEVENLABS_API_KEY` + `preset.provider_voice_id`
**Provider Vbee:** dùng Vbee API key riêng của user (`getUserApiKey`)
**Response:** `201 { audio }`; lỗi: `script_not_found` (404), `script_text_empty` (400), `voice_preset_not_found` (404), `elevenlabs_key_missing` (500), `elevenlabs_voice_id_missing` (400), `audio_download_failed` (502)

### DELETE /api/video/audio/[id]
Xóa record audio đã tạo + object trong Storage (lỗi xóa storage bị nuốt/log, không fail request).

**Auth:** `requireUser`
**Response:** `{ ok: true }`

### GET /api/video/vbee/voices
Lấy danh sách giọng đọc Vbee bằng API key riêng của user.

**Auth:** `requireUser`
**Response:** `{ voices }`

### POST /api/video/vbee/preview
Sinh preview TTS ngắn qua Vbee (không upload storage, trả thẳng URL provider).

**Auth:** `requireUser`
**Body:** `{ voice_code, text (tối đa 500 ký tự), speed?, pitch? }`
**Response:** `{ audioUrl }`

### GET /api/video/elevenlabs/voices
Lấy danh sách giọng đọc ElevenLabs bằng server-side API key (`process.env.ELEVENLABS_API_KEY`, không phải key riêng user).

**Auth:** `requireUser`
**Response:** `{ voices: ElevenLabsVoiceItem[] }`; `500 { error: "elevenlabs_key_missing" }` nếu chưa cấu hình env var

### GET /api/video/voice-presets?brandId=xxx
Lấy voice presets theo brand.

**Auth:** `requireUser`
**Response:** `{ presets }`

### POST /api/video/voice-presets
Tạo voice preset mới.

**Auth:** `requireUser`
**Body:**
```typescript
{
  brandId: string,
  displayName: string,
  voiceCode?: string,           // bắt buộc nếu provider = "vbee"
  speed?: number,                // default 1.0
  pitch?: number,                // default 1.0
  pauseConfig?: object,
  isDefault?: boolean,           // default false
  provider?: "vbee" | "elevenlabs", // default "vbee"
  providerVoiceId?: string,      // bắt buộc nếu provider = "elevenlabs"
  elevenLabsModel?: string,
}
```
**Response:** `201 { preset }`

### PATCH /api/video/voice-presets/[id]
Cập nhật một phần voice preset.

**Auth:** `requireUser`
**Body:** `{ display_name?, speed?, pitch?, is_default? }`
**Response:** `{ preset }`

### DELETE /api/video/voice-presets/[id]
Xóa voice preset.

**Auth:** `requireUser`
**Response:** `{ ok: true }`

### GET /api/video/voice-ratings?brandId=xxx
Lấy điểm đánh giá trung bình theo từng giọng Vbee cho brand (tính aggregate trong memory, không dùng DB aggregation).

**Auth:** `requireUser`
**Response:** `{ ratings: [{ vbee_voice_code, avg_score, count }] }`

### POST /api/video/voice-ratings
Gửi đánh giá cho một giọng đọc.

**Auth:** `requireUser`
**Body:** `{ brandId, voiceCode, score (1-5), note? }`
**Response:** `201 { rating }`

---

## Video — Apify Config / Sync / Webhook / Cron

Có **3 cơ chế sync khác nhau** cộng thêm 1 webhook — xem ghi chú phân biệt bên dưới.

### GET /api/video/apify-config?brandId=xxx
Lấy cấu hình Apify task của brand.

**Auth:** `requireUser`
**Response:** `{ config }`

### PUT /api/video/apify-config
Tạo/cập nhật cấu hình Apify task cho brand.

**Auth:** `verifyAdmin` (chỉ admin — lưu ý GET cùng file chỉ cần `requireUser`, PUT yêu cầu admin)
**Body:** `{ brandId, apifyTaskId (bắt buộc), isEnabled? (default true) }`
**Response:** `{ config }`

### POST /api/video/apify-config/sync
Trigger sync thủ công ("Sync now"): tra config của brand, lấy **run thành công gần nhất** của `apify_task_id` qua Apify API, pull dataset items, upsert videos, cập nhật `last_run_id`/`last_dataset_id`.

**Auth:** `requireUser`
**Body:** `{ brandId }`
**Yêu cầu:** `process.env.APIFY_TOKEN`
**Response:** `{ ok: true, upserted }`; lỗi: `apify_config_not_found` (404), `apify_sync_disabled` (400, khi `is_enabled` = false), `no_succeeded_run` (404)

### POST /api/video/sync-apify
Sync thủ công dùng **thẳng dataset ID** (không qua config/task-id resolution). Route legacy/kiểm thử thủ công — fetch trực tiếp `https://api.apify.com/v2/datasets/{id}/items` (không gửi `APIFY_TOKEN`, truy cập dataset public), không có bookkeeping `markSynced`.

**Auth:** `requireUser`
**Body:** `{ brandId, apifyDatasetId }`
**Response:** `{ ok: true, upserted: count }`

> **Phân biệt 3 cơ chế sync:** `/api/video/sync-apify` là đường tay/legacy dùng dataset ID trực tiếp; `/api/video/apify-config/sync` là nút "Sync now" hiện tại, tự resolve dataset từ task ID đã cấu hình và có bookkeeping; `/api/cron/sync-apify` là phiên bản tự động chạy theo lịch, dùng chung logic với `apify-config/sync` nhưng lặp qua tất cả brand có cấu hình `is_enabled`.

### POST /api/apify/webhook
Webhook nhận từ chính Apify platform sau khi 1 run hoàn tất.

**Auth:** không có (không có `requireUser`/admin check) — dùng `createAdminClient()` (service-role); bảo mật chỉ dựa vào việc `brandId`/`datasetId` query params khó đoán
**Query:** `brandId`, `datasetId` (bắt buộc; nếu thiếu, im lặng trả `{ ok: true }` để tránh Apify retry)
**Response:** luôn `200 { ok: true }` hoặc `{ ok: true, upserted }` kể cả khi có lỗi nội bộ (trừ lỗi fetch dataset → 500), để tránh Apify retry storm

### GET /api/cron/sync-apify
Cron job (Vercel Cron) đồng bộ tất cả brand có Apify config `is_enabled = true`.

**Auth:** header `Authorization: Bearer {process.env.CRON_SECRET}` (401 nếu thiếu/sai) — không dùng Supabase user auth
**Config:** `dynamic = "force-dynamic"`, `maxDuration = 60`
**Logic:** lặp qua từng brand có config enabled; skip nếu đã sync (`lastRun.runId === last_run_id`) hoặc không có run thành công; lỗi từng brand được bắt riêng lẻ (`markError`), không dừng cả loop
**Response:** `{ ok: true, processed, results: [{ brandId, status: "synced" | "skipped" | "error", upserted?, message? }] }`

---

## Admin

### GET /api/admin/stats
Lấy số liệu thống kê/sử dụng cho admin dashboard.

**Auth:** `requireAdmin` (chỉ admin)
**Query:** `days?` (default 30, giới hạn 1–90)
**Response:** object thống kê từ `AnalyticsService.getStats`

---

## Auth

### POST /api/auth/signup
Đăng ký tài khoản mới qua Supabase auth.

**Auth:** không có (route này tạo account)
**Body:** `{ email, password (>= 8 ký tự), full_name? }`
**Response:** `{ ok: true, userId, email }` hoặc lỗi `ApiError`

### POST /api/auth/forgot-password
Reset mật khẩu và gửi mật khẩu mới qua email. An toàn chống dò email (luôn trả cùng 1 message).

**Auth:** không có (dùng `createAdminClient()` nội bộ)
**Body:** `{ email }`
**Response:** luôn `{ message: GENERIC_MESSAGE }` bất kể kết quả thực tế

### POST /api/auth/verify-login
Kiểm tra sau khi đăng nhập: xác nhận profile đang active, cập nhật `last_login_at`.

**Auth:** gọi trực tiếp `supabase.auth.getUser()` (không dùng helper `requireUser`), sau đó tra profile qua admin client
**Response:** `{ success: true }` hoặc lỗi: `401` (chưa đăng nhập), `404` (không tìm thấy profile), `403 "deactivated"` (tài khoản bị khóa)

### GET /api/user/me
Lấy profile của user hiện tại.

**Auth:** `requireUser`
**Response:** kết quả từ `UserService.getMe()`

### DELETE /api/user/me
Xóa tài khoản hiện tại (yêu cầu gõ email xác nhận).

**Auth:** `requireUser` + `supabase.auth.getUser()` + `createAdminClient().auth.admin.deleteUser`
**Body:** `{ confirm }` (phải khớp chính xác email của user)
**Response:** `{ ok: true }` hoặc lỗi `ApiError` (`400 confirm_email_required`, `500 delete_failed`)

---

## Utility

### GET /api/google-fonts
Proxy Google Fonts API (ẩn API key khỏi client). Cache 24h (`revalidate: 86400`).

**Auth:** không có (chỉ dùng API key server-side)

### POST /api/upload-reference
Upload ảnh tham khảo vào bucket `campaign-inputs`. Max 10MB, JPG/PNG/WEBP.

**Auth:** `requireUser`
**Response:** `{ url, path }`

### GET /api/download-image?url=xxx&filename=yyy
Proxy/tải ảnh từ URL ngoài về dưới dạng attachment (có SSRF guard).

**Auth:** `requireUser` + `assertSafeOutboundUrl` guard + chỉ chấp nhận content-type `image/*`
**Response:** raw image bytes với header `content-disposition: attachment`

### POST /api/analytics/track
Ghi nhận sự kiện pageview/analytics.

**Auth:** không có — dùng `createAdminClient()` trực tiếp (service-role, bypass RLS)
**Body:** `{ path, sessionId, referrer? }` (path tối đa 500 ký tự, sessionId 64, referrer 1000)
**Response:** `{ ok: true }` hoặc `400 { error: "invalid_body" }`

---

## Security Notes

- Phần lớn routes đã có `requireUser()` guard; các thao tác ghi/xóa dữ liệu hệ thống dùng chung (system concepts, brands, Apify task config) yêu cầu `verifyAdmin`/`requireAdmin`.
- Routes không có auth guard (theo thiết kế hoặc rủi ro cần theo dõi): `/api/auth/signup`, `/api/auth/forgot-password` (pre-auth, hợp lý), `/api/google-fonts`, `/api/content-adapt/parse-excel`, `/api/content-adapt/export`, `/api/analytics/track`, `/api/apify/webhook` (bảo mật dựa vào obscurity của query params — nên cân nhắc thêm shared-secret validation).
- `/api/cron/sync-apify` dùng `CRON_SECRET` bearer token thay vì user auth — đúng pattern cho scheduled job.
- `/api/save-ad` và `/api/download-image` có SSRF protection (`assertSafeOutboundUrl`) chặn localhost, private IP, `.internal`, `.local`, non-HTTPS.
- `/api/video/transcripts/[id]/run` có sẵn code fallback OpenAI Whisper nhưng đang comment out — cần dọn dẹp hoặc kích hoạt lại tùy quyết định sản phẩm.

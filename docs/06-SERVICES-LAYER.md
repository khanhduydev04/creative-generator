# Services Layer — Tầng xử lý dữ liệu

Tất cả service files nằm trong `src/services/`. Mỗi service nhận Supabase client qua constructor và thực hiện CRUD operations.

## Pattern chung

```typescript
// Tạo instance trong API route:
const supabase = await createClient();          // Server-side Supabase client
const service = new SomeService(supabase);       // Inject client
const result = await service.someMethod(args);   // Call method
```

## Chi tiết các Service

> **Lưu ý:** `ClientService` (`clientService.ts`) — khái niệm multi-tenant "Client" cũ — đã bị **xóa hoàn toàn** khỏi codebase. "Brand" giờ là đơn vị workspace cấp cao nhất (không còn phân cấp Client → Brand). Nếu tài liệu cũ nào còn nhắc `clientService.ts` hoặc `getBrandsByClient()`, thông tin đó không còn đúng.

### BrandService (`brandService.ts`)

| Method | Mô tả |
|--------|-------|
| `listBrands()` | Lấy tất cả brands chưa soft-delete (RLS quyết định quyền truy cập) |
| `getBrandById(id)` | Lấy 1 brand |
| `createBrand(name, description?)` | Tạo brand mới, gán `owner_user_id` |
| `updateBrand(id, updates)` | Cập nhật `name`/`description` |
| `deleteBrand(id)` | Soft delete (set `deleted_at`) — chỉ admin (RLS `brands_delete_admin` + trigger `guard_brand_admin_columns`); admin có thể xóa brand của bất kỳ ai, không giới hạn theo `owner_user_id` |

### BrandProductService (`brandProductService.ts`)

| Method | Mô tả |
|--------|-------|
| `getByBrandId(brandId)` | Lấy products theo brand |
| `getById(id)` | Lấy 1 product (null nếu không tồn tại) |
| `create(product)` | Tạo product — pre-flight verify brand tồn tại |
| `update(id, updates)` | Cập nhật — pre-flight verify product tồn tại |
| `delete(id)` | Xóa — pre-flight verify product tồn tại |

> **Lưu ý:** `ProductMarketService` (từng quản lý bảng `product_markets`) không còn tồn tại dưới dạng service riêng. Dữ liệu `product_markets` hiện được đọc trực tiếp trong `src/lib/sheets-reader.ts` (dùng bởi generation pipeline — xem `05-GENERATION-PIPELINE.md`), không qua lớp service.

### BrandKitService (`brandKitService.ts`)

| Method | Mô tả |
|--------|-------|
| `getBrandKit(brandId)` | Lấy brand kit (colors, fonts, logos) |
| `saveBrandKit(brandId, fields)` | Upsert brand kit |
| `uploadLogo(brandId, type, file, filename)` | Upload logo light/dark |
| `uploadFontFiles(brandId, fontName, files, specimen?)` | Upload font files |
| `getLogoUrls(kit)` | Tạo public URLs từ paths |
| `getFontSpecimenUrl(kit)` | Tạo public URL cho font specimen |

### ConceptPromptService (`conceptPromptService.ts`)

| Method | Mô tả |
|--------|-------|
| `getAll()` | Lấy tất cả concepts |
| `getByConceptId(id)` | Lấy concept theo concept_id |
| `getByConceptIds(ids[])` | Lấy nhiều concepts |
| `create(input)` | Tạo concept mới |
| `update(conceptId, input)` | Cập nhật concept |
| `delete(conceptId)` | Xóa concept |

### PersonaService (`personaService.ts`)

| Method | Mô tả |
|--------|-------|
| `getPersonasByBrand(brandId)` | Lấy personas theo brand |
| `getPersonaById(id)` | Lấy 1 persona |
| `createPersona(brandId, fields)` | Tạo persona |
| `updatePersona(id, fields)` | Cập nhật |
| `deletePersona(id)` | Soft delete |

### BrandIntelligenceService (`brandIntelligenceService.ts`)

| Method | Mô tả |
|--------|-------|
| `getResearchSummary(brandId)` | Lấy brand research summary |
| `saveResearchSummary(brandId, content)` | Upsert research summary |
| `generatePersonas(brandId, summaryId, content)` | Claude Haiku tạo 10 personas từ summary |

### SavedAdService (`savedAdService.ts`)

| Method | Mô tả |
|--------|-------|
| `getByBrandId(brandId, productId?)` | Lấy saved ads theo brand, optional filter theo product |
| `create(ad)` | Tạo record (brand_id, product_id, storage_path, image_url, headline, concept, prompt, source) |
| `deleteByStoragePath(path)` | Xóa 1 record theo storage_path |
| `bulkDeleteByStoragePaths(paths[])` | Xóa nhiều records |

### StorageService (`storageService.ts`)

| Method | Mô tả |
|--------|-------|
| `upload(bucket, path, file, contentType)` | Upload file lên Supabase Storage |
| `getPublicUrl(bucket, path)` | Lấy public URL |
| `remove(bucket, paths[])` | Xóa files |
| `buildPath(namespace, entityId, filename)` | Tạo path chuẩn |

## Video Services

Nhóm service phục vụ pipeline xử lý video đối thủ TikTok (xem chi tiết luồng trong `05-GENERATION-PIPELINE.md`, phần "Video Pipeline"). Class-based service dưới đây theo cùng pattern constructor(supabase) như trên; 2 service TTS (`VbeeService`, `ElevenLabsService`) không nhận Supabase client mà nhận trực tiếp API key.

### BrandApifyConfigService (`brandApifyConfigService.ts`)

| Method | Mô tả |
|--------|-------|
| `listEnabled()` | Lấy tất cả config có `is_enabled = true` — dùng bởi cron (admin client, bypass RLS) |
| `getByBrand(brandId)` | Lấy config theo brand |
| `upsertConfig(brandId, apifyTaskId, isEnabled)` | Tạo/cập nhật config (upsert theo `brand_id`) |
| `markSynced(brandId, runId, datasetId)` | Cập nhật `last_run_id`, `last_dataset_id`, `last_synced_at`, xóa `last_error` |
| `markError(brandId, message)` | Ghi `last_error` khi sync thất bại |

### CompetitorVideoService (`competitorVideoService.ts`)

Constructor nhận thêm `userId`: `new CompetitorVideoService(supabase, userId)`.

| Method | Mô tả |
|--------|-------|
| `listVideos(brandId, status?, page?, limit?, q?)` | List phân trang theo brand, filter theo status + search (`tiktok_url`/`author_handle`), sort theo views desc |
| `addVideo(brandId, tiktokUrl)` | Thêm video thủ công (extract `video_id` từ URL qua regex `/video/(\d+)/`) |
| `updateStatus(videoId, status)` | Cập nhật status |
| `upsertVideos(brandId, items[], apifyRunId?)` | Upsert hàng loạt từ Apify dataset items — filter `isAd === true` + URL chứa `tiktok.com`, gọi RPC `upsert_competitor_videos` (giữ nguyên status người dùng đã set) |

### TranscriptService (`transcriptService.ts`)

| Method | Mô tả |
|--------|-------|
| `getByVideoId(videoId)` | Lấy transcript theo video |
| `getById(id)` | Lấy 1 transcript |
| `create(videoId)` | Tạo transcript mới, `whisper_status = "pending"` |
| `updateStatus(id, status)` | Cập nhật `whisper_status` (`pending`/`processing`/`done`/`failed`) |
| `saveRawText(id, rawText)` | Lưu kết quả transcribe, set `whisper_status = "done"` |
| `saveEditedText(id, editedText)` | Lưu bản edit thủ công của user |

### ScriptService (`scriptService.ts`)

| Method | Mô tả |
|--------|-------|
| `listByTranscript(transcriptId)` | List scripts theo transcript, mới nhất trước |
| `create(transcriptId, brandId, rawText, promptConfig, llmModel, ttsProvider?, elevenLabsModel?)` | Tạo script mới (mặc định `ttsProvider = "vbee"`) |
| `saveFinalText(id, finalText)` | Lưu bản chỉnh sửa cuối của script |

### VoicePresetService (`voicePresetService.ts`)

| Method | Mô tả |
|--------|-------|
| `list(brandId)` | List voice presets theo brand |
| `create(input)` | Tạo preset (displayName, voiceCode, speed, pitch, provider, providerVoiceId, elevenLabsModel...) |
| `update(id, updates)` | Cập nhật `display_name`/`speed`/`pitch`/`pause_config`/`is_default` |
| `delete(id)` | Xóa preset |

### GeneratedAudioService (`generatedAudioService.ts`)

| Method | Mô tả |
|--------|-------|
| `listByBrand(brandId)` | List audio đã tạo theo brand, join `voice_preset` + `brand_script` |
| `listByScript(scriptId)` | List audio theo script, join `voice_preset` |
| `create(input)` | Tạo record (scriptId, brandId, voicePresetId, storagePath, vbeeAudioUrl, durationSecs, provider) |
| `delete(id)` | Xóa record, trả về `storagePath` để caller xóa file trong Storage |

### VbeeService (`vbeeService.ts`)

Constructor nhận API key trực tiếp: `new VbeeService(apiKey)` (không nhận Supabase client).

| Method | Mô tả |
|--------|-------|
| `listVoices()` | `GET https://vbee.vn/api/v1/voices` — TTS tiếng Việt bản địa |
| `synthesize(request)` | `POST /tts/convert` — trả `{ audio_url, duration? }` (cần fetch riêng để lấy audio binary) |

### ElevenLabsService (`elevenlabsService.ts`)

Constructor nhận API key trực tiếp: `new ElevenLabsService(apiKey)`.

| Method | Mô tả |
|--------|-------|
| `listVoices()` | `GET /v2/voices` |
| `synthesize(request)` | `POST /v1/text-to-speech/{voice_id}` — model `eleven_flash_v2_5` (mặc định) hoặc `eleven_v3`, trả về `ArrayBuffer` trực tiếp (không cần fetch lại như Vbee) |

### scriptPrompt.ts (module-level function)

```typescript
buildScriptSystemPrompt(input: ScriptPromptInput)
// → string (system prompt hoàn chỉnh cho Claude Sonnet)
```

Ghép system prompt cho script generation: brand/product context, tone (`humor`/`authentic`/`dramatic`), yêu cầu giữ nguyên cấu trúc transcript gốc, và kỹ thuật nhấn nhá khác nhau tùy `ttsProvider` (`vbee` | `elevenlabs` với `elevenLabsModel` là `eleven_flash_v2_5` hoặc `eleven_v3`). **Không** sinh nhãn `[HOOK]/[BODY]/[CTA]` trong output — xem `05-GENERATION-PIPELINE.md`.

## AI Services (Module-level functions)

### geminiClient.ts

```typescript
// Gọi Gemini API (userId dùng để lấy API key riêng của user qua key-provider)
geminiGenerate(userId, model, parts[], maxOutputTokens?, structuredOutput?, systemInstruction?)
// → string (raw response text)

// Resize ảnh cho Gemini (inline_data base64)
resizeImageForApi(buffer, maxWidth?)
// → { data: string (base64), mimeType: string }

resizeImageFromUrl(url, maxWidth?)
// → { data: string (base64), mimeType: string }
```

**Model:** `GEMINI_TEXT_MODEL` = `gemini-2.5-flash`
**Retry:** tối đa 3 lần, backoff có jitter; phân biệt lỗi rate-limit theo phút (retry được) và quota hết theo ngày (fail ngay với thông báo rõ)

**Lưu ý:** Transcription (Giai đoạn 2 của Video Pipeline) **không** dùng wrapper `geminiGenerate()` này — `src/app/api/video/transcripts/[id]/run/route.ts` gọi trực tiếp `GoogleGenAI` SDK (model `gemini-2.5-flash`, audio inline input) độc lập với `geminiClient.ts`. Xem `05-GENERATION-PIPELINE.md`.

### kieClient.ts

```typescript
// Tạo ảnh bằng KIE AI
generateImage(prompt, options?)
// → { imageUrl: string, taskId: string }

// Options:
{
  aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9",
  resolution?: "1K" | "2K" | "4K",
  imageInput?: string[],    // Max 14 image URLs
}
```

**Model:** `nano-banana-2`
**Flow:** Create task → Poll (DB callback → API fallback) → Return image URL
**Timeout:** ~7 minutes max polling (84 attempts × 5s)

### claudeClient.ts

```typescript
// Phân tích ảnh bằng Claude Vision (userId dùng để lấy API key riêng của user)
claudeVisionAnalyze(userId, imageBase64, mimeType, prompt, maxTokens?)
// → string (raw response text)
// Model: CLAUDE_HAIKU_MODEL

// Gọi Claude text-only
claudeTextGenerate(userId, systemPrompt, userMessage, maxTokens?)
// → string (raw response text)
// Model: CLAUDE_HAIKU_MODEL

// Gọi Claude với streaming qua callback (dùng cho SSE)
claudeStreamGenerate(userId, systemPrompt, userMessage, onToken, maxTokens?)
// → string (full text sau khi stream xong)
// Model: CLAUDE_SONNET_MODEL
```

**Models:** `CLAUDE_HAIKU_MODEL` = `claude-haiku-4-5-20251001`, `CLAUDE_SONNET_MODEL` = `claude-sonnet-4-6`
**Dùng cho:**
- `claudeVisionAnalyze` (Haiku) — competitor ad image analysis
- `claudeTextGenerate` (Haiku) — competitor sheet analysis, landing page analysis, persona generation, content adaptation
- `claudeStreamGenerate` (Sonnet) — Video Pipeline script generation (Giai đoạn 3), gọi bởi `src/app/api/video/scripts/route.ts` với `onToken` gửi từng chunk qua SSE event `"token"`

**Retry:** cả 3 hàm dùng chung pattern — tối đa 2 lần retry, backoff nhân đôi (3s → 6s...), chỉ retry khi lỗi 429/529/overloaded/rate_limit

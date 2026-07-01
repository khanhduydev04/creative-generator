# Generation Pipeline — Luồng tạo quảng cáo

Đây là tài liệu mô tả chi tiết luồng tạo ảnh quảng cáo — phần core của ứng dụng.

## Tổng quan

Có 2 chế độ tạo quảng cáo:

| Mode | Mô tả | Khi nào dùng |
|------|-------|-------------|
| **concept** | Tạo dựa trên chiến lược sáng tạo (concept) + phân tích đối thủ | Tạo quảng cáo mới từ đầu |
| **competitor_ref** | Tạo dựa trên ảnh quảng cáo đối thủ (copy layout, thay nội dung) | "Beat" một quảng cáo cụ thể |

## Pipeline — Concept Mode

```
┌─────────────────────────────────────────────────────────────┐
│ POST /api/generate-ads (SSE Stream)                         │
│                                                             │
│  Step 1: Read Product Page                                  │
│  ├── Fetch HTML từ landingPageUrl                           │
│  ├── Extract: brand, product, claims, ingredients, benefits │
│  └── Output: ProductContext                                 │
│                                                             │
│  Step 2: Analyze Competitors (parallel với Step 3)          │
│  ├── Nếu có marketId → load từ product_markets DB          │
│  │   ├── Try Google Sheets API (hyperlinks)                 │
│  │   ├── Fallback: CSV export (no hyperlinks)               │
│  │   └── Fallback: cached CSV từ DB                         │
│  ├── Nếu deepAnalysis → analyze images + landing pages      │
│  └── Output: CompetitorContext                              │
│                                                             │
│  Step 3: Load Concepts (parallel với Step 2)                │
│  ├── Load concept prompt + reference images từ DB           │
│  └── Output: ConceptWithPrompt[]                            │
│                                                             │
│  Step 4: Apply Concept Skill (Gemini structured output)     │
│  ├── Với mỗi concept, gọi Gemini tạo N variants            │
│  ├── Mỗi variant có: headline, bodyText, visualDirection,   │
│  │   emotionalHook, differentiator                          │
│  └── Output: ConceptDirective[] (unique per variant)        │
│                                                             │
│  Step 5: Assemble Prompts + Prepare Images                  │
│  ├── Resize product images (1024px) → upload Supabase       │
│  ├── Resize concept ref images → upload Supabase            │
│  ├── Resize brand logo (512px) → upload Supabase            │
│  ├── Ghép prompt: brand + product + concept + audience      │
│  │   + colors + typography + layout + language               │
│  └── Output: PromptEntry[] (prompt string + image URLs)     │
│                                                             │
│  Step 6: Generate Images (KIE AI, parallel)                 │
│  ├── Condense prompt nếu > 20,000 chars                     │
│  ├── Gọi KIE API với prompt + image inputs                  │
│  ├── KIE polling: DB callback → API fallback                │
│  └── Stream kết quả qua SSE events                          │
└─────────────────────────────────────────────────────────────┘
```

## Pipeline — Competitor Reference Mode

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Read Product Page (giống concept mode)             │
│                                                             │
│  Step 2: Analyze Competitor Ad Image (Claude Haiku Vision)   │
│  ├── Gửi ảnh competitor tới Claude Haiku                    │
│  ├── Extract: layout, colors, typography, hierarchy,         │
│  │   composition, text, props, mood, strengths, weaknesses  │
│  └── Output: CompetitorAdAnalysis                           │
│                                                             │
│  Step 3: Assemble Competitor Ref Prompt                     │
│  ├── Prompt chứa: competitor analysis + brand identity      │
│  ├── Mỗi variant có twist khác nhau:                        │
│  │   #0: Closest to reference                               │
│  │   #1: Elevate storytelling                               │
│  │   #2: Authenticity over polish                           │
│  │   #3: Bold contrast                                      │
│  │   #4: Benefit-focused                                    │
│  └── Output: PromptEntry[] + combined images                │
│                                                             │
│  Step 4: Generate Images (giống concept mode)               │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Vai trò |
|------|---------|
| `src/app/api/generate-ads/route.ts` | Entry point, orchestrator, SSE stream |
| `src/lib/gemini-reader.ts` | Đọc product page (Gemini), phân tích competitor ad (Claude Haiku) |
| `src/lib/sheets-reader.ts` | Fetch dữ liệu từ Google Sheets |
| `src/lib/competitor-analyzer.ts` | Deep analysis — image (Claude Haiku Vision) + landing page (Claude Haiku) + synthesis (Gemini) |
| `src/lib/concept-skills.ts` | Sheet analysis (Claude Haiku), creative variants (Gemini structured output) |
| `src/lib/concept-prompt-loader.ts` | Load concept data từ DB |
| `src/lib/prompt-assembler.ts` | Ghép prompt cuối cùng |
| `src/lib/image-utils.ts` | Resize + upload ảnh |
| `src/services/kieClient.ts` | Gọi KIE API + polling |
| `src/services/geminiClient.ts` | Wrapper Gemini API |

## Image Pipeline

```
Product Images (user upload)
    ↓ resize to 1024px (sharp)
    ↓ upload to Supabase Storage (temp-resized/)
    ↓ public URL
    ↓
KIE API (max 14 images per call)
    ├── Product images (front, back, sides)
    ├── Brand logo (512px)
    ├── Concept reference images (max 2)
    └── Competitor reference (1, chỉ competitor_ref mode)
```

## Prompt Structure

Prompt cuối cùng (~15,000-20,000 chars) bao gồm:

1. **Ad Copy Override** (nếu user cung cấp headline/body thủ công)
2. **Language Override** (nếu không phải English)
3. **Task** (aspect ratio, resolution, funnel stage)
4. **Brand Identity** (brand name, logo rules)
5. **Product** (description, claims, ingredients, benefits)
6. **Image Map** (vai trò từng ảnh: front, back, logo, ref...)
7. **Product Fidelity** (rules chống biến dạng sản phẩm)
8. **Concept Design Section** (visual direction + layout variant)
9. **Text** (headline, body — exact reproduction + capitalization rules)
10. **Colors** (6 brand colors, strict enforcement)
11. **Typography** (font, sizes, weights)
12. **Visual Style** (tone, composition, lighting)
13. **Emotion** (emotional hook)
14. **Audience** (persona)
15. **Output Rules** (final checklist)

### Quy tắc chất lượng text & logo (enforced trong prompt)

**Text Capitalization:**
- Mọi text hiển thị trên ad phải dùng capitalization nhất quán: Title Case (Viết Hoa Chữ Cái Đầu Mỗi Từ) hoặc ALL CAPS
- Tuyệt đối KHÔNG viết hoa viết thường ngẫu nhiên (ví dụ: "bOoSt yOuR eNeRgY" ❌)
- Quy tắc áp dụng cho headline, body text, caption, và mọi text overlay

**Brand Logo:**
- KHÔNG BAO GIỜ tự generate/sáng tạo/vẽ logo mới
- Nếu có brand logo image đính kèm → phải sử dụng ĐÚNG NGUYÊN BẢN, không chỉnh sửa, không redesign
- Nếu không có logo image đính kèm → chỉ logo đã in sẵn trên bao bì sản phẩm được phép xuất hiện

Nếu prompt > 20,000 chars → `condensePromptForKie()` cắt bớt nhưng giữ language + brand color sections.

## KIE Polling Flow

```
generateImage(prompt, options)
    ↓
POST /api/v1/jobs/createTask → taskId
    ↓
Poll loop (max ~5 minutes):
    1. Check Supabase DB (kie-callback edge function ghi kết quả)
    2. Nếu không có → Check KIE API GET /api/v1/tasks/query
    3. Exponential backoff: 3s → 5s → 7s → ...
    ↓
Return { imageUrl, taskId }
```

---

# Video Pipeline — Luồng xử lý video đối thủ

Ngoài luồng tạo ảnh quảng cáo ở trên, app còn có một pipeline riêng để thu thập, phiên âm, viết lại kịch bản và tạo giọng đọc từ video TikTok của đối thủ. Pipeline này gồm 4 giai đoạn độc lập, mỗi giai đoạn được user (hoặc cron) trigger thủ công theo thứ tự: **Apify Sync → Transcription → Script Generation → Voice Generation**.

## Giai đoạn 1 — Apify Sync (thu thập video)

Mỗi brand có thể cấu hình một Apify Task ID (TikTok ads scraper) riêng, lưu trong bảng `brand_apify_config` (`apify_task_id`, `is_enabled`, `last_run_id`, `last_dataset_id`, `last_synced_at`, `last_error`). Có 2 cách trigger sync:

| Trigger | Route | Ghi chú |
|---------|-------|---------|
| **Cron tự động** | `GET /api/cron/sync-apify` | Lịch: Thứ 2 và Thứ 5, 10:00 sáng giờ VN (`0 3 * * 1` và `0 3 * * 4` UTC trong `vercel.json`). Duyệt qua **tất cả** brand có `is_enabled = true` (dùng admin Supabase client, bypass RLS) |
| **Manual "Sync now"** | `POST /api/video/apify-config/sync/route.ts` | Sync 1 brand cụ thể theo `brandId` trong request body, dùng user session (RLS-scoped) |

Cả 2 route đều dùng chung logic từ `src/services/apifySyncService.ts`:

```
fetchLastSucceededRun(apifyTaskId, token)
    ↓ GET /v2/actor-tasks/{taskId}/runs/last?status=SUCCEEDED
    ↓ Nếu runId === last_run_id đã lưu → skip (đã sync rồi)
fetchDatasetItems(datasetId, token)
    ↓ GET /v2/datasets/{datasetId}/items?clean=true&format=json
    ↓
CompetitorVideoService.upsertVideos(brandId, items, runId)
    ↓ Filter: chỉ giữ item có isAd === true và webVideoUrl chứa "tiktok.com"
    ↓ RPC upsert_competitor_videos() — ghi vào bảng competitor_videos
    ↓   (giữ nguyên status do người dùng set thủ công, chỉ update metrics)
    ↓
BrandApifyConfigService.markSynced(brandId, runId, datasetId)
```

Kết quả ghi vào bảng `competitor_videos` với các cột: `tiktok_url`, `video_id`, `views`, `likes`, `shares`, `comments`, `author_handle`, `cover_url`, `scraped_at`, `status` (mặc định `pending`), `scrape_status`.

## Giai đoạn 2 — Transcription (phiên âm)

File chính: **`src/app/api/video/transcripts/[id]/run/route.ts`**

```
POST /api/video/transcripts/{id}/run
    ↓
1. Lấy tiktok_url từ competitor_videos (qua transcript.video_id FK)
2. Gọi tikwm.com API (public, không cần key):
   GET https://www.tikwm.com/api/?url={tiktokUrl}&hd=0
   → trả về data.music (audio-only track URL, không lẫn video)
3. Fetch audio binary từ URL đó → base64
4. [ACTIVE] Gửi cho Gemini 2.5 Flash (model: "gemini-2.5-flash"):
   - inlineData: { mimeType: "audio/mpeg", data: audioBase64 }
   - prompt: "Transcribe the spoken content of this audio in vi language..."
   - Dùng GoogleGenAI SDK trực tiếp (KHÔNG qua geminiClient.ts wrapper)
5. Lưu raw_text vào bảng transcripts, whisper_status = "done"
```

**Lưu ý quan trọng:** File này còn chứa một khối code **OpenAI Whisper bị comment-out (`[DISABLED]`)** — dùng model `gpt-4o-mini-transcribe` qua `https://api.openai.com/v1/audio/transcriptions`, giới hạn 25MB. Đây từng là provider chính nhưng **hiện đang inactive** (comment ghi rõ: "re-enable when quota is restored"). Toàn bộ logic Whisper vẫn nằm trong file dưới dạng comment, sẵn sàng swap lại nếu cần.

Trạng thái transcript (`whisper_status`, tên cột giữ nguyên dù provider đã đổi sang Gemini): `pending → processing → done | failed`.

## Giai đoạn 3 — Script Generation (viết lại kịch bản)

File chính: **`src/app/api/video/scripts/route.ts`** (SSE streaming) + **`src/services/scriptPrompt.ts`** (prompt builder)

```
POST /api/video/scripts (SSE Stream)
    ↓
1. Lấy transcript text (edited_text ?? raw_text)
2. Lấy brand context (name, description) + optional product context
   (name, description, attributes, target_audience, selling_points, price)
3. buildScriptSystemPrompt() ghép system prompt:
   - Bước 1 (ẩn, không xuất ra): phân tích cấu trúc Hook/đoạn/cao trào/CTA của transcript gốc
   - Bước 2: viết kịch bản mới — GIỮ NGUYÊN số câu, số đoạn, nhịp điệu của bản gốc
   - Bắt buộc lồng tên brand tự nhiên ít nhất 1 lần
   - Kỹ thuật nhấn nhá khác nhau tùy ttsProvider (Vbee / ElevenLabs v2.5 / ElevenLabs v3)
4. claudeStreamGenerate() — Claude Sonnet ("claude-sonnet-4-6"), streaming qua SSE
   event "token" cho từng chunk, event "done" khi xong
5. Lưu vào bảng brand_scripts (raw_text, prompt_config, llm_model, tts_provider,
   elevenlabs_model)
```

**Định dạng output quan trọng:** Prompt yêu cầu tuyệt đối **KHÔNG dùng nhãn phân đoạn kiểu `[HOOK]` / `[THÂN BÀI]` / `[CTA]`** hay bất kỳ tiêu đề nào — chỉ viết lời thoại liền mạch, không có dòng trắng. (Nếu tài liệu cũ nào ghi rằng script có gắn nhãn `[HOOK]/[BODY]/[CTA]`, điều đó không còn đúng với implementation hiện tại.)

`buildScriptSystemPrompt()` cũng chọn kỹ thuật nhấn nhá khác nhau theo `ttsProvider`:
- **Vbee**: dấu phẩy/chấm/ba chấm để ngắt nghỉ, CHỮ HOA để nhấn
- **ElevenLabs `eleven_flash_v2_5`**: không hỗ trợ expression tags → dùng CHỮ HOA + dấu câu
- **ElevenLabs `eleven_v3`**: hỗ trợ expression tags như `[amused]`, `[chuckles]`, `[excited]`, v.v.

## Giai đoạn 4 — Voice Generation (tạo giọng đọc)

File chính: **`src/app/api/video/audio/route.ts`** (`POST` tạo audio, `GET` list theo brand/script)

User chọn một **voice preset** đã lưu (bảng `voice_presets`, quản lý qua `VoicePresetService`) — mỗi preset gắn với 1 trong 2 provider:

| Provider | Service | Model / đặc điểm |
|----------|---------|-------------------|
| **Vbee** (TTS tiếng Việt bản địa) | `src/services/vbeeService.ts` (`VbeeService`) | `POST https://vbee.vn/api/v1/tts/convert`, trả về `audio_url` cần download riêng để lấy binary |
| **ElevenLabs** | `src/services/elevenlabsService.ts` (`ElevenLabsService`) | `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`, model `eleven_flash_v2_5` hoặc `eleven_v3`, trả trực tiếp `ArrayBuffer` |

```
POST /api/video/audio
    ↓
1. Lấy text từ brand_scripts (final_text ?? raw_text)
2. Lấy voice_preset (provider, provider_voice_id, elevenlabs_model, speed, pitch)
3. Nếu provider === "elevenlabs":
     ElevenLabsService.synthesize({ text, voice_id, model_id, speed })
     → ArrayBuffer trực tiếp
   Nếu provider === "vbee" (mặc định):
     VbeeService.synthesize({ text, voice_code, speed, pitch })
     → { audio_url, duration } → fetch riêng để lấy ArrayBuffer
4. Upload vào Supabase Storage bucket "generated-audio"
5. Lưu record vào bảng generated_audios (script_id, brand_id, voice_preset_id,
   storage_path, vbee_audio_url, duration_secs, provider)
```

## Video Pipeline — Key Files

| File | Vai trò |
|------|---------|
| `src/app/api/cron/sync-apify/route.ts` | Cron job — sync tất cả brand có `is_enabled = true` (Mon+Thu 10am VN) |
| `src/app/api/video/apify-config/sync/route.ts` | Manual "Sync now" — sync 1 brand theo `brandId` |
| `src/services/apifySyncService.ts` | Fetch Apify run + dataset items (module-level functions) |
| `src/services/brandApifyConfigService.ts` | CRUD `brand_apify_config` (task ID, enabled flag, last sync state) |
| `src/services/competitorVideoService.ts` | CRUD `competitor_videos` + `upsertVideos()` (RPC-based upsert) |
| `src/app/api/video/transcripts/[id]/run/route.ts` | Fetch audio (tikwm.com) → transcribe (Gemini 2.5 Flash, active) — chứa Whisper fallback đã comment-out |
| `src/services/transcriptService.ts` | CRUD `transcripts` (status, raw_text, edited_text) |
| `src/app/api/video/scripts/route.ts` | SSE streaming script generation (Claude Sonnet) |
| `src/services/scriptPrompt.ts` | Prompt builder — phân tích cấu trúc transcript, style theo tts provider |
| `src/services/scriptService.ts` | CRUD `brand_scripts` |
| `src/app/api/video/audio/route.ts` | Tạo audio (Vbee hoặc ElevenLabs) + list theo brand/script |
| `src/services/vbeeService.ts` | Vbee TTS client (`listVoices`, `synthesize`) |
| `src/services/elevenlabsService.ts` | ElevenLabs TTS client (`listVoices`, `synthesize`) |
| `src/services/voicePresetService.ts` | CRUD `voice_presets` |
| `src/services/generatedAudioService.ts` | CRUD `generated_audios` |

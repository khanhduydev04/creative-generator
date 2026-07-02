# Design: MiniMax voice provider (T2A + Voice Cloning)

**Date:** 2026-07-02
**Status:** Approved (design)

## Problem

App hiện có 2 provider TTS (Vbee, ElevenLabs) theo kiểu string-union `TtsProvider` + branch `if/else`, không có registry. Cần thêm provider thứ 3 — **MiniMax Audio** — để mở rộng kho giọng (300+ giọng hệ thống, đa ngôn ngữ gồm tiếng Việt) và cho phép **clone giọng riêng** cho từng brand. MiniMax cũng giàu cấu hình hơn hẳn (model, emotion, volume, language_boost, audio format/bitrate, voice_modify, pronunciation_dict, pause markers), cần đưa các cấu hình này vào UI Voice Lab.

## Goals

1. Thêm provider `minimax` cắm vào cùng các điểm mở rộng của Vbee/ElevenLabs (không tạo registry mới).
2. **T2A synthesis** đầy đủ config: model, voice_id, speed, vol, pitch, emotion, language_boost, audio format/sample_rate/bitrate, cộng nhóm nâng cao: pause markers `<#x#>`, voice_modify (timbre/intensity/sound_effects), pronunciation_dict.
3. **Voice Cloning**: upload audio (10s–5 phút) → tạo giọng riêng cho brand → dùng trong T2A.
4. Lỗi provider trả mã thân thiện thay vì nuốt thành `internal` (tạo tối thiểu `ProviderError`).

## Non-goals

- Không streaming / WebSocket T2A.
- Không async long-text (T2A đồng bộ ≤10.000 ký tự là đủ cho kịch bản quảng cáo).
- Không subtitle/timestamp.
- Không Voice Design (tạo giọng từ mô tả).
- Không làm hạ tầng admin API-key DB (spec pending `2026-07-02-api-key-admin-tts-defaults-design.md`); MiniMax **tạm dùng env**.
- Không gộp `elevenlabs_model` vào `provider_config` lần này (giữ scope).

## Decisions (đã chốt)

| Vấn đề | Quyết định |
|--------|-----------|
| Phạm vi | T2A (full config) + Voice Cloning |
| Credential | env: `MINIMAX_API_KEY` + `MINIMAX_GROUP_ID` (admin DB để sau) |
| Config nâng cao trên UI | Pause markers `<#x#>`, voice_modify, pronunciation_dict (bỏ subtitle/timestamp) |
| Lưu config preset | Cột JSONB `provider_config` (Approach A) |
| Registry | Không — giữ pattern string-union + branch hiện có |

---

## Bối cảnh API MiniMax (đã nghiên cứu)

- **T2A v2:** `POST https://api.minimax.io/v1/t2a_v2?GroupId=<gid>`, header `Authorization: Bearer <key>`, `Content-Type: application/json`.
  - Request: `model`, `text` (≤10.000 ký tự, hỗ trợ pause `<#x#>` 0.01–99.99s), `stream:false`, `output_format:"hex"`, `language_boost`, `voice_setting{ voice_id, speed(0.5–2.0), vol((0,10]), pitch(-12..12 int), emotion }`, `audio_setting{ sample_rate, bitrate, format, channel }`, `voice_modify{ pitch,intensity,timbre(-100..100), sound_effects }`, `pronunciation_dict{ tone:["từ/cách đọc"] }`.
  - Response: `data.audio` (hex), `extra_info.audio_length` (ms), `base_resp{ status_code, status_msg }`.
  - Error codes: `0` ok, `1002` rate limit, `1004` auth failed, `1039` TPM limit, `1042` invalid chars >10%, `2013` invalid params, `2038` permission.
- **Models:** `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo` (HD = chất lượng cao/narration; Turbo = nhanh/rẻ). Mặc định `speech-2.6-hd`.
- **Emotion:** `happy|sad|angry|fearful|disgusted|surprised|calm|fluent|whisper`.
- **sound_effects:** `spacious_echo|auditorium_echo|lofi_telephone|robotic`.
- **List voices:** `POST https://api.minimax.io/v1/get_voice?GroupId=<gid>` body `{voice_type:"all"}` → `system_voice[]`, `voice_cloning[]`, `voice_generation[]` (mỗi item có `voice_id`, `voice_name`/`description`).
- **Voice cloning:**
  1. Upload file: `POST https://api.minimax.io/v1/files/upload?GroupId=<gid>` multipart (`purpose=voice_clone`, `file=<audio>`) → `file.file_id` (integer). Audio mp3/m4a/wav, 10s–5 phút, ≤20MB.
  2. Clone: `POST https://api.minimax.io/v1/voice_clone?GroupId=<gid>` body `{ file_id, voice_id (8–256 ký tự, bắt đầu bằng chữ, [A-Za-z0-9_-], không kết thúc bằng -/_), model?, accuracy?(0–1, def 0.7), need_noise_reduction?, text? (preview ≤1000, tính phí), language_boost? }` → `{ demo_audio?, base_resp }`.
  3. Ràng buộc: giọng clone bị xoá nếu **không dùng trong 7 ngày**.

---

## Data model — migration `supabase/migrations/17_minimax_provider.sql`

```sql
-- 1. Nới CHECK provider để nhận 'minimax'
alter table public.voice_presets   drop constraint if exists voice_presets_provider_check;
alter table public.voice_presets   add  constraint voice_presets_provider_check
  check (provider in ('vbee','elevenlabs','minimax'));
alter table public.generated_audios drop constraint if exists generated_audios_provider_check;
alter table public.generated_audios add  constraint generated_audios_provider_check
  check (provider in ('vbee','elevenlabs','minimax'));

-- 2. Cột JSONB cấu hình provider (dùng cho MiniMax; nullable, không đụng provider cũ)
alter table public.voice_presets add column if not exists provider_config jsonb;

-- 3. Bảng giọng clone MiniMax theo brand
create table public.minimax_cloned_voices (
  id                   uuid primary key default gen_random_uuid(),
  brand_id             uuid not null references public.brands(id) on delete cascade,
  voice_id             text not null,                    -- id do người dùng đặt, MiniMax dùng
  display_name         text not null,
  model                text not null default 'speech-2.6-hd',
  status               text not null default 'ready'
                         check (status in ('pending','ready','failed')),
  source_storage_path  text,                             -- audio gốc trong bucket
  preview_storage_path text,                             -- demo_audio đã lưu (nếu có)
  created_at           timestamptz not null default now(),
  unique (brand_id, voice_id)
);
alter table public.minimax_cloned_voices enable row level security;
-- RLS: owner của brand mới thao tác được (mirror các bảng video khác)
create policy minimax_cloned_voices_owner on public.minimax_cloned_voices
  using (exists (select 1 from public.brands b
                 where b.id = brand_id and b.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.brands b
                 where b.id = brand_id and b.owner_user_id = auth.uid()));
```

- Tái dùng cột sẵn có: `provider_voice_id` = MiniMax `voice_id`; `speed` = voice_setting.speed (cùng khoảng 0.5–2.0). **KHÔNG** tái dùng cột `pitch` (ngữ nghĩa Vbee là float 0.5–2.0, khác MiniMax int -12..12) — MiniMax `pitch` nằm trong `provider_config`. `provider_config` giữ phần còn lại.
- Cập nhật `src/types/database.types.ts` (regenerate hoặc sửa tay) cho 2 bảng.

### Shape `provider_config` (TypeScript union — `src/features/video/types.ts`)

```ts
export type MiniMaxModel =
  | "speech-2.6-hd" | "speech-2.6-turbo" | "speech-02-hd" | "speech-02-turbo";
export type MiniMaxEmotion =
  | "happy" | "sad" | "angry" | "fearful" | "disgusted"
  | "surprised" | "calm" | "fluent" | "whisper";
export type MiniMaxSoundEffect =
  | "spacious_echo" | "auditorium_echo" | "lofi_telephone" | "robotic";

export interface MiniMaxAudioSetting {
  format: "mp3";               // cố định mp3 để khớp storage/pipeline hiện tại
  sampleRate: number;          // 8000|16000|22050|24000|32000|44100 (def 32000)
  bitrate: number;             // 32000|64000|128000|256000 (def 128000)
  channel: 1 | 2;              // def 1
}
export interface MiniMaxVoiceModify {
  pitch?: number;              // -100..100
  intensity?: number;          // -100..100
  timbre?: number;             // -100..100
  soundEffects?: MiniMaxSoundEffect;
}
export interface MiniMaxProviderConfig {
  kind: "minimax";             // discriminator
  model: MiniMaxModel;
  emotion?: MiniMaxEmotion;
  vol?: number;                // (0,10] def 1
  pitch?: number;              // -12..12 int def 0 (không tái dùng cột pitch)
  languageBoost?: string;      // def "Vietnamese"
  audio: MiniMaxAudioSetting;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[]; // ["từ/cách đọc", ...]
}
export type ProviderConfig = MiniMaxProviderConfig; // union mở rộng sau
```

- Một hàm `parseProviderConfig(json: unknown): MiniMaxProviderConfig | null` (type guard, không `as`) để đọc an toàn từ DB. Giá trị lỗi/thiếu → fallback default.
- Pause markers `<#x#>` **không** lưu trong config — nằm trong `text` kịch bản.

---

## Service layer — `src/services/minimaxService.ts` (mới)

Class `MiniMaxService`, constructor `(apiKey: string, groupId: string)`, mirror `ElevenLabsService`. Base URL + GroupId query dựng trong class.

- `synthesize(input: MiniMaxTTSRequest): Promise<{ audio: ArrayBuffer; durationSecs: number }>`
  - POST `t2a_v2`, `stream:false`, `output_format:"hex"`.
  - Dựng `voice_setting` từ `voice_id/speed/vol/pitch/emotion`, `audio_setting` từ config.audio, `voice_modify`, `pronunciation_dict.tone` từ config.
  - `base_resp.status_code !== 0` → ném `ProviderError` (xem dưới).
  - Decode `data.audio` (hex) → `Buffer` → `ArrayBuffer`. `durationSecs = extra_info.audio_length / 1000`.
- `listVoices(): Promise<MiniMaxVoice[]>` — POST `get_voice` `{voice_type:"all"}`, gộp `system_voice` + `voice_cloning`, map → `{ voice_id, name, category: "system"|"cloned" }`.
- `uploadFile(buffer: ArrayBuffer, filename: string): Promise<number>` — multipart `files/upload`, `purpose:"voice_clone"` → trả `file.file_id`.
- `cloneVoice(input: { fileId: number; voiceId: string; model: MiniMaxModel; needNoiseReduction?: boolean; accuracy?: number; previewText?: string }): Promise<{ demoAudioUrl?: string }>` — POST `voice_clone`.

Types dịch vụ: `MiniMaxTTSRequest`, `MiniMaxVoiceItem` khai báo trong file service (mirror `elevenlabsService.ts`).

### Error handling — `src/services/providerError.ts` (mới, tối thiểu)

Tạo phần tối thiểu của spec pending Part B (vì MiniMax cần):

```ts
export type ProviderErrorKind =
  | "quota_exceeded" | "invalid_key" | "key_missing" | "rate_limited" | "unknown";
export class ProviderError extends Error {
  constructor(
    public readonly provider: ApiKeyProvider,
    public readonly kind: ProviderErrorKind,
    public readonly httpStatus: number,
    message?: string,
  ) { super(message ?? `${provider}_${kind}`); this.name = "ProviderError"; }
}
```

- Helper map `kind → httpStatus`: quota→402, invalid_key→401, key_missing→400, rate_limited→429, unknown→502.
- `handleApiError`/`user-context.ts`: thêm nhánh `if (e instanceof ProviderError)` → `{ error: "<provider>_<kind>" }` với status tương ứng. (Không refactor Vbee/ElevenLabs sang ProviderError lần này — chỉ MiniMax dùng; các provider cũ giữ nguyên.)
- Map `base_resp.status_code` MiniMax → kind: `1004`→invalid_key, `1002`/`1039`→rate_limited, `2038`→quota_exceeded, `1042`/`2013`/khác→unknown.

---

## API routes

| Route | Method | Chức năng |
|-------|--------|-----------|
| `src/app/api/video/audio/route.ts` | POST | Thêm nhánh `else if (provider === "minimax")` → `MiniMaxService.synthesize` → upload bucket `generated-audio` (flow y hệt hiện tại), tạo row `generated_audios` với `provider:'minimax'`. |
| `src/app/api/video/minimax/voices/route.ts` | GET | List giọng: system (từ `listVoices`) + cloned của brand (từ `minimax_cloned_voices`). Nhận `brandId` query. |
| `src/app/api/video/minimax/preview/route.ts` | POST | Synthesize đoạn ngắn, trả base64 data URI (`data:audio/mpeg;base64,...`) — mirror ElevenLabs preview. |
| `src/app/api/video/minimax/clone/route.ts` | POST | Multipart: nhận audio + brandId + displayName + voiceId + model → `uploadFile`→`cloneVoice`; lưu audio gốc + demo vào storage; insert `minimax_cloned_voices`. |

- Key: `getUserApiKey(userId, "minimax")` cho API key; GroupId đọc `process.env.MINIMAX_GROUP_ID` (thiếu → ProviderError key_missing).
- Validate ở clone route: định dạng/kích thước/độ dài audio, quy tắc `voice_id`.

---

## UI

### Voice Lab — `src/app/app/video/voice-config/page.tsx`
- `ActiveTab` thêm `"minimax"`; nút tab thứ 3; panel MiniMax riêng:
  - **Model:** radio nhóm (HD/Turbo × 2.6/02). Default `speech-2.6-hd`.
  - **Voice:** dropdown từ `useMiniMaxVoices(brandId)`, tách nhóm *System* / *Đã clone*.
  - **Sliders:** speed (0.5–2.0), vol (0–10), pitch (-12..12).
  - **Select:** emotion, language_boost (default `Vietnamese`).
  - **Audio:** select format(mp3)/bitrate/sample_rate.
  - **Nâng cao (collapse):** voice_modify (timbre/intensity/pitch sliders + sound_effects select); pronunciation_dict (danh sách cặp `từ → cách đọc`); ghi chú cú pháp pause `<#1.5#>`.
  - Nút **Preview** (gọi `useMiniMaxPreview`).
- **Khu Clone giọng:** upload audio (validate 10s–5ph, ≤20MB, mp3/m4a/wav), nhập display_name + voice_id + model → `useCloneMiniMaxVoice`; hiển thị danh sách giọng đã clone + trạng thái.
- Lưu preset: `provider:'minimax'`, `provider_voice_id`, `speed`, `pitch`, `provider_config` (JSON còn lại).

### ScriptEditor — `src/features/video/components/ScriptEditor.tsx`
- Thêm `"minimax"` vào toggle provider.

### Hooks — `src/hooks/api/useVoicePresets.ts`
- `useMiniMaxVoices(brandId)`, `useMiniMaxPreview()`, `useCloneMiniMaxVoice()`.

Client Components: các panel/hook trên cần `"use client"` (có state, event handler, upload) — kèm comment lý do theo CLAUDE.md.

---

## Types & wiring (điểm chạm)

1. `src/services/scriptPrompt.ts` — `TtsProvider` thêm `"minimax"`; thêm `MiniMaxModel`/`MiniMaxEmotion`; nhánh trong `providerFormattingInstructions()` (hướng dẫn dùng pause `<#x#>` nếu cần).
2. `src/lib/key-provider.ts` — `ApiKeyProvider` + `PROVIDER_ENV_MAP` thêm `minimax: "MINIMAX_API_KEY"`.
3. `src/features/video/types.ts` — `MiniMaxVoice`, `MiniMaxProviderConfig` (+ sub-types), mở rộng `VoicePreset.provider_config`, `CreateVoicePresetInput`, `MiniMaxClonedVoice`.
4. `src/services/voicePresetService.ts` / `generatedAudioService.ts` — map cột `provider_config`.
5. `src/services/minimaxClonedVoiceService.ts` (mới) — CRUD bảng `minimax_cloned_voices`.
6. `src/types/database.types.ts` — thêm 2 bảng/cột.
7. `.env.example`, `.env.local.template` — thêm `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID`.

---

## Testing

- **Unit**
  - `minimaxService`: hex-decode ra đúng bytes; build request body đúng từ config (voice_setting/audio_setting/voice_modify/pronunciation_dict); `base_resp.status_code` → đúng `ProviderErrorKind`; duration = audio_length/1000.
  - `parseProviderConfig`: JSON hợp lệ → object; thiếu/sai → null/fallback.
- **Route**
  - audio route: mock synthesize OK → upload + insert row `provider:'minimax'`; mock `1004` → response `minimax_invalid_key` (401).
  - clone route: happy-path → insert `minimax_cloned_voices`; audio quá ngắn/quá lớn → 400.
  - voices route: gộp system + cloned đúng.

## Migration/rollout notes

- Đặt `MINIMAX_API_KEY` + `MINIMAX_GROUP_ID` trong env trước deploy.
- Migration 17 idempotent (drop constraint if exists). Không đụng dữ liệu Vbee/ElevenLabs.
- Nhắc vận hành: giọng clone bị xoá nếu không dùng trong 7 ngày (T2A định kỳ hoặc thông báo trên UI — ghi chú, không tự động hoá lần này).

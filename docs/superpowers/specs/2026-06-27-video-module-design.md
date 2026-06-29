# Video Module Design Spec

Date: 2026-06-27

## Overview

Restructure the app sidebar into 3 collapsible modules (Image, Video, Setup) and build a new
Video module implementing a 5-stage TikTok creative pipeline: Data Acquisition → Human Review →
Transcription → Script Adaptation → Voice Generation.

Implementation follows Option B (phased): DB schema + sidebar first, then stages 2→3+4→1→5.

---

## Section 1: Sidebar Restructure

Replace the flat `NAV_ITEMS` array in `DashboardLayout.tsx` with a `NAV_SECTIONS` structure of
3 collapsible groups. Expand/collapse state stored in `localStorage`.

### New sidebar structure

```
▼ IMAGE                          (default: open)
    ✦ Create Ads        /app
    ◎ Stealth Ads       /app/stealth-ads
    ▦ Library           /app/library

▼ VIDEO                          (default: open)
    ▤ Competitor Videos /app/video
    ♪ Audio Library     /app/video/audio
    🎙 Voice Config      /app/video/voice-config

▼ SETUP                          (default: closed)
    ◈ Brands            /app/brands
    ✦ Concepts          /app/concepts
    ⚙ Settings          /app/settings

── ACCOUNT (always visible, not collapsible)
    📖 Guide            /app/guide
    🛡 Admin            /app/admin  (admin only)

── Brand Selector (unchanged, bottom of sidebar)
```

### Technical changes in `DashboardLayout.tsx`

- Extract `SidebarSection` component with collapsible toggle and `localStorage` persistence
- `NAV_SECTIONS` replaces `NAV_ITEMS`: each section has `{ key, label, defaultOpen, items[] }`
- `activePath` prop unchanged — used to highlight the correct item across all sections

---

## Section 2: Database Schema

### Existing tables (recreate on new Supabase project)

Consolidate all migrations from `supabase/byok-pivot/` and `supabase/adlance-snapshot/` into
ordered files under `supabase/migrations/`:

```
01_base.sql          — profiles, set_updated_at trigger
02_brands.sql        — brands, brand_kits, brand_products, persona_profiles,
                       brand_research_summaries, saved_ads, stealth_scenes
03_concepts.sql      — concept_prompts, user_concepts
04_user_tables.sql   — user_api_keys, kie_task_results
05_rls.sql           — all RLS policies
06_storage.sql       — storage bucket RLS
07_trigger.sql       — handle_new_user trigger
```

### New tables for Video module

All new tables scope to `brand_id` and use the same RLS pattern:
`EXISTS (SELECT 1 FROM brands WHERE id = brand_id AND owner_user_id = auth.uid())`

```sql
-- Stage 1-2: TikTok competitor videos (per-brand)
CREATE TABLE public.competitor_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  tiktok_url      TEXT NOT NULL,
  video_id        TEXT,
  views           BIGINT,
  likes           BIGINT,
  shares          BIGINT,
  comments        BIGINT,
  author_handle   TEXT,
  cover_url       TEXT,
  scraped_at      TIMESTAMPTZ,
  apify_run_id    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','winner','rejected')),
  scrape_status   TEXT NOT NULL DEFAULT 'success'
                  CHECK (scrape_status IN ('success','failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, tiktok_url)
);
CREATE INDEX competitor_videos_brand_idx ON public.competitor_videos(brand_id, status);

-- Stage 3: Transcripts (1-to-1 with winner video)
CREATE TABLE public.transcripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        UUID NOT NULL UNIQUE REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
  whisper_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (whisper_status IN ('pending','processing','done','failed')),
  raw_text        TEXT,
  edited_text     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stage 4: Brand scripts (1 transcript → many variants)
CREATE TABLE public.brand_scripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id   UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  prompt_config   JSONB NOT NULL DEFAULT '{}',
  raw_text        TEXT,
  final_text      TEXT,
  llm_model       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX brand_scripts_transcript_idx ON public.brand_scripts(transcript_id);
CREATE INDEX brand_scripts_brand_idx ON public.brand_scripts(brand_id);

-- Voice presets (per-brand, for quick selection at Stage 5)
-- Must be created before generated_audios due to FK dependency
CREATE TABLE public.voice_presets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  voice_code      TEXT NOT NULL,
  speed           NUMERIC NOT NULL DEFAULT 1.0,
  pitch           NUMERIC NOT NULL DEFAULT 1.0,
  pause_config    JSONB,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_presets_brand_idx ON public.voice_presets(brand_id);

-- Voice ratings (evaluation history per brand per voice)
CREATE TABLE public.voice_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  vbee_voice_code TEXT NOT NULL,
  score           SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  note            TEXT,
  rated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_ratings_brand_voice_idx ON public.voice_ratings(brand_id, vbee_voice_code);

-- Stage 5: Generated audio files (after voice_presets due to FK)
CREATE TABLE public.generated_audios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id       UUID NOT NULL REFERENCES public.brand_scripts(id) ON DELETE CASCADE,
  brand_id        UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  voice_preset_id UUID REFERENCES public.voice_presets(id) ON DELETE SET NULL,
  storage_path    TEXT,
  vbee_audio_url  TEXT,
  duration_secs   NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX generated_audios_script_idx ON public.generated_audios(script_id);
CREATE INDEX generated_audios_brand_idx  ON public.generated_audios(brand_id);
```

---

## Section 3: Video Module — Routes & Components

### Routes

| Path                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `/app/video`              | Stage 2: Competitor video list + review  |
| `/app/video/[id]`         | Stage 2–5: Pipeline detail for one video |
| `/app/video/audio`        | Audio library (all generated audios)     |
| `/app/video/voice-config` | Voice Lab: test, rate, manage presets    |

### Page: `/app/video` — Competitor Videos List

Two-column layout: filter bar (left) + video grid/table (right).

**Filter bar:** status tabs `[All | Pending | Winner | Rejected]` + search by URL/author handle

- `[+ Add URL manually]` button.

**Video card:**

```
[thumbnail] @handle · 1.2M views · 45K likes · 12/06/2026   [badge: Pending]
[▶ Preview] [✓ Winner] [✗ Reject]
```

- **Preview**: toggleable inline card. Try TikTok official embed
  (`tiktok.com/embed/v2/{videoId}`). If blocked (TikTok Shop), lazy-fetch tikwm.com CDN URL
  via `GET /api/video/competitors/[id]/fetch-cdn`. Render `<video src={cdnUrl}>`. Show
  "Open TikTok" button as fallback.
- **Winner** click → mark status, auto-create transcript record + trigger Whisper background job.
- **Reject** click → mark status, hide from default view.
- **Add URL manually** → modal: enter TikTok URL → validate → insert with `status: pending`,
  `scrape_status: success`, metrics empty.

### Page: `/app/video/[id]` — Pipeline Detail

Single-column vertical layout with 4 clearly delimited stages:

```
[Video Player — embed or CDN]
Video metadata: @handle · views · likes · date

──── STAGE 3: Transcript ──────────────────────────────────
  Status badge: [Pending | Processing... | Done | Failed]
  [Editable textarea — raw_text / edited_text]
  [Save] [Re-transcribe]

──── STAGE 4: Script Adaptation ───────────────────────────
  Product: [dropdown — brand_products]
  Tone: [Hài hước | Chân thực | Kịch tính]
  Notes: [textarea — USP, hashtags, promotions]
  [Generate Script ✦]  (SSE streaming into textarea)
  [Editable textarea — final_text]
  [Save final script]

──── STAGE 5: Voice Generation ────────────────────────────
  Voice preset: [dropdown — voice_presets for brand]
  [Generate Audio ♪]

  Generated audios list:
  [▶] Lan Nhi · 1.1x · 00:42   [⬇ Download] [🗑]
```

### Page: `/app/video/audio` — Audio Library

Table: Script excerpt | Voice | Duration | Created | Download | Delete

### Page: `/app/video/voice-config` — Voice Lab

Two-panel horizontal layout:

**Left panel — Voice Browser:**

- Filters: gender `[All | Nữ | Nam]`, region `[Bắc | Trung | Nam]`
- Sort: `[Viral Score ▼ | Name]`
- Voice list fetched from `GET /api/video/vbee/voices`
- Each row: voice name + avg viral score stars + `[▶ Quick test]` + `[+ Thêm preset]`

**Right panel — Voice Lab:**

- Voice selector dropdown
- Test text textarea (pre-filled with sample Vietnamese marketing copy)
- Speed slider (0.5–2.0x), Pitch slider (0.5–2.0), Pause style dropdown
- `[▶ Generate Preview]` → inline audio player
- After listening: star rating 1–5 (viral potential) + optional note
- `[💾 Lưu thành preset]` → saves to `voice_presets` with current config

### Feature folder structure

```
src/features/video/
  types.ts
  components/
    CompetitorVideoCard.tsx
    VideoPlayer.tsx             — embed + CDN fallback logic
    TranscriptEditor.tsx
    ScriptEditor.tsx            — SSE streaming + editable
    AudioPlayer.tsx
    VoicePresetForm.tsx
    VoiceRatingStars.tsx
```

---

## Section 4: API Routes & Data Flow

### Stage 1 — Apify webhook ingestion

```
POST /api/apify/webhook?brandId={uuid}&datasetId={apifyDatasetId}
```

- Apify calls this endpoint when a scheduled run completes.
- Endpoint fetches dataset items from Apify API using `datasetId`.
- Upserts rows into `competitor_videos` (unique on `brand_id + tiktok_url`).
- Returns 200 immediately (Apify webhooks timeout after 30s).
- If `brandId` not found: log warning, return 200 (prevent infinite Apify retries).
- If Apify dataset fetch fails: return 500 to allow Apify to retry.

**Setup requirement:** Each Apify Actor for a brand must have its webhook URL configured as
`/api/apify/webhook?brandId={brand_uuid}&datasetId={{datasetId}}` (one-time manual setup per brand).

**Fallback C (manual sync):**

```
POST /api/video/sync-apify
Body: { brandId, apifyDatasetId }
```

Dashboard button "Sync từ Apify" — fetches latest run dataset manually.

### Stage 2 — Video CDN fallback

```
GET /api/video/competitors/[id]/fetch-cdn
```

- Calls tikwm.com API with stored `tiktok_url`.
- Returns `{ cdnUrl: string | null }`. Never stored in DB (CDN links expire).
- On tikwm error/rate-limit: returns `{ cdnUrl: null }` → client shows "Open TikTok" fallback.

### Stage 3 — Transcription

```
POST /api/video/transcripts
Body: { videoId }
→ Creates transcript record (status: pending), returns { transcriptId }

POST /api/video/transcripts/[id]/run
→ 1. Fetch tikwm.com for video's audio-only `music` URL
   2. Stream audio bytes → send to OpenAI Whisper API (avoids ffmpeg dependency;
      tikwm `music` URL is audio-only, stays well under 25MB limit)
   3. Save raw_text, set status: done

PATCH /api/video/transcripts/[id]
Body: { editedText }
→ Save edited_text
```

Client polls `GET /api/video/transcripts/[id]` every 3s until `status = done | failed`.

### Stage 4 — Script adaptation

```
POST /api/video/scripts
Body: { transcriptId, brandId, productId, promptConfig: { tone, notes } }
→ Builds system prompt from promptConfig + product context
→ Streams LLM response (Claude Sonnet 4.6) via SSE — same pattern as /api/generate-ads
→ Saves raw_text to brand_scripts on completion

PATCH /api/video/scripts/[id]
Body: { finalText }
→ Save final_text
```

### Stage 5 — Voice generation

```
POST /api/video/audio
Body: { scriptId, voicePresetId }
→ Fetch final_text from brand_scripts
→ Fetch voice config from voice_presets
→ Call Vbee TTS API with text + voice config
→ Receive audio URL from Vbee
→ Upload audio to Supabase Storage: audio/{brandId}/{scriptId}/{timestamp}.mp3
→ Insert into generated_audios

GET  /api/video/audio?brandId={uuid}    — list audios
DELETE /api/video/audio/[id]            — delete audio + Storage file
```

### Voice Lab

```
GET  /api/video/vbee/voices             — proxy Vbee voice catalog endpoint
POST /api/video/vbee/preview            — generate test audio (not saved to DB/Storage)
     Body: { voice_code, text, speed, pitch, pause_config }
     Returns: { audioUrl }  — temporary Vbee-hosted URL

POST /api/video/voice-ratings           — save rating { brandId, voiceCode, score, note }
GET  /api/video/voice-ratings?brandId=  — avg scores grouped by voice_code

GET/POST         /api/video/voice-presets
GET/PATCH/DELETE /api/video/voice-presets/[id]
```

---

## Section 5: Error Handling

### Apify webhook

- Unknown `brandId` → log, return 200 (no retry)
- Apify dataset fetch fails → return 500 (Apify retries)
- Duplicate `tiktok_url` per brand → upsert silently (no error)

### tikwm.com CDN

- Error or rate-limit → `{ cdnUrl: null }`, client shows "Open TikTok" button
- Never cache CDN URL in DB — always fresh-fetch on Preview

### Transcription

- Audio >25MB → rare with tikwm `music` URL; show error, offer Retry
- Whisper API fails → set `whisper_status: failed`, show "Retry transcription" button
- Client polls every 3s; stops after `done | failed`

### Script generation

- LLM SSE stream error mid-response → show partial text + "Retry" button; do not save partial `raw_text`
- LLM timeout → surface error message, no DB write

### Voice generation

- Vbee API error → surface Vbee error message, do not insert `generated_audios` row
- Supabase Storage upload fails → delete `generated_audios` row (compensating action)

### General

- All API routes return `{ error: string }` with appropriate HTTP status
- Internal errors logged server-side only — no stack traces to client

---

## Implementation Phases (Option B)

| Phase | Scope                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- |
| **1** | Supabase migration files (existing + new tables) + sidebar restructure                            |
| **2** | Stage 2: `/app/video` list + video player + Winner/Reject actions + manual URL add                |
| **3** | Stage 3+4: Transcription + Script adaptation pipeline on `/app/video/[id]`                        |
| **4** | Stage 1: Apify webhook `POST /api/apify/webhook` + fallback manual sync                           |
| **5** | Stage 5: Vbee voice generation + `/app/video/audio` library + `/app/video/voice-config` Voice Lab |

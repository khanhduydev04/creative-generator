# Phase 5: Voice Generation + Audio Library + Voice Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 5 (Vbee TTS voice generation), the Audio Library at `/app/video/audio`, and the Voice Lab at `/app/video/voice-config`. Vbee API key is added to the BYOK system. Generated MP3s are downloaded from Vbee and re-uploaded to Supabase Storage.

**Architecture:** `VoicePresetService` and `GeneratedAudioService` handle Supabase CRUD. `VbeeService` wraps the Vbee TTS API. Proxy routes prevent the client from seeing user API keys. Audio is stored in a new `generated-audio` Supabase Storage bucket. Voice Lab preview audio uses Vbee's CDN URL directly (never stored). Stage 5 section is added to the existing `/app/video/[id]` page.

**Tech Stack:** Next.js App Router, Supabase, Supabase Storage, TanStack Query, Tailwind CSS, TypeScript, lucide-react

**Note on Vbee API:** This plan uses a reasonable proxy structure for the Vbee TTS API based on common Vietnamese TTS patterns. Verify exact endpoint paths, request body field names, and response shape from [Vbee official API docs](https://vbee.vn) before implementing Tasks 5–6. The proxy routes (`/api/video/vbee/*`) are designed to be easily updated.

---

## File Map

**Create:**
- `src/services/vbeeService.ts` — Vbee API wrapper (voices, TTS generation)
- `src/services/voicePresetService.ts` — Supabase CRUD for `voice_presets`
- `src/services/generatedAudioService.ts` — Supabase CRUD for `generated_audios`
- `src/app/api/video/vbee/voices/route.ts` — proxy Vbee voice catalog
- `src/app/api/video/vbee/preview/route.ts` — proxy Vbee TTS preview (not saved)
- `src/app/api/video/voice-presets/route.ts` — GET + POST voice presets
- `src/app/api/video/voice-presets/[id]/route.ts` — PATCH + DELETE voice preset
- `src/app/api/video/voice-ratings/route.ts` — GET (avg) + POST rating
- `src/app/api/video/audio/route.ts` — POST generate + GET list
- `src/app/api/video/audio/[id]/route.ts` — DELETE audio
- `src/hooks/api/useVoicePresets.ts` — TanStack Query hooks
- `src/hooks/api/useGeneratedAudios.ts` — TanStack Query hooks
- `src/features/video/components/AudioPlayer.tsx`
- `src/features/video/components/VoiceRatingStars.tsx`
- `src/features/video/components/VoicePresetForm.tsx`
- `src/features/video/components/VoiceGenerationPanel.tsx` — Stage 5 in [id] page

**Modify:**
- `src/lib/key-provider.ts` — add `vbee` to `ApiKeyProvider`
- `src/lib/validators/api-key.ts` — add Vbee key validation + update `isValidProvider`
- `src/components/settings/UserApiKeysCard.tsx` — add Vbee to PROVIDERS list
- `src/services/storageService.ts` — add `generated-audio` to `StorageBucket`
- `src/lib/query/keys.ts` — add voice presets, voice ratings, generated audios keys
- `src/lib/i18n/vi.ts` — add Stage 5 + Voice Lab strings to `video.*`
- `src/lib/i18n/en.ts` — same keys in English
- `src/app/app/video/[id]/page.tsx` — replace Stage 5 placeholder with `VoiceGenerationPanel`
- `src/app/app/video/audio/page.tsx` — replace placeholder with full audio library
- `src/app/app/video/voice-config/page.tsx` — replace placeholder with voice lab

---

## Task 1: Add Vbee Key Provider

**Files:**
- Modify: `src/lib/key-provider.ts`
- Modify: `src/lib/validators/api-key.ts`
- Modify: `src/components/settings/UserApiKeysCard.tsx`

- [ ] **Step 1: Add `vbee` to `ApiKeyProvider` in key-provider.ts**

Find:
```typescript
export type ApiKeyProvider = "anthropic" | "google" | "kie" | "openai";
```

Replace with:
```typescript
export type ApiKeyProvider = "anthropic" | "google" | "kie" | "openai" | "vbee";
```

- [ ] **Step 2: Add Vbee key validation in validators/api-key.ts**

Find:
```typescript
const PROVIDER_PREFIXES: Record<ApiKeyProvider, RegExp> = {
  anthropic: /^sk-ant-[A-Za-z0-9_-]{8,}$/,
  google: /^AIza[A-Za-z0-9_-]{8,}$/,
  kie: /^[A-Za-z0-9_-]{8,}$/,
  openai: /^sk-[A-Za-z0-9_-]{8,}$/,
};
```

Replace with:
```typescript
const PROVIDER_PREFIXES: Record<ApiKeyProvider, RegExp> = {
  anthropic: /^sk-ant-[A-Za-z0-9_-]{8,}$/,
  google: /^AIza[A-Za-z0-9_-]{8,}$/,
  kie: /^[A-Za-z0-9_-]{8,}$/,
  openai: /^sk-[A-Za-z0-9_-]{8,}$/,
  vbee: /^[A-Za-z0-9_-]{8,}$/,
};
```

Find:
```typescript
export function isValidProvider(p: string): p is ApiKeyProvider {
  return ["anthropic", "google", "kie", "openai"].includes(p);
}
```

Replace with:
```typescript
export function isValidProvider(p: string): p is ApiKeyProvider {
  return ["anthropic", "google", "kie", "openai", "vbee"].includes(p);
}
```

- [ ] **Step 3: Add Vbee to `PROVIDERS` list in `UserApiKeysCard.tsx`**

Find:
```typescript
type Provider = "anthropic" | "google" | "kie" | "openai";
```

Replace with:
```typescript
type Provider = "anthropic" | "google" | "kie" | "openai" | "vbee";
```

Find the PROVIDERS array and add:
```typescript
  { id: "vbee", label: "Vbee TTS", helpUrl: "https://vbee.vn" },
```

Find the `useState` for drafts and add `vbee: ""`:
```typescript
const [drafts, setDrafts] = useState<Record<Provider, string>>({ anthropic: "", google: "", kie: "", openai: "", vbee: "" });
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 2: Add `generated-audio` Storage Bucket

**Files:**
- Modify: `src/services/storageService.ts`

- [ ] **Step 1: Add `generated-audio` bucket type**

Find:
```typescript
export type StorageBucket = 'brand-assets' | 'campaign-inputs' | 'generated-ads'
```

Replace with:
```typescript
export type StorageBucket = 'brand-assets' | 'campaign-inputs' | 'generated-ads' | 'generated-audio'
```

- [ ] **Step 2: Create the bucket in Supabase**

Run in Supabase SQL Editor:
```sql
-- Create the generated-audio bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-audio', 'generated-audio', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: allow authenticated users to upload to their own brand folder
CREATE POLICY "auth users upload audio" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'generated-audio');

CREATE POLICY "public read audio" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'generated-audio');

CREATE POLICY "auth users delete own audio" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'generated-audio');
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 3: Types + i18n + Query Keys

**Files:**
- Modify: `src/features/video/types.ts`
- Modify: `src/lib/query/keys.ts`
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

- [ ] **Step 1: Add voice + audio types to `types.ts`**

Append to `src/features/video/types.ts`:
```typescript
export interface VoicePreset {
  id: string;
  brand_id: string;
  display_name: string;
  voice_code: string;
  speed: number;
  pitch: number;
  pause_config: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
}

export interface VoiceRating {
  id: string;
  brand_id: string;
  vbee_voice_code: string;
  score: number;
  note: string | null;
  rated_at: string;
}

export interface GeneratedAudio {
  id: string;
  script_id: string;
  brand_id: string;
  voice_preset_id: string | null;
  storage_path: string | null;
  vbee_audio_url: string | null;
  duration_secs: number | null;
  created_at: string;
  // Joined
  voice_preset?: Pick<VoicePreset, "display_name" | "voice_code" | "speed"> | null;
  brand_script?: Pick<BrandScript, "final_text" | "raw_text"> | null;
}

export interface VbeeVoice {
  voice_code: string;
  name: string;
  gender: "male" | "female";
  region: "north" | "central" | "south";
  sample_url?: string;
}

export interface VoiceAvgRating {
  vbee_voice_code: string;
  avg_score: number;
  count: number;
}

export interface GenerateAudioRequest {
  scriptId: string;
  voicePresetId: string;
}

export interface GenerateAudioResponse {
  audio: GeneratedAudio;
}
```

- [ ] **Step 2: Add query keys**

In `src/lib/query/keys.ts`, add after `scripts`:
```typescript
  voicePresets: {
    list: (brandId: string) => ["voice-presets", brandId] as const,
  },
  voiceRatings: {
    avg: (brandId: string) => ["voice-ratings", brandId] as const,
  },
  generatedAudios: {
    list: (brandId: string) => ["generated-audios", brandId] as const,
    byScript: (scriptId: string) => ["generated-audios", "script", scriptId] as const,
  },
  vbeeVoices: {
    all: ["vbee-voices"] as const,
  },
```

- [ ] **Step 3: Add Stage 5 + Voice Lab i18n to `vi.ts`**

In `src/lib/i18n/vi.ts`, inside the `video: { ... }` block, add:
```typescript
    // Stage 5 - Voice Generation
    voicePreset: "Voice Preset",
    noVoicePreset: "Chưa có preset. Tạo trong Voice Lab.",
    selectVoicePreset: "Chọn voice preset...",
    generateAudio: "Tạo giọng đọc ♪",
    generatingAudio: "Đang tạo...",
    audioGenerated: "Đã tạo audio",
    audioFailed: "Tạo audio thất bại",
    downloadAudio: "Tải xuống",
    deleteAudio: "Xóa",
    noScriptSaved: "Lưu kịch bản trước khi tạo giọng đọc.",
    // Audio Library
    audioLibraryTitle: "Thư Viện Audio",
    audioTableScript: "Đoạn kịch bản",
    audioTableVoice: "Giọng đọc",
    audioTableDuration: "Thời lượng",
    audioTableCreated: "Ngày tạo",
    noAudiosYet: "Chưa có audio nào.",
    // Voice Lab
    voiceLabTitle: "Voice Lab",
    voiceBrowserTitle: "Thư Viện Giọng",
    voiceLabPanelTitle: "Thử Giọng",
    filterGenderAll: "Tất cả",
    filterGenderFemale: "Nữ",
    filterGenderMale: "Nam",
    filterRegionAll: "Tất cả",
    filterRegionNorth: "Bắc",
    filterRegionCentral: "Trung",
    filterRegionSouth: "Nam",
    sortByViralScore: "Điểm viral ▼",
    sortByName: "Tên A-Z",
    quickTest: "Test nhanh",
    addPreset: "+ Thêm preset",
    viralScore: "Viral Score",
    testText: "Văn bản thử",
    testTextPlaceholder: "Nhập đoạn văn bản tiếng Việt để thử giọng...",
    speed: "Tốc độ",
    pitch: "Cao độ",
    pauseStyle: "Kiểu ngừng",
    pauseNormal: "Bình thường",
    pauseLong: "Dài",
    pauseShort: "Ngắn",
    generatePreview: "▶ Nghe thử",
    generatingPreview: "Đang tạo...",
    rateVoice: "Đánh giá viral potential (1-5 sao)",
    noteOptional: "Ghi chú (tuỳ chọn)",
    notePlaceholder: "vd. Giọng mượt, phù hợp sản phẩm làm đẹp...",
    savePreset: "💾 Lưu thành preset",
    presetSaved: "Đã lưu preset",
    presetDisplayName: "Tên preset",
    presetDisplayNamePlaceholder: "vd. Lan Nhi - 1.1x",
    loadingVoices: "Đang tải danh sách giọng...",
    noVoicesFound: "Không tìm thấy giọng nào.",
```

- [ ] **Step 4: Add same keys to `en.ts`**

In `src/lib/i18n/en.ts`, inside the `video: { ... }` block, add:
```typescript
    // Stage 5 - Voice Generation
    voicePreset: "Voice Preset",
    noVoicePreset: "No presets yet. Create one in Voice Lab.",
    selectVoicePreset: "Select voice preset...",
    generateAudio: "Generate Voice ♪",
    generatingAudio: "Generating...",
    audioGenerated: "Audio generated",
    audioFailed: "Audio generation failed",
    downloadAudio: "Download",
    deleteAudio: "Delete",
    noScriptSaved: "Save a script first to generate voice.",
    // Audio Library
    audioLibraryTitle: "Audio Library",
    audioTableScript: "Script excerpt",
    audioTableVoice: "Voice",
    audioTableDuration: "Duration",
    audioTableCreated: "Created",
    noAudiosYet: "No audio yet.",
    // Voice Lab
    voiceLabTitle: "Voice Lab",
    voiceBrowserTitle: "Voice Browser",
    voiceLabPanelTitle: "Test Voice",
    filterGenderAll: "All",
    filterGenderFemale: "Female",
    filterGenderMale: "Male",
    filterRegionAll: "All",
    filterRegionNorth: "North",
    filterRegionCentral: "Central",
    filterRegionSouth: "South",
    sortByViralScore: "Viral Score ▼",
    sortByName: "Name A-Z",
    quickTest: "Quick test",
    addPreset: "+ Add preset",
    viralScore: "Viral Score",
    testText: "Test text",
    testTextPlaceholder: "Enter Vietnamese text to test the voice...",
    speed: "Speed",
    pitch: "Pitch",
    pauseStyle: "Pause style",
    pauseNormal: "Normal",
    pauseLong: "Long",
    pauseShort: "Short",
    generatePreview: "▶ Preview",
    generatingPreview: "Generating...",
    rateVoice: "Rate viral potential (1-5 stars)",
    noteOptional: "Note (optional)",
    notePlaceholder: "e.g. Smooth voice, great for beauty products...",
    savePreset: "💾 Save as preset",
    presetSaved: "Preset saved",
    presetDisplayName: "Preset name",
    presetDisplayNamePlaceholder: "e.g. Lan Nhi - 1.1x",
    loadingVoices: "Loading voices...",
    noVoicesFound: "No voices found.",
```

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: VbeeService

**Files:**
- Create: `src/services/vbeeService.ts`

**Vbee API assumption:** Vbee exposes a REST API. Check actual docs and adjust `VBEE_API_BASE`, request body fields, and response shape if they differ.

- [ ] **Step 1: Create the service**

```typescript
import type { VbeeVoice } from "@/features/video/types";

const VBEE_API_BASE = "https://vbee.vn/api/v1";

export interface VbeeTTSRequest {
  text: string;
  voice_code: string;
  speed?: number;
  pitch?: number;
  output_format?: string;
}

export interface VbeeTTSResponse {
  audio_url: string;
  duration?: number;
}

export class VbeeService {
  constructor(private readonly apiKey: string) {}

  async listVoices(): Promise<VbeeVoice[]> {
    const res = await fetch(`${VBEE_API_BASE}/voices`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Vbee voices failed: ${res.status}`);
    const data = await res.json() as { voices?: VbeeVoice[]; data?: VbeeVoice[] };
    return data.voices ?? data.data ?? [];
  }

  async synthesize(request: VbeeTTSRequest): Promise<VbeeTTSResponse> {
    const res = await fetch(`${VBEE_API_BASE}/tts/convert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: request.text,
        voice_code: request.voice_code,
        speed: request.speed ?? 1.0,
        pitch: request.pitch ?? 1.0,
        output_format: request.output_format ?? "mp3",
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? `Vbee TTS failed: ${res.status}`);
    }

    const data = await res.json() as VbeeTTSResponse;
    if (!data.audio_url) throw new Error("Vbee returned no audio_url");
    return data;
  }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: VoicePresetService + GeneratedAudioService

**Files:**
- Create: `src/services/voicePresetService.ts`
- Create: `src/services/generatedAudioService.ts`

- [ ] **Step 1: Create `voicePresetService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VoicePreset } from "@/features/video/types";

export interface CreateVoicePresetInput {
  brandId: string;
  displayName: string;
  voiceCode: string;
  speed: number;
  pitch: number;
  pauseConfig?: Record<string, unknown> | null;
  isDefault?: boolean;
}

export class VoicePresetService {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(brandId: string): Promise<VoicePreset[]> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as VoicePreset[];
  }

  async create(input: CreateVoicePresetInput): Promise<VoicePreset> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .insert({
        brand_id: input.brandId,
        display_name: input.displayName,
        voice_code: input.voiceCode,
        speed: input.speed,
        pitch: input.pitch,
        pause_config: input.pauseConfig ?? null,
        is_default: input.isDefault ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as VoicePreset;
  }

  async update(
    id: string,
    updates: Partial<Pick<VoicePreset, "display_name" | "speed" | "pitch" | "pause_config" | "is_default">>,
  ): Promise<VoicePreset> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as VoicePreset;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("voice_presets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 2: Create `generatedAudioService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedAudio } from "@/features/video/types";

export class GeneratedAudioService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByBrand(brandId: string): Promise<GeneratedAudio[]> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .select("*, voice_preset:voice_presets(display_name, voice_code, speed), brand_script:brand_scripts(final_text, raw_text)")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as GeneratedAudio[];
  }

  async listByScript(scriptId: string): Promise<GeneratedAudio[]> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .select("*, voice_preset:voice_presets(display_name, voice_code, speed)")
      .eq("script_id", scriptId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as GeneratedAudio[];
  }

  async create(input: {
    scriptId: string;
    brandId: string;
    voicePresetId: string;
    storagePath: string;
    vbeeAudioUrl: string;
    durationSecs: number | null;
  }): Promise<GeneratedAudio> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .insert({
        script_id: input.scriptId,
        brand_id: input.brandId,
        voice_preset_id: input.voicePresetId,
        storage_path: input.storagePath,
        vbee_audio_url: input.vbeeAudioUrl,
        duration_secs: input.durationSecs,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as GeneratedAudio;
  }

  async delete(id: string): Promise<{ storagePath: string | null }> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .delete()
      .eq("id", id)
      .select("storage_path")
      .single();

    if (error) throw new Error(error.message);
    return { storagePath: (data as { storage_path: string | null }).storage_path };
  }
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 6: Vbee Proxy Routes

**Files:**
- Create: `src/app/api/video/vbee/voices/route.ts`
- Create: `src/app/api/video/vbee/preview/route.ts`

- [ ] **Step 1: Create `GET /api/video/vbee/voices`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { VbeeService } from "@/services/vbeeService";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const apiKey = await getUserApiKey(userId, "vbee");
    const service = new VbeeService(apiKey);
    const voices = await service.listVoices();
    return NextResponse.json({ voices });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2: Create `POST /api/video/vbee/preview`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { VbeeService } from "@/services/vbeeService";

interface PreviewRequest {
  voice_code: string;
  text: string;
  speed?: number;
  pitch?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as PreviewRequest;

    if (!body.voice_code || !body.text?.trim()) {
      return NextResponse.json({ error: "voice_code and text are required" }, { status: 400 });
    }

    if (body.text.length > 500) {
      return NextResponse.json({ error: "text too long (max 500 chars)" }, { status: 400 });
    }

    const apiKey = await getUserApiKey(userId, "vbee");
    const service = new VbeeService(apiKey);
    const result = await service.synthesize({
      text: body.text,
      voice_code: body.voice_code,
      speed: body.speed,
      pitch: body.pitch,
    });

    // Return Vbee URL directly for preview — no storage upload
    return NextResponse.json({ audioUrl: result.audio_url });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 7: Voice Preset API Routes

**Files:**
- Create: `src/app/api/video/voice-presets/route.ts`
- Create: `src/app/api/video/voice-presets/[id]/route.ts`

- [ ] **Step 1: Create `GET + POST /api/video/voice-presets`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { VoicePresetService } from "@/services/voicePresetService";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const presets = await service.list(brandId);
    return NextResponse.json({ presets });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    const body = await request.json() as {
      brandId?: string;
      displayName?: string;
      voiceCode?: string;
      speed?: number;
      pitch?: number;
      pauseConfig?: Record<string, unknown> | null;
      isDefault?: boolean;
    };

    if (!body.brandId || !body.displayName || !body.voiceCode) {
      return NextResponse.json(
        { error: "brandId, displayName, voiceCode are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const preset = await service.create({
      brandId: body.brandId,
      displayName: body.displayName,
      voiceCode: body.voiceCode,
      speed: body.speed ?? 1.0,
      pitch: body.pitch ?? 1.0,
      pauseConfig: body.pauseConfig ?? null,
      isDefault: body.isDefault ?? false,
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2: Create `PATCH + DELETE /api/video/voice-presets/[id]`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { VoicePresetService } from "@/services/voicePresetService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const preset = await service.update(id, {
      ...(body.display_name !== undefined && { display_name: String(body.display_name) }),
      ...(body.speed !== undefined && { speed: Number(body.speed) }),
      ...(body.pitch !== undefined && { pitch: Number(body.pitch) }),
      ...(body.is_default !== undefined && { is_default: Boolean(body.is_default) }),
    });

    return NextResponse.json({ preset });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    await service.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 8: Voice Ratings API + Generated Audio API

**Files:**
- Create: `src/app/api/video/voice-ratings/route.ts`
- Create: `src/app/api/video/audio/route.ts`
- Create: `src/app/api/video/audio/[id]/route.ts`

- [ ] **Step 1: Create `GET + POST /api/video/voice-ratings`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voice_ratings")
      .select("vbee_voice_code, score")
      .eq("brand_id", brandId);

    if (error) throw new Error(error.message);

    // Aggregate avg per voice_code client-side (small dataset)
    const map = new Map<string, { sum: number; count: number }>();
    for (const row of data ?? []) {
      const existing = map.get(row.vbee_voice_code) ?? { sum: 0, count: 0 };
      map.set(row.vbee_voice_code, { sum: existing.sum + row.score, count: existing.count + 1 });
    }

    const ratings = [...map.entries()].map(([code, { sum, count }]) => ({
      vbee_voice_code: code,
      avg_score: sum / count,
      count,
    }));

    return NextResponse.json({ ratings });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    const body = await request.json() as {
      brandId?: string;
      voiceCode?: string;
      score?: number;
      note?: string;
    };

    if (!body.brandId || !body.voiceCode || typeof body.score !== "number") {
      return NextResponse.json({ error: "brandId, voiceCode, score are required" }, { status: 400 });
    }

    if (body.score < 1 || body.score > 5) {
      return NextResponse.json({ error: "score must be 1-5" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voice_ratings")
      .insert({
        brand_id: body.brandId,
        vbee_voice_code: body.voiceCode,
        score: body.score,
        note: body.note ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ rating: data }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2: Create `POST + GET /api/video/audio`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { VbeeService } from "@/services/vbeeService";
import { GeneratedAudioService } from "@/services/generatedAudioService";
import { StorageService } from "@/services/storageService";
import type { GenerateAudioRequest } from "@/features/video/types";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const scriptId = searchParams.get("scriptId");

    if (!brandId && !scriptId) {
      return NextResponse.json({ error: "brandId or scriptId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new GeneratedAudioService(supabase);
    const audios = scriptId
      ? await service.listByScript(scriptId)
      : await service.listByBrand(brandId!);

    return NextResponse.json({ audios });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as GenerateAudioRequest;

    if (!body.scriptId || !body.voicePresetId) {
      return NextResponse.json({ error: "scriptId and voicePresetId are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch script text
    const { data: script, error: scriptErr } = await supabase
      .from("brand_scripts")
      .select("final_text, raw_text, brand_id")
      .eq("id", body.scriptId)
      .single();

    if (scriptErr || !script) {
      return NextResponse.json({ error: "script_not_found" }, { status: 404 });
    }

    const textToSpeak = script.final_text ?? script.raw_text ?? "";
    if (!textToSpeak.trim()) {
      return NextResponse.json({ error: "script_text_empty" }, { status: 400 });
    }

    // Fetch voice preset
    const { data: preset, error: presetErr } = await supabase
      .from("voice_presets")
      .select("*")
      .eq("id", body.voicePresetId)
      .single();

    if (presetErr || !preset) {
      return NextResponse.json({ error: "voice_preset_not_found" }, { status: 404 });
    }

    // Call Vbee TTS
    const vbeeKey = await getUserApiKey(userId, "vbee");
    const vbeeService = new VbeeService(vbeeKey);
    const ttsResult = await vbeeService.synthesize({
      text: textToSpeak,
      voice_code: preset.voice_code as string,
      speed: preset.speed as number,
      pitch: preset.pitch as number,
    });

    // Download audio and upload to Supabase Storage
    const audioRes = await fetch(ttsResult.audio_url, { signal: AbortSignal.timeout(30000) });
    if (!audioRes.ok) {
      return NextResponse.json({ error: "audio_download_failed" }, { status: 502 });
    }

    const audioBuffer = await audioRes.arrayBuffer();
    const storagePath = `audio/${script.brand_id as string}/${body.scriptId}/${Date.now()}.mp3`;

    const storage = new StorageService(supabase);
    await storage.upload("generated-audio", storagePath, audioBuffer, "audio/mpeg");

    // Insert into generated_audios
    const audioService = new GeneratedAudioService(supabase);
    const audio = await audioService.create({
      scriptId: body.scriptId,
      brandId: script.brand_id as string,
      voicePresetId: body.voicePresetId,
      storagePath,
      vbeeAudioUrl: ttsResult.audio_url,
      durationSecs: ttsResult.duration ?? null,
    });

    return NextResponse.json({ audio }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Create `DELETE /api/video/audio/[id]`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { GeneratedAudioService } from "@/services/generatedAudioService";
import { StorageService } from "@/services/storageService";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const service = new GeneratedAudioService(supabase);
    const { storagePath } = await service.delete(id);

    // Best-effort storage cleanup
    if (storagePath) {
      const storage = new StorageService(supabase);
      await storage.remove("generated-audio", [storagePath]).catch((e: unknown) => {
        console.warn("[audio/delete] Storage cleanup failed:", e);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 9: TanStack Query Hooks

**Files:**
- Create: `src/hooks/api/useVoicePresets.ts`
- Create: `src/hooks/api/useGeneratedAudios.ts`

- [ ] **Step 1: Create `useVoicePresets.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { VoicePreset, VbeeVoice, VoiceAvgRating } from "@/features/video/types";

export function useVoicePresets(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.voicePresets.list(brandId!),
    queryFn: () =>
      apiFetch<{ presets: VoicePreset[] }>(`/api/video/voice-presets?brandId=${brandId}`),
    enabled: !!brandId,
    select: (d) => d.presets,
  });
}

export function useCreateVoicePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      brandId: string;
      displayName: string;
      voiceCode: string;
      speed: number;
      pitch: number;
      pauseConfig?: Record<string, unknown> | null;
    }) =>
      apiFetch<{ preset: VoicePreset }>("/api/video/voice-presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.voicePresets.list(brandId) });
    },
  });
}

export function useDeleteVoicePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ presetId }: { presetId: string; brandId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/video/voice-presets/${presetId}`, { method: "DELETE" }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.voicePresets.list(brandId) });
    },
  });
}

export function useVbeeVoices() {
  return useQuery({
    queryKey: queryKeys.vbeeVoices.all,
    queryFn: () => apiFetch<{ voices: VbeeVoice[] }>("/api/video/vbee/voices"),
    select: (d) => d.voices,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}

export function useVoiceRatings(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.voiceRatings.avg(brandId!),
    queryFn: () =>
      apiFetch<{ ratings: VoiceAvgRating[] }>(`/api/video/voice-ratings?brandId=${brandId}`),
    enabled: !!brandId,
    select: (d) => d.ratings,
  });
}

export function useSubmitVoiceRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { brandId: string; voiceCode: string; score: number; note?: string }) =>
      apiFetch("/api/video/voice-ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: input.brandId,
          voiceCode: input.voiceCode,
          score: input.score,
          note: input.note,
        }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.voiceRatings.avg(brandId) });
    },
  });
}
```

- [ ] **Step 2: Create `useGeneratedAudios.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { GeneratedAudio, GenerateAudioResponse } from "@/features/video/types";

export function useGeneratedAudiosByBrand(brandId: string | null) {
  return useQuery({
    queryKey: queryKeys.generatedAudios.list(brandId!),
    queryFn: () =>
      apiFetch<{ audios: GeneratedAudio[] }>(`/api/video/audio?brandId=${brandId}`),
    enabled: !!brandId,
    select: (d) => d.audios,
  });
}

export function useGeneratedAudiosByScript(scriptId: string | null) {
  return useQuery({
    queryKey: queryKeys.generatedAudios.byScript(scriptId!),
    queryFn: () =>
      apiFetch<{ audios: GeneratedAudio[] }>(`/api/video/audio?scriptId=${scriptId}`),
    enabled: !!scriptId,
    select: (d) => d.audios,
  });
}

export function useGenerateAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scriptId: string; voicePresetId: string; brandId: string }) =>
      apiFetch<GenerateAudioResponse>("/api/video/audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scriptId: input.scriptId, voicePresetId: input.voicePresetId }),
      }),
    onSuccess: (_data, { scriptId, brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.byScript(scriptId) });
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.list(brandId) });
    },
  });
}

export function useDeleteAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ audioId }: { audioId: string; scriptId: string; brandId: string }) =>
      apiFetch<{ ok: boolean }>(`/api/video/audio/${audioId}`, { method: "DELETE" }),
    onSuccess: (_data, { scriptId, brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.byScript(scriptId) });
      void qc.invalidateQueries({ queryKey: queryKeys.generatedAudios.list(brandId) });
    },
  });
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 10: Audio UI Components

**Files:**
- Create: `src/features/video/components/AudioPlayer.tsx`
- Create: `src/features/video/components/VoiceRatingStars.tsx`

- [ ] **Step 1: Create `AudioPlayer.tsx`**

```typescript
// Client Component: HTML5 audio player with download button
"use client";

import { useRef, useState } from "react";
import { Play, Pause, Download, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import type { GeneratedAudio } from "@/features/video/types";

interface AudioPlayerProps {
  audio: GeneratedAudio;
  publicUrl: string;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function AudioPlayer({ audio, publicUrl, onDelete, isDeleting }: AudioPlayerProps) {
  const { t } = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setPlaying(!playing);
  }

  const label = audio.voice_preset?.display_name ?? audio.voice_preset?.voice_code ?? "—";
  const duration = audio.duration_secs
    ? `${Math.floor(audio.duration_secs / 60)}:${String(Math.floor(audio.duration_secs % 60)).padStart(2, "0")}`
    : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-background-elevated/30 px-4 py-3">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={publicUrl}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        {duration && (
          <p className="text-xs text-foreground-subtle">{duration}</p>
        )}
      </div>

      <a
        href={publicUrl}
        download
        className="rounded-lg p-1.5 text-foreground-muted hover:bg-white/[0.04] hover:text-foreground"
        aria-label={t.video.downloadAudio}
      >
        <Download className="h-4 w-4" />
      </a>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          aria-label={t.video.deleteAudio}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `VoiceRatingStars.tsx`**

```typescript
// Client Component: 1-5 star rating with hover state
"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface VoiceRatingStarsProps {
  value: number;
  onChange: (score: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function VoiceRatingStars({
  value,
  onChange,
  readonly = false,
  size = "md",
}: VoiceRatingStarsProps) {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            disabled={readonly}
            className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-colors`}
          >
            <Star
              className={`${iconSize} ${
                filled ? "fill-yellow-400 text-yellow-400" : "text-foreground-subtle"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 11: VoiceGenerationPanel (Stage 5 in detail page)

**Files:**
- Create: `src/features/video/components/VoiceGenerationPanel.tsx`

- [ ] **Step 1: Create the component**

```typescript
// Client Component: Stage 5 voice generation list for a given script
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { Loader2 } from "lucide-react";
import { useVoicePresets } from "@/hooks/api/useVoicePresets";
import { useGeneratedAudiosByScript, useGenerateAudio, useDeleteAudio } from "@/hooks/api/useGeneratedAudios";
import { AudioPlayer } from "@/features/video/components/AudioPlayer";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface VoiceGenerationPanelProps {
  scriptId: string | null;
  brandId: string;
}

export function VoiceGenerationPanel({ scriptId, brandId }: VoiceGenerationPanelProps) {
  const { t } = useT();
  const { data: presets = [] } = useVoicePresets(brandId);
  const { data: audios = [] } = useGeneratedAudiosByScript(scriptId);
  const generateAudio = useGenerateAudio();
  const deleteAudio = useDeleteAudio();
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build public URL from storage path
  const supabase = createClient();
  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from("generated-audio").getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleGenerate() {
    if (!scriptId || !selectedPresetId) return;
    await generateAudio.mutateAsync({ scriptId, voicePresetId: selectedPresetId, brandId });
  }

  async function handleDelete(audioId: string) {
    if (!scriptId) return;
    setDeletingId(audioId);
    try {
      await deleteAudio.mutateAsync({ audioId, scriptId, brandId });
    } finally {
      setDeletingId(null);
    }
  }

  if (!scriptId) {
    return (
      <p className="text-sm text-foreground-muted">{t.video.noScriptSaved}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">{presets.length === 0 ? t.video.noVoicePreset : t.video.selectVoicePreset}</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!selectedPresetId || generateAudio.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
        >
          {generateAudio.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {generateAudio.isPending ? t.video.generatingAudio : t.video.generateAudio}
        </button>
      </div>

      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((audio) => (
            <AudioPlayer
              key={audio.id}
              audio={audio}
              publicUrl={audio.storage_path ? getPublicUrl(audio.storage_path) : (audio.vbee_audio_url ?? "")}
              onDelete={() => void handleDelete(audio.id)}
              isDeleting={deletingId === audio.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `/app/video/[id]/page.tsx` — replace Stage 5 placeholder**

In `src/app/app/video/[id]/page.tsx`, add the import:
```typescript
import { VoiceGenerationPanel } from "@/features/video/components/VoiceGenerationPanel";
```

Replace the Stage 5 `<section>` block:
```tsx
        {/* Stage 5: Voice Generation — placeholder, implemented in Phase 5 */}
        <section className="rounded-2xl border border-border-strong/20 bg-background-subtle p-6 opacity-50">
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t.video.stage5Title}
          </h2>
          <p className="text-sm text-foreground-muted">
            {savedScriptId ? "" : t.video.stage5Placeholder}
          </p>
        </section>
```

With:
```tsx
        {/* Stage 5: Voice Generation */}
        <section className="rounded-2xl border border-border-strong/20 bg-background-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t.video.stage5Title}
          </h2>
          <VoiceGenerationPanel
            scriptId={savedScriptId}
            brandId={selectedBrandId ?? ""}
          />
        </section>
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 12: Audio Library Page

**Files:**
- Modify: `src/app/app/video/audio/page.tsx`

- [ ] **Step 1: Replace placeholder with full audio library**

```typescript
// Client Component: brand audio library reads brand selection from context + state for delete
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import { useGeneratedAudiosByBrand, useDeleteAudio } from "@/hooks/api/useGeneratedAudios";
import { AudioPlayer } from "@/features/video/components/AudioPlayer";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function AudioLibraryPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();
  const { data: audios = [], isLoading } = useGeneratedAudiosByBrand(selectedBrandId);
  const deleteAudio = useDeleteAudio();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();
  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from("generated-audio").getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleDelete(audio: (typeof audios)[number]) {
    setDeletingId(audio.id);
    try {
      await deleteAudio.mutateAsync({
        audioId: audio.id,
        scriptId: audio.script_id,
        brandId: audio.brand_id,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardLayout activePath="/app/video/audio">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t.video.audioLibraryTitle}</h1>

        {!selectedBrandId ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border-strong/20 bg-background-subtle">
            <p className="text-sm text-foreground-muted">{t.video.noBrandSelected}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-background-elevated" />
            ))}
          </div>
        ) : audios.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border-strong/20 bg-background-subtle">
            <p className="text-sm text-foreground-muted">{t.video.noAudiosYet}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border-strong/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-background-elevated/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableScript}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableVoice}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableDuration}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableCreated}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {audios.map((audio) => {
                  const scriptText = audio.brand_script?.final_text ?? audio.brand_script?.raw_text ?? "—";
                  const publicUrl = audio.storage_path
                    ? getPublicUrl(audio.storage_path)
                    : (audio.vbee_audio_url ?? "");
                  const duration = audio.duration_secs
                    ? `${Math.floor(audio.duration_secs / 60)}:${String(Math.floor(audio.duration_secs % 60)).padStart(2, "0")}`
                    : "—";

                  return (
                    <tr key={audio.id} className="hover:bg-background-elevated/20">
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-1 text-sm text-foreground">{scriptText}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {audio.voice_preset?.display_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">{duration}</td>
                      <td className="px-4 py-3 text-sm text-foreground-subtle">
                        {new Date(audio.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={publicUrl}
                            download
                            className="rounded px-2 py-1 text-xs text-primary hover:underline"
                          >
                            {t.video.downloadAudio}
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDelete(audio)}
                            disabled={deletingId === audio.id}
                            className="rounded px-2 py-1 text-xs text-red-400 hover:underline disabled:opacity-50"
                          >
                            {t.video.deleteAudio}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 13: Voice Lab Page (`/app/video/voice-config`)

**Files:**
- Modify: `src/app/app/video/voice-config/page.tsx`

- [ ] **Step 1: Replace placeholder with full Voice Lab**

```typescript
// Client Component: Voice Lab uses state for filters, test params, preview audio
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import {
  useVbeeVoices,
  useVoiceRatings,
  useSubmitVoiceRating,
  useCreateVoicePreset,
} from "@/hooks/api/useVoicePresets";
import { VoiceRatingStars } from "@/features/video/components/VoiceRatingStars";
import { apiFetch } from "@/lib/api";
import type { VbeeVoice } from "@/features/video/types";

const SAMPLE_TEXT =
  "Sản phẩm này đã thay đổi hoàn toàn cách tôi chăm sóc da. Chỉ sau 2 tuần, làn da trở nên mịn màng và sáng khỏe hơn rõ rệt. Bạn có muốn thử không?";

type Gender = "all" | "male" | "female";
type Region = "all" | "north" | "central" | "south";
type SortBy = "viral" | "name";

export default function VoiceConfigPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();

  // Filters
  const [gender, setGender] = useState<Gender>("all");
  const [region, setRegion] = useState<Region>("all");
  const [sortBy, setSortBy] = useState<SortBy>("viral");

  // Voice Lab panel state
  const [selectedVoice, setSelectedVoice] = useState<VbeeVoice | null>(null);
  const [testText, setTestText] = useState(SAMPLE_TEXT);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetSaved, setPresetSaved] = useState(false);

  const { data: voices = [], isLoading: loadingVoices } = useVbeeVoices();
  const { data: ratings = [] } = useVoiceRatings(selectedBrandId);
  const submitRating = useSubmitVoiceRating();
  const createPreset = useCreateVoicePreset();

  const ratingMap = new Map(ratings.map((r) => [r.vbee_voice_code, r.avg_score]));

  const filtered = voices
    .filter((v) => gender === "all" || v.gender === gender)
    .filter((v) => region === "all" || v.region === region)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const aScore = ratingMap.get(a.voice_code) ?? 0;
      const bScore = ratingMap.get(b.voice_code) ?? 0;
      return bScore - aScore;
    });

  async function handlePreview() {
    if (!selectedVoice || !testText.trim()) return;
    setGeneratingPreview(true);
    setPreviewUrl(null);
    setPreviewError(null);
    try {
      const res = await apiFetch<{ audioUrl: string }>("/api/video/vbee/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice_code: selectedVoice.voice_code, text: testText, speed, pitch }),
      });
      setPreviewUrl(res.audioUrl);
    } catch {
      setPreviewError(t.video.audioFailed);
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function handleSaveRating() {
    if (!selectedBrandId || !selectedVoice || rating === 0) return;
    await submitRating.mutateAsync({
      brandId: selectedBrandId,
      voiceCode: selectedVoice.voice_code,
      score: rating,
      note: ratingNote || undefined,
    });
    setRating(0);
    setRatingNote("");
  }

  async function handleSavePreset() {
    if (!selectedBrandId || !selectedVoice || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      await createPreset.mutateAsync({
        brandId: selectedBrandId,
        displayName: presetName.trim(),
        voiceCode: selectedVoice.voice_code,
        speed,
        pitch,
      });
      setPresetSaved(true);
      setPresetName("");
      setTimeout(() => setPresetSaved(false), 2000);
    } finally {
      setSavingPreset(false);
    }
  }

  return (
    <DashboardLayout activePath="/app/video/voice-config">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t.video.voiceLabTitle}</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Voice Browser */}
          <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">{t.video.voiceBrowserTitle}</h2>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "female", "male"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    gender === g ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-white/[0.04]"
                  }`}
                >
                  {g === "all" ? t.video.filterGenderAll : g === "female" ? t.video.filterGenderFemale : t.video.filterGenderMale}
                </button>
              ))}
              <span className="w-px bg-border/30" />
              {(["all", "north", "central", "south"] as Region[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    region === r ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-white/[0.04]"
                  }`}
                >
                  {r === "all" ? t.video.filterRegionAll : r === "north" ? t.video.filterRegionNorth : r === "central" ? t.video.filterRegionCentral : t.video.filterRegionSouth}
                </button>
              ))}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="ml-auto rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground-muted focus:outline-none"
              >
                <option value="viral">{t.video.sortByViralScore}</option>
                <option value="name">{t.video.sortByName}</option>
              </select>
            </div>

            {/* Voice list */}
            {loadingVoices ? (
              <p className="text-sm text-foreground-muted">{t.video.loadingVoices}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-foreground-muted">{t.video.noVoicesFound}</p>
            ) : (
              <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                {filtered.map((voice) => {
                  const avgScore = ratingMap.get(voice.voice_code) ?? 0;
                  const isSelected = selectedVoice?.voice_code === voice.voice_code;
                  return (
                    <div
                      key={voice.voice_code}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{voice.name}</p>
                        {avgScore > 0 && (
                          <VoiceRatingStars value={Math.round(avgScore)} onChange={() => undefined} readonly size="sm" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVoice(voice);
                          setPreviewUrl(null);
                        }}
                        className="shrink-0 rounded-lg border border-border/40 px-2.5 py-1 text-xs text-foreground-muted hover:bg-white/[0.04]"
                      >
                        {t.video.quickTest}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Voice Lab */}
          <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">{t.video.voiceLabPanelTitle}</h2>

            {!selectedVoice ? (
              <p className="text-sm text-foreground-muted">Chọn giọng từ danh sách bên trái để thử.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground-muted">{t.video.testText}</p>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder={t.video.testTextPlaceholder}
                    rows={4}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">
                      {t.video.speed}: {speed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">
                      {t.video.pitch}: {pitch.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={generatingPreview || !testText.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
                >
                  {generatingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                  {generatingPreview ? t.video.generatingPreview : t.video.generatePreview}
                </button>

                {previewError && <p className="text-xs text-danger">{previewError}</p>}

                {previewUrl && (
                  <div className="rounded-xl border border-border/30 bg-background p-3">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio src={previewUrl} controls className="w-full" />
                  </div>
                )}

                {/* Rating */}
                <div className="border-t border-border/20 pt-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">{t.video.rateVoice}</p>
                  <VoiceRatingStars value={rating} onChange={setRating} />
                  <textarea
                    value={ratingNote}
                    onChange={(e) => setRatingNote(e.target.value)}
                    placeholder={t.video.notePlaceholder}
                    rows={2}
                    className="mt-2 w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveRating()}
                    disabled={rating === 0 || submitRating.isPending || !selectedBrandId}
                    className="mt-2 rounded-lg bg-background-elevated px-3 py-1.5 text-sm text-foreground-muted hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    Lưu đánh giá
                  </button>
                </div>

                {/* Save preset */}
                <div className="border-t border-border/20 pt-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">{t.video.presetDisplayName}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder={t.video.presetDisplayNamePlaceholder}
                      className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSavePreset()}
                      disabled={savingPreset || !presetName.trim() || !selectedBrandId}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
                    >
                      {savingPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : presetSaved ? t.video.presetSaved : t.video.savePreset}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: TypeScript check + build**

```
npx tsc --noEmit
npm run build
```

Expected: 0 TypeScript errors, build succeeds.

---

## Implementation Order

Tasks 1–3 can be done in parallel (key provider, storage bucket, types+i18n).
Task 4 (VbeeService) depends on Task 3 types.
Task 5 (VoicePresetService + GeneratedAudioService) depends on Task 3 types.
Tasks 6–8 (API routes) depend on Tasks 4–5.
Task 9 (hooks) depends on Task 3 query keys.
Task 10 (AudioPlayer + VoiceRatingStars) depends on Task 3 types.
Task 11 (VoiceGenerationPanel + [id] page update) depends on Tasks 9–10.
Task 12 (Audio Library page) depends on Task 9.
Task 13 (Voice Lab page) depends on Tasks 9–10.

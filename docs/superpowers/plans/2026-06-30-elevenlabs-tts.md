# ElevenLabs TTS Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ElevenLabs as a second TTS provider alongside Vbee. Voice presets record their provider; the audio generation route branches to the correct service. The Voice Config page gains an ElevenLabs tab for browsing the user's own voices (My Voices / Collection) and saving presets.

**Architecture:** New `ElevenLabsService` mirrors `VbeeService` structure. `POST /api/video/audio` reads `preset.provider` and routes to either service; ElevenLabs returns binary audio directly (no URL download step). `voice_presets` gets three new columns (`provider`, `provider_voice_id`, `elevenlabs_model`); `generated_audios` gets a `provider` column. The Voice Config page (`src/app/app/video/voice-config/page.tsx`) is extended with a provider tab — the existing Vbee section is unchanged, ElevenLabs section loads voices from the new `/api/video/elevenlabs/voices` route.

**Tech Stack:** ElevenLabs REST API, Next.js App Router, React, TanStack Query, Supabase Storage, TypeScript

## Global Constraints

- ElevenLabs API base URL: `https://api.elevenlabs.io`
- Auth header: `xi-api-key: {ELEVENLABS_API_KEY}` (NOT Bearer token)
- List voices endpoint: `GET /v2/voices?page_size=100` — returns `{ voices: [...] }` with fields: `voice_id`, `name`, `category`, `preview_url`, `labels`
- TTS endpoint: `POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128` — returns **binary audio** (`application/octet-stream`) directly, NOT a URL
- Models: `eleven_v3` (expression tags supported), `eleven_flash_v2_5` (no expression tags)
- `provider` values: `'vbee' | 'elevenlabs'` — same `TtsProvider` type from `src/services/scriptPrompt.ts`
- `ElevenLabsModel` type is already defined in `src/services/scriptPrompt.ts` — import from there, do not redefine
- API key source: `process.env.ELEVENLABS_API_KEY` (global env, not per-user)
- Add `ELEVENLABS_API_KEY=your_key_here` to `.env.local`
- DB migration via Supabase MCP (`mcp__supabase__execute_sql` or `apply_migration`) — NOT Supabase CLI
- After migration, regenerate `src/types/database.types.ts` via `mcp__supabase__generate_typescript_types`
- TypeScript: no `any`, no type assertions without comment
- Tailwind CSS for all styling

---

### Task 1: DB migration — extend `voice_presets` and `generated_audios`

**Files:**
- Create: `supabase/migrations/15_elevenlabs_provider.sql`
- Apply via Supabase MCP
- Add `ELEVENLABS_API_KEY` to `.env.local`

**Interfaces:**
- Produces:
  - `voice_presets.provider TEXT NOT NULL DEFAULT 'vbee'`
  - `voice_presets.provider_voice_id TEXT` (nullable — ElevenLabs `voice_id`)
  - `voice_presets.elevenlabs_model TEXT` (nullable — `'eleven_v3'` or `'eleven_flash_v2_5'`)
  - `generated_audios.provider TEXT NOT NULL DEFAULT 'vbee'`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/15_elevenlabs_provider.sql
BEGIN;

ALTER TABLE public.voice_presets
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'vbee'
    CHECK (provider IN ('vbee', 'elevenlabs')),
  ADD COLUMN IF NOT EXISTS provider_voice_id TEXT,
  ADD COLUMN IF NOT EXISTS elevenlabs_model TEXT
    CHECK (elevenlabs_model IN ('eleven_v3', 'eleven_flash_v2_5'));

ALTER TABLE public.generated_audios
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'vbee'
    CHECK (provider IN ('vbee', 'elevenlabs'));

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__execute_sql` with the SQL above. Confirm no error.

- [ ] **Step 3: Add API key to `.env.local`**

Add this line to `.env.local`:
```
ELEVENLABS_API_KEY=your_key_here
```
Replace `your_key_here` with the real ElevenLabs API key.

- [ ] **Step 4: Regenerate TypeScript types**

Use `mcp__supabase__generate_typescript_types` → overwrite `src/types/database.types.ts`. Confirm `voice_presets` row now includes `provider`, `provider_voice_id`, `elevenlabs_model` and `generated_audios` row includes `provider`.

---

### Task 2: Update TypeScript interfaces for `VoicePreset` and `GeneratedAudio`

**Files:**
- Modify: `src/features/video/types.ts`

**Interfaces:**
- Consumes: `TtsProvider`, `ElevenLabsModel` from `src/services/scriptPrompt.ts`
- Produces:
  - `VoicePreset` extended with `provider`, `provider_voice_id`, `elevenlabs_model`
  - `GeneratedAudio` extended with `provider`
  - New `ElevenLabsVoice` interface

- [ ] **Step 1: Add imports and new types to `src/features/video/types.ts`**

At the top, add import:
```typescript
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
```

Update `VoicePreset` interface:
```typescript
export interface VoicePreset {
  id: string;
  brand_id: string;
  display_name: string;
  voice_code: string;
  provider: TtsProvider;
  provider_voice_id: string | null;
  elevenlabs_model: ElevenLabsModel | null;
  speed: number;
  pitch: number;
  pause_config: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
}
```

Update `GeneratedAudio` interface — add `provider` field and make `vbee_audio_url` nullable:
```typescript
export interface GeneratedAudio {
  id: string;
  script_id: string;
  brand_id: string;
  voice_preset_id: string | null;
  storage_path: string | null;
  vbee_audio_url: string | null;
  provider: TtsProvider;
  duration_secs: number | null;
  created_at: string;
  voice_preset?: Pick<VoicePreset, "display_name" | "voice_code" | "speed"> | null;
  brand_script?: Pick<BrandScript, "final_text" | "raw_text"> | null;
}
```

Add new `ElevenLabsVoice` interface:
```typescript
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string | null;
  labels: Record<string, string>;
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

Fix any downstream type errors (e.g., `voice_preset` join types that reference removed/renamed fields).

---

### Task 3: `ElevenLabsService` + voices API route

**Files:**
- Create: `src/services/elevenlabsService.ts`
- Create: `src/app/api/video/elevenlabs/voices/route.ts`
- Create: `src/app/api/__tests__/elevenlabs-voices.test.ts`

**Interfaces:**
- Produces:
  - `ElevenLabsService.listVoices()` → `Promise<ElevenLabsVoice[]>`
  - `ElevenLabsService.synthesize(req)` → `Promise<ArrayBuffer>`
  - `GET /api/video/elevenlabs/voices` → `{ voices: ElevenLabsVoice[] }`

- [ ] **Step 1: Create `src/services/elevenlabsService.ts`**

```typescript
// src/services/elevenlabsService.ts
import type { ElevenLabsVoice } from "@/features/video/types";
import type { ElevenLabsModel } from "@/services/scriptPrompt";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";
const ELEVENLABS_DEFAULT_MODEL: ElevenLabsModel = "eleven_flash_v2_5";
const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
const ELEVENLABS_VOICES_TIMEOUT_MS = 10_000;
const ELEVENLABS_SYNTHESIZE_TIMEOUT_MS = 60_000;

export interface ElevenLabsTTSRequest {
  text: string;
  voice_id: string;
  model_id?: ElevenLabsModel;
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  style?: number;
}

export class ElevenLabsService {
  constructor(private readonly apiKey: string) {}

  async listVoices(): Promise<ElevenLabsVoice[]> {
    const res = await fetch(
      `${ELEVENLABS_API_BASE}/v2/voices?page_size=100`,
      {
        headers: { "xi-api-key": this.apiKey },
        signal: AbortSignal.timeout(ELEVENLABS_VOICES_TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs list voices failed: ${res.status}`);
    // Safe: ElevenLabs /v2/voices always returns { voices: [...] }
    const data = (await res.json()) as { voices?: ElevenLabsVoice[] };
    return data.voices ?? [];
  }

  async synthesize(request: ElevenLabsTTSRequest): Promise<ArrayBuffer> {
    const url = `${ELEVENLABS_API_BASE}/v1/text-to-speech/${request.voice_id}?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: request.text,
        model_id: request.model_id ?? ELEVENLABS_DEFAULT_MODEL,
        voice_settings: {
          stability: request.stability ?? 0.5,
          similarity_boost: request.similarity_boost ?? 0.75,
          style: request.style ?? 0.0,
          speed: request.speed ?? 1.0,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(ELEVENLABS_SYNTHESIZE_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Safe: ElevenLabs error responses include a detail object
      const err = (await res.json().catch(() => ({}))) as {
        detail?: { message?: string };
      };
      throw new Error(err.detail?.message ?? `ElevenLabs TTS failed: ${res.status}`);
    }

    return res.arrayBuffer();
  }
}
```

- [ ] **Step 2: Write test for the voices route**

```typescript
// src/app/api/__tests__/elevenlabs-voices.test.ts
import { NextRequest } from "next/server";

jest.mock("@/lib/user-context", () => ({
  requireUser: jest.fn().mockResolvedValue({ userId: "u1" }),
  handleApiError: jest.fn((e: unknown) =>
    new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  ),
}));

jest.mock("@/services/elevenlabsService", () => ({
  ElevenLabsService: jest.fn().mockImplementation(() => ({
    listVoices: jest.fn().mockResolvedValue([
      { voice_id: "v1", name: "Adam", category: "premade", preview_url: "https://ex.com/a.mp3", labels: {} },
    ]),
  })),
}));

const ORIGINAL_ENV = process.env;
beforeEach(() => { process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" }; });
afterEach(() => { process.env = ORIGINAL_ENV; });

it("returns voices list", async () => {
  const { GET } = await import("@/app/api/video/elevenlabs/voices/route");
  const req = new NextRequest("http://localhost/api/video/elevenlabs/voices");
  const res = await GET(req);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { voices: unknown[] };
  expect(body.voices).toHaveLength(1);
});

it("returns 500 when ELEVENLABS_API_KEY is missing", async () => {
  delete process.env.ELEVENLABS_API_KEY;
  const { GET } = await import("@/app/api/video/elevenlabs/voices/route");
  const req = new NextRequest("http://localhost/api/video/elevenlabs/voices");
  const res = await GET(req);
  expect(res.status).toBe(500);
});
```

- [ ] **Step 3: Run test — confirm it fails**

```bash
npx jest src/app/api/__tests__/elevenlabs-voices.test.ts --no-coverage
```
Expected: FAIL — module not found

- [ ] **Step 4: Create the voices route**

```typescript
// src/app/api/video/elevenlabs/voices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ElevenLabsService } from "@/services/elevenlabsService";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
    }

    const service = new ElevenLabsService(apiKey);
    const voices = await service.listVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 5: Run test — confirm it passes**

```bash
npx jest src/app/api/__tests__/elevenlabs-voices.test.ts --no-coverage
```
Expected: PASS (2 tests)

---

### Task 4: Update `VoicePresetService` + `GeneratedAudioService`

**Files:**
- Modify: `src/services/voicePresetService.ts`
- Modify: `src/services/generatedAudioService.ts`
- Modify: `src/app/api/video/voice-presets/route.ts`

**Interfaces:**
- Produces:
  - `CreateVoicePresetInput` gains `provider`, `providerVoiceId`, `elevenLabsModel`
  - `VoicePresetService.create()` writes new columns
  - `GeneratedAudioService.create()` accepts `provider` and allows `vbeeAudioUrl: string | null`

- [ ] **Step 1: Update `CreateVoicePresetInput` and `VoicePresetService.create()`**

In `src/services/voicePresetService.ts`:

```typescript
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
import type { VoicePreset } from "@/features/video/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateVoicePresetInput {
  brandId: string;
  displayName: string;
  voiceCode: string;
  provider: TtsProvider;
  providerVoiceId: string | null;
  elevenLabsModel: ElevenLabsModel | null;
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
        provider: input.provider,
        provider_voice_id: input.providerVoiceId,
        elevenlabs_model: input.elevenLabsModel,
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
    const { error } = await this.supabase.from("voice_presets").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 2: Update `POST /api/video/voice-presets` route**

In `src/app/api/video/voice-presets/route.ts`, update the POST handler body type and service call:

```typescript
    const body = await request.json() as {
      brandId?: string;
      displayName?: string;
      voiceCode?: string;
      provider?: string;
      providerVoiceId?: string | null;
      elevenLabsModel?: string | null;
      speed?: number;
      pitch?: number;
      pauseConfig?: Record<string, unknown> | null;
      isDefault?: boolean;
    };

    const provider = body.provider === "elevenlabs" ? "elevenlabs" : "vbee";

    if (!body.brandId || !body.displayName) {
      return NextResponse.json(
        { error: "brandId and displayName are required" },
        { status: 400 },
      );
    }
    // For Vbee presets voiceCode is required; for ElevenLabs providerVoiceId is required
    if (provider === "vbee" && !body.voiceCode) {
      return NextResponse.json({ error: "voiceCode is required for Vbee" }, { status: 400 });
    }
    if (provider === "elevenlabs" && !body.providerVoiceId) {
      return NextResponse.json({ error: "providerVoiceId is required for ElevenLabs" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const preset = await service.create({
      brandId: body.brandId,
      displayName: body.displayName,
      voiceCode: body.voiceCode ?? "",
      provider,
      providerVoiceId: body.providerVoiceId ?? null,
      elevenLabsModel: (body.elevenLabsModel as "eleven_v3" | "eleven_flash_v2_5" | null) ?? null,
      speed: body.speed ?? 1.0,
      pitch: body.pitch ?? 1.0,
      pauseConfig: body.pauseConfig ?? null,
      isDefault: body.isDefault ?? false,
    });
```

- [ ] **Step 3: Update `GeneratedAudioService.create()`**

In `src/services/generatedAudioService.ts`, update the `create` method:

```typescript
import type { TtsProvider } from "@/services/scriptPrompt";

  async create(input: {
    scriptId: string;
    brandId: string;
    voicePresetId: string;
    storagePath: string;
    vbeeAudioUrl: string | null;
    provider: TtsProvider;
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
        provider: input.provider,
        duration_secs: input.durationSecs,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as GeneratedAudio;
  }
```

- [ ] **Step 4: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

---

### Task 5: Update `POST /api/video/audio` — branch by provider

**Files:**
- Modify: `src/app/api/video/audio/route.ts`

**Interfaces:**
- Consumes: `ElevenLabsService` from Task 3; `VoicePreset.provider`, `VoicePreset.provider_voice_id`, `VoicePreset.elevenlabs_model` from Task 2
- Produces: same response shape `{ audio: GeneratedAudio }` regardless of provider

- [ ] **Step 1: Write the updated route**

Replace the entire `POST` handler body in `src/app/api/video/audio/route.ts` with:

```typescript
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as GenerateAudioRequest;

    if (!body.scriptId || !body.voicePresetId) {
      return NextResponse.json({ error: "scriptId and voicePresetId are required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: script, error: scriptError } = await supabase
      .from("brand_scripts")
      .select("final_text, raw_text, brand_id")
      .eq("id", body.scriptId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json({ error: "script_not_found" }, { status: 404 });
    }

    const textToSpeak = ((script.final_text ?? script.raw_text ?? "") as string).trim();
    if (!textToSpeak) {
      return NextResponse.json({ error: "script_text_empty" }, { status: 400 });
    }

    const { data: preset, error: presetError } = await supabase
      .from("voice_presets")
      .select("*")
      .eq("id", body.voicePresetId)
      .single();

    if (presetError || !preset) {
      return NextResponse.json({ error: "voice_preset_not_found" }, { status: 404 });
    }

    // Safe: voice_presets row matches VoicePreset shape
    const typedPreset = preset as VoicePreset;
    const brandId = script.brand_id as string;
    const storagePath = `audio/${brandId}/${body.scriptId}/${Date.now()}.mp3`;
    const storage = new StorageService(supabase);

    let audioBuffer: ArrayBuffer;
    let vbeeAudioUrl: string | null = null;

    if (typedPreset.provider === "elevenlabs") {
      const elKey = process.env.ELEVENLABS_API_KEY;
      if (!elKey) {
        return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
      }
      if (!typedPreset.provider_voice_id) {
        return NextResponse.json({ error: "elevenlabs_voice_id_missing" }, { status: 400 });
      }

      const { ElevenLabsService } = await import("@/services/elevenlabsService");
      const elService = new ElevenLabsService(elKey);
      audioBuffer = await elService.synthesize({
        text: textToSpeak,
        voice_id: typedPreset.provider_voice_id,
        model_id: typedPreset.elevenlabs_model ?? undefined,
        speed: typedPreset.speed,
      });
    } else {
      // Vbee flow
      const vbeeKey = await getUserApiKey(userId, "vbee");
      const vbeeService = new VbeeService(vbeeKey);
      const ttsResult = await vbeeService.synthesize({
        text: textToSpeak,
        voice_code: typedPreset.voice_code,
        speed: typedPreset.speed,
        pitch: typedPreset.pitch,
      });

      vbeeAudioUrl = ttsResult.audio_url;
      const audioRes = await fetch(ttsResult.audio_url, {
        signal: AbortSignal.timeout(AUDIO_DOWNLOAD_TIMEOUT_MS),
      });
      if (!audioRes.ok) {
        return NextResponse.json({ error: "audio_download_failed" }, { status: 502 });
      }
      audioBuffer = await audioRes.arrayBuffer();
    }

    await storage.upload("generated-audio", storagePath, audioBuffer, "audio/mpeg");

    const audioService = new GeneratedAudioService(supabase);
    const audio = await audioService.create({
      scriptId: body.scriptId,
      brandId,
      voicePresetId: body.voicePresetId,
      storagePath,
      vbeeAudioUrl,
      provider: typedPreset.provider,
      durationSecs: null,
    });

    return NextResponse.json({ audio }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

Add `ElevenLabsService` is dynamically imported inside the if-block to avoid loading the module for Vbee requests. Also add at the top of the file:
```typescript
import type { VoicePreset } from "@/features/video/types";
```
(if not already imported)

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

---

### Task 6: Voice Config page — ElevenLabs tab

**Files:**
- Modify: `src/app/app/video/voice-config/page.tsx`
- Modify: `src/hooks/api/useVoicePresets.ts` (update `useCreateVoicePreset` to accept new fields)

**Interfaces:**
- Consumes: `GET /api/video/elevenlabs/voices` → `{ voices: ElevenLabsVoice[] }`; `POST /api/video/voice-presets` (updated from Task 4)
- Produces: Voice Config page has two tabs ("Vbee" | "ElevenLabs"); ElevenLabs tab lists user's My Voices with preview player and preset-save form

- [ ] **Step 1: Update `useCreateVoicePreset` hook**

In `src/hooks/api/useVoicePresets.ts`, find `useCreateVoicePreset`. Update its `mutationFn` to accept the expanded payload:

```typescript
export function useCreateVoicePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      brandId: string;
      displayName: string;
      voiceCode: string;
      provider: TtsProvider;
      providerVoiceId: string | null;
      elevenLabsModel: ElevenLabsModel | null;
      speed: number;
      pitch: number;
      isDefault?: boolean;
    }) => {
      const res = await fetch("/api/video/voice-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to save preset");
      }
      return (await res.json()) as { preset: VoicePreset };
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["voice-presets", variables.brandId] });
    },
  });
}
```

Add imports at top of `useVoicePresets.ts`:
```typescript
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
import type { VoicePreset } from "@/features/video/types";
```

- [ ] **Step 2: Add `useElevenLabsVoices` hook**

In `src/hooks/api/useVoicePresets.ts`, add:

```typescript
import type { ElevenLabsVoice } from "@/features/video/types";

export function useElevenLabsVoices() {
  return useQuery({
    queryKey: ["elevenlabs-voices"],
    queryFn: async () => {
      const res = await fetch("/api/video/elevenlabs/voices");
      if (!res.ok) throw new Error("Failed to fetch ElevenLabs voices");
      const data = (await res.json()) as { voices: ElevenLabsVoice[] };
      return data.voices;
    },
  });
}
```

- [ ] **Step 3: Add provider tab state and ElevenLabs section to `voice-config/page.tsx`**

At the top of `VoiceConfigPage`, add state:

```typescript
  type Provider = "vbee" | "elevenlabs";
  const [provider, setProvider] = useState<Provider>("vbee");

  // ElevenLabs state
  const [selectedElVoice, setSelectedElVoice] = useState<ElevenLabsVoice | null>(null);
  const [elModel, setElModel] = useState<ElevenLabsModel>("eleven_flash_v2_5");
  const [elPresetName, setElPresetName] = useState("");
  const [elSpeed, setElSpeed] = useState(1.0);
  const [elPreviewAudio, setElPreviewAudio] = useState<string | null>(null);
```

Add imports:
```typescript
import type { ElevenLabsVoice } from "@/features/video/types";
import type { ElevenLabsModel } from "@/services/scriptPrompt";
import { useElevenLabsVoices } from "@/hooks/api/useVoicePresets";
```

Inside the component, add:
```typescript
  const { data: elVoices = [], isLoading: loadingElVoices } = useElevenLabsVoices();
```

- [ ] **Step 4: Add provider tab switcher to JSX**

In the JSX return of `VoiceConfigPage`, at the very top (before filters/content), add:

```tsx
      {/* Provider tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden mb-6 text-sm">
        {(["vbee", "elevenlabs"] as Provider[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            className={`flex-1 py-2 font-semibold transition-colors ${
              provider === p
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground-muted hover:bg-background-elevated"
            }`}
          >
            {p === "vbee" ? "Vbee" : "ElevenLabs"}
          </button>
        ))}
      </div>
```

Then wrap the existing Vbee content (filters, voices grid, preview panel) with `{provider === "vbee" && (...)}`.

- [ ] **Step 5: Add ElevenLabs section to JSX**

After the Vbee block, add:

```tsx
      {provider === "elevenlabs" && (
        <div className="space-y-6">
          {loadingElVoices && (
            <div className="flex items-center gap-2 py-8 text-foreground-subtle">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Đang tải voices...</span>
            </div>
          )}

          {/* Voice list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {elVoices.map((v) => (
              <button
                key={v.voice_id}
                type="button"
                onClick={() => { setSelectedElVoice(v); setElPreviewAudio(null); }}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selectedElVoice?.voice_id === v.voice_id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className="font-semibold text-sm">{v.name}</p>
                <p className="text-xs text-foreground-muted capitalize">{v.category}</p>
                {v.labels && Object.keys(v.labels).length > 0 && (
                  <p className="text-xs text-foreground-subtle mt-0.5">
                    {Object.values(v.labels).slice(0, 3).join(" · ")}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Preview + Save preset panel */}
          {selectedElVoice && (
            <div className="rounded-xl border border-border bg-background-elevated p-5 space-y-4">
              <p className="font-bold">{selectedElVoice.name}</p>

              {/* Preview player — use preview_url directly, no synthesis needed */}
              {selectedElVoice.preview_url && (
                <div>
                  <p className="text-xs font-semibold text-foreground-muted mb-1.5">Nghe thử</p>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls src={selectedElVoice.preview_url} className="w-full" />
                </div>
              )}

              {/* Model selector */}
              <div>
                <p className="text-xs font-semibold text-foreground-muted mb-1.5">Model</p>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  {(["eleven_flash_v2_5", "eleven_v3"] as ElevenLabsModel[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setElModel(m)}
                      className={`flex-1 py-1.5 font-medium transition-colors ${
                        elModel === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground-muted hover:bg-background-elevated"
                      }`}
                    >
                      {m === "eleven_v3" ? "v3 — Expression tags" : "v2.5 — Flash"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-foreground-subtle mt-1">
                  {elModel === "eleven_v3"
                    ? "Hỗ trợ [chuckles], [amused]… — chất lượng cao nhất"
                    : "Nhanh hơn, rẻ hơn — dùng CHỮ HOA và dấu câu để nhấn nhá"}
                </p>
              </div>

              {/* Speed */}
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                  Tốc độ: {elSpeed.toFixed(1)}×
                </label>
                <input
                  type="range"
                  min={0.7}
                  max={1.2}
                  step={0.1}
                  value={elSpeed}
                  onChange={(e) => setElSpeed(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Preset name + save */}
              <div>
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
                  Tên preset
                </label>
                <input
                  type="text"
                  value={elPresetName}
                  onChange={(e) => setElPresetName(e.target.value)}
                  placeholder={`${selectedElVoice.name} · ${elModel === "eleven_v3" ? "v3" : "v2.5"}`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <button
                type="button"
                disabled={!selectedBrandId || createPreset.isPending}
                onClick={() => {
                  if (!selectedBrandId || !selectedElVoice) return;
                  void createPreset.mutateAsync({
                    brandId: selectedBrandId,
                    displayName: elPresetName.trim() || `${selectedElVoice.name} · ${elModel === "eleven_v3" ? "v3" : "v2.5"}`,
                    voiceCode: "",
                    provider: "elevenlabs",
                    providerVoiceId: selectedElVoice.voice_id,
                    elevenLabsModel: elModel,
                    speed: elSpeed,
                    pitch: 1.0,
                  });
                }}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {createPreset.isPending ? "Đang lưu..." : "Lưu preset"}
              </button>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 6: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Manual end-to-end test**

1. `npm run dev`
2. Go to Voice Config page → confirm "Vbee" and "ElevenLabs" tabs appear
3. Click "ElevenLabs" → voice list loads from account's My Voices collection
4. Click a voice → preview audio plays from `preview_url`
5. Choose model (v3 or v2.5), set speed, enter preset name, click "Lưu preset"
6. Navigate to a script's audio generation panel → select the ElevenLabs preset → click Generate
7. Confirm audio is generated and playback works
8. Verify `generated_audios.provider = 'elevenlabs'` in Supabase dashboard

- [ ] **Step 8: Commit**

```bash
git add \
  supabase/migrations/15_elevenlabs_provider.sql \
  src/types/database.types.ts \
  src/features/video/types.ts \
  src/services/elevenlabsService.ts \
  src/app/api/video/elevenlabs/voices/route.ts \
  src/app/api/__tests__/elevenlabs-voices.test.ts \
  src/services/voicePresetService.ts \
  src/services/generatedAudioService.ts \
  src/app/api/video/voice-presets/route.ts \
  src/app/api/video/audio/route.ts \
  src/hooks/api/useVoicePresets.ts \
  src/app/app/video/voice-config/page.tsx
git commit -m "feat(audio): ElevenLabs TTS provider — voice picker, preset save, branched audio generation"
```

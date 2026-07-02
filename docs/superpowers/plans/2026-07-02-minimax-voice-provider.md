# MiniMax Voice Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MiniMax as a third TTS provider — full T2A synthesis config + per-brand voice cloning — plugged into the existing `TtsProvider` string-union architecture.

**Architecture:** No provider registry (matches codebase). New `minimaxService` (mirrors `elevenlabsService`), a JSONB `provider_config` column on `voice_presets` holding MiniMax-specific settings, a `minimax_cloned_voices` table, four new API routes under `src/app/api/video/minimax/`, a self-contained `MiniMaxVoicePanel` UI component, and a minimal `ProviderError` for friendly error codes. Credentials via env (`MINIMAX_API_KEY` + `MINIMAX_GROUP_ID`).

**Tech Stack:** Next.js 16 App Router (RSC default), React 19, TypeScript (strict, no `any`/enums/barrels), Supabase (Postgres + Storage), TanStack Query, Tailwind, Vitest.

## Global Constraints

- TypeScript: no `any` (use `unknown` + type guards), no enums (use `as const` / string-literal unions), no barrel `index.ts`, one primary component per file (PascalCase filename). Type assertions (`as X`) only with a `// Safe:` comment.
- Client Components require a `// Client Component: [reason]` comment above `"use client"`.
- No magic numbers/strings — extract to named constants.
- MiniMax T2A endpoint: `POST https://api.minimax.io/v1/t2a_v2?GroupId=<gid>`, headers `Authorization: Bearer <key>` + `Content-Type: application/json`, `output_format: "hex"`, `stream: false`. Response: `data.audio` (hex string), `extra_info.audio_length` (ms), `base_resp.status_code` (0 = success).
- MiniMax models allowed: `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo`. Default `speech-2.6-hd`.
- Audio output fixed to `mp3` (matches existing storage/pipeline `audio/mpeg`).
- MiniMax value ranges: speed 0.5–2.0, vol (0,10], pitch int -12..12, voice_modify fields -100..100.
- Test runner: `npm test` (Vitest, `vitest run`). Test files co-located under `__tests__/` next to source, `*.test.ts`.
- Commit messages end with the repo's trailer line; keep commits scoped per task.
- **Spec/plan docs are NOT committed alone** (user preference) — the spec + this plan get committed together with Task 1's code.

---

### Task 1: Provider types, unions, and config parser

Foundation: extend the `TtsProvider` union, add MiniMax type unions, the `MiniMaxProviderConfig` shape, and a pure parser/defaults module (the one unit-testable deliverable of this task).

**Files:**
- Modify: `src/services/scriptPrompt.ts:1-2` (unions) and `providerFormattingInstructions` (add minimax branch)
- Modify: `src/features/video/types.ts` (add MiniMax types, extend `VoicePreset`)
- Create: `src/features/video/providerConfig.ts`
- Test: `src/features/video/__tests__/providerConfig.test.ts`

**Interfaces:**
- Produces (from `scriptPrompt.ts`):
  ```ts
  export type TtsProvider = "vbee" | "elevenlabs" | "minimax";
  export type MiniMaxModel = "speech-2.6-hd" | "speech-2.6-turbo" | "speech-02-hd" | "speech-02-turbo";
  export type MiniMaxEmotion = "happy" | "sad" | "angry" | "fearful" | "disgusted" | "surprised" | "calm" | "fluent" | "whisper";
  export type MiniMaxSoundEffect = "spacious_echo" | "auditorium_echo" | "lofi_telephone" | "robotic";
  ```
- Produces (from `types.ts`): `MiniMaxAudioSetting`, `MiniMaxVoiceModify`, `MiniMaxProviderConfig`, `MiniMaxVoice`, `MiniMaxClonedVoice`; `VoicePreset.provider_config`.
- Produces (from `providerConfig.ts`): `defaultMiniMaxConfig(): MiniMaxProviderConfig`, `parseMiniMaxConfig(json: unknown): MiniMaxProviderConfig | null`.

- [ ] **Step 1: Extend unions in `scriptPrompt.ts`**

Replace line 1:
```ts
export type TtsProvider = "vbee" | "elevenlabs" | "minimax";
export type ElevenLabsModel = "eleven_v3" | "eleven_flash_v2_5";
export type MiniMaxModel =
  | "speech-2.6-hd"
  | "speech-2.6-turbo"
  | "speech-02-hd"
  | "speech-02-turbo";
export type MiniMaxEmotion =
  | "happy" | "sad" | "angry" | "fearful" | "disgusted"
  | "surprised" | "calm" | "fluent" | "whisper";
export type MiniMaxSoundEffect =
  | "spacious_echo" | "auditorium_echo" | "lofi_telephone" | "robotic";
```

Add a minimax branch inside `providerFormattingInstructions` (before the final `// vbee` block, after the elevenlabs blocks):
```ts
  if (ttsProvider === "minimax") {
    return [
      "KỸ THUẬT NHẤN NHÁ (MiniMax TTS):",
      "- Dùng dấu câu tự nhiên; chèn khoảng nghỉ tùy chỉnh bằng cú pháp <#số_giây#>, ví dụ <#0.5#> nghỉ 0.5 giây",
      "- Dùng CHỮ HOA để nhấn từ quan trọng, câu ngắn tạo urgency",
    ].join("\n");
  }
```

- [ ] **Step 2: Add MiniMax types to `types.ts`**

At the top, the existing import stays:
```ts
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
```
Change it to also import the MiniMax unions:
```ts
import type {
  TtsProvider,
  ElevenLabsModel,
  MiniMaxModel,
  MiniMaxEmotion,
  MiniMaxSoundEffect,
} from "@/services/scriptPrompt";
```

Add these interfaces (place them near `VoicePreset`, before it):
```ts
export interface MiniMaxAudioSetting {
  format: "mp3";
  sampleRate: number; // 8000|16000|22050|24000|32000|44100
  bitrate: number;    // 32000|64000|128000|256000
  channel: 1 | 2;
}

export interface MiniMaxVoiceModify {
  pitch?: number;     // -100..100
  intensity?: number; // -100..100
  timbre?: number;    // -100..100
  soundEffects?: MiniMaxSoundEffect;
}

export interface MiniMaxProviderConfig {
  kind: "minimax";
  model: MiniMaxModel;
  emotion?: MiniMaxEmotion;
  vol?: number;                 // (0,10] default 1
  pitch?: number;               // -12..12 int default 0
  languageBoost?: string;       // default "Vietnamese"
  audio: MiniMaxAudioSetting;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[]; // ["từ/cách đọc", ...]
}

export interface MiniMaxVoice {
  voice_id: string;
  name: string;
  category: "system" | "cloned";
}

export interface MiniMaxClonedVoice {
  id: string;
  brand_id: string;
  voice_id: string;
  display_name: string;
  model: string;
  status: "pending" | "ready" | "failed";
  source_storage_path: string | null;
  preview_storage_path: string | null;
  created_at: string;
}
```

Extend `VoicePreset` (add one field after `elevenlabs_model`):
```ts
  elevenlabs_model: ElevenLabsModel | null;
  provider_config: MiniMaxProviderConfig | null;
  created_at: string;
```

- [ ] **Step 3: Write the failing test for the config parser**

Create `src/features/video/__tests__/providerConfig.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { defaultMiniMaxConfig, parseMiniMaxConfig } from "../providerConfig";

describe("defaultMiniMaxConfig", () => {
  it("returns a valid minimax config with sensible defaults", () => {
    const cfg = defaultMiniMaxConfig();
    expect(cfg.kind).toBe("minimax");
    expect(cfg.model).toBe("speech-2.6-hd");
    expect(cfg.audio).toEqual({ format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 });
    expect(cfg.languageBoost).toBe("Vietnamese");
  });
});

describe("parseMiniMaxConfig", () => {
  it("parses a full valid config", () => {
    const raw = {
      kind: "minimax",
      model: "speech-02-hd",
      emotion: "happy",
      vol: 2,
      pitch: 3,
      languageBoost: "English",
      audio: { format: "mp3", sampleRate: 44100, bitrate: 256000, channel: 2 },
      voiceModify: { timbre: 10, soundEffects: "robotic" },
      pronunciationDict: ["Ladospice/La đô spai"],
    };
    const cfg = parseMiniMaxConfig(raw);
    expect(cfg).not.toBeNull();
    expect(cfg?.model).toBe("speech-02-hd");
    expect(cfg?.voiceModify?.soundEffects).toBe("robotic");
    expect(cfg?.pronunciationDict).toEqual(["Ladospice/La đô spai"]);
  });

  it("returns null for non-object input", () => {
    expect(parseMiniMaxConfig(null)).toBeNull();
    expect(parseMiniMaxConfig("nope")).toBeNull();
    expect(parseMiniMaxConfig(42)).toBeNull();
  });

  it("returns null when model is not a known MiniMax model", () => {
    expect(parseMiniMaxConfig({ kind: "minimax", model: "gpt-4", audio: {} })).toBeNull();
  });

  it("fills default audio when audio fields are missing", () => {
    const cfg = parseMiniMaxConfig({ kind: "minimax", model: "speech-2.6-turbo" });
    expect(cfg?.audio).toEqual({ format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 });
  });

  it("drops an invalid emotion but keeps the config", () => {
    const cfg = parseMiniMaxConfig({ kind: "minimax", model: "speech-2.6-hd", emotion: "grumpy" });
    expect(cfg).not.toBeNull();
    expect(cfg?.emotion).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- src/features/video/__tests__/providerConfig.test.ts`
Expected: FAIL — cannot find module `../providerConfig`.

- [ ] **Step 5: Implement `providerConfig.ts`**

Create `src/features/video/providerConfig.ts`:
```ts
import type {
  MiniMaxProviderConfig,
  MiniMaxAudioSetting,
  MiniMaxVoiceModify,
} from "@/features/video/types";
import type {
  MiniMaxModel,
  MiniMaxEmotion,
  MiniMaxSoundEffect,
} from "@/services/scriptPrompt";

const MINIMAX_MODELS: readonly MiniMaxModel[] = [
  "speech-2.6-hd",
  "speech-2.6-turbo",
  "speech-02-hd",
  "speech-02-turbo",
];
const MINIMAX_EMOTIONS: readonly MiniMaxEmotion[] = [
  "happy", "sad", "angry", "fearful", "disgusted",
  "surprised", "calm", "fluent", "whisper",
];
const MINIMAX_SOUND_EFFECTS: readonly MiniMaxSoundEffect[] = [
  "spacious_echo", "auditorium_echo", "lofi_telephone", "robotic",
];

const DEFAULT_AUDIO: MiniMaxAudioSetting = {
  format: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channel: 1,
};
const DEFAULT_LANGUAGE_BOOST = "Vietnamese";
const DEFAULT_MODEL: MiniMaxModel = "speech-2.6-hd";

export function defaultMiniMaxConfig(): MiniMaxProviderConfig {
  return {
    kind: "minimax",
    model: DEFAULT_MODEL,
    languageBoost: DEFAULT_LANGUAGE_BOOST,
    audio: { ...DEFAULT_AUDIO },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAudio(raw: unknown): MiniMaxAudioSetting {
  if (!isRecord(raw)) return { ...DEFAULT_AUDIO };
  return {
    format: "mp3",
    sampleRate: typeof raw.sampleRate === "number" ? raw.sampleRate : DEFAULT_AUDIO.sampleRate,
    bitrate: typeof raw.bitrate === "number" ? raw.bitrate : DEFAULT_AUDIO.bitrate,
    channel: raw.channel === 2 ? 2 : 1,
  };
}

function parseVoiceModify(raw: unknown): MiniMaxVoiceModify | undefined {
  if (!isRecord(raw)) return undefined;
  const out: MiniMaxVoiceModify = {};
  if (typeof raw.pitch === "number") out.pitch = raw.pitch;
  if (typeof raw.intensity === "number") out.intensity = raw.intensity;
  if (typeof raw.timbre === "number") out.timbre = raw.timbre;
  if (
    typeof raw.soundEffects === "string" &&
    MINIMAX_SOUND_EFFECTS.includes(raw.soundEffects as MiniMaxSoundEffect)
  ) {
    // Safe: membership checked against MINIMAX_SOUND_EFFECTS above
    out.soundEffects = raw.soundEffects as MiniMaxSoundEffect;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseMiniMaxConfig(json: unknown): MiniMaxProviderConfig | null {
  if (!isRecord(json)) return null;
  if (typeof json.model !== "string" || !MINIMAX_MODELS.includes(json.model as MiniMaxModel)) {
    return null;
  }
  // Safe: membership checked against MINIMAX_MODELS above
  const model = json.model as MiniMaxModel;

  const config: MiniMaxProviderConfig = {
    kind: "minimax",
    model,
    audio: parseAudio(json.audio),
    languageBoost:
      typeof json.languageBoost === "string" ? json.languageBoost : DEFAULT_LANGUAGE_BOOST,
  };

  if (
    typeof json.emotion === "string" &&
    MINIMAX_EMOTIONS.includes(json.emotion as MiniMaxEmotion)
  ) {
    // Safe: membership checked against MINIMAX_EMOTIONS above
    config.emotion = json.emotion as MiniMaxEmotion;
  }
  if (typeof json.vol === "number") config.vol = json.vol;
  if (typeof json.pitch === "number") config.pitch = json.pitch;

  const voiceModify = parseVoiceModify(json.voiceModify);
  if (voiceModify) config.voiceModify = voiceModify;

  if (Array.isArray(json.pronunciationDict)) {
    const dict = json.pronunciationDict.filter((x): x is string => typeof x === "string");
    if (dict.length > 0) config.pronunciationDict = dict;
  }

  return config;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- src/features/video/__tests__/providerConfig.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit (includes spec + this plan)**

```bash
git add src/services/scriptPrompt.ts src/features/video/types.ts \
  src/features/video/providerConfig.ts src/features/video/__tests__/providerConfig.test.ts \
  docs/superpowers/specs/2026-07-02-minimax-voice-provider-design.md \
  docs/superpowers/plans/2026-07-02-minimax-voice-provider.md
git commit -m "feat(video): add MiniMax provider types + config parser"
```

---

### Task 2: Database migration + env + credentials

DB schema for the new provider and the env-based credential resolver.

**Files:**
- Create: `supabase/migrations/17_minimax_provider.sql`
- Modify: `src/lib/key-provider.ts`
- Modify: `.env.example:23-27`, `.env.local.template` (TTS section)

**Interfaces:**
- Consumes: `ProviderError` (Task 3 — but to avoid ordering coupling, this task adds `getMiniMaxCredentials` throwing a plain `Error`; Task 3 upgrades it to `ProviderError`). To keep the plan linear, **Task 3 is implemented before this task's `getMiniMaxCredentials` is used by any route**, so here we already import `ProviderError`. If implementing strictly in order, do Task 3 first. (See note in Step 2.)
- Produces: `ApiKeyProvider` includes `"minimax"`; `getMiniMaxCredentials(): { apiKey: string; groupId: string }`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/17_minimax_provider.sql`:
```sql
-- supabase/migrations/17_minimax_provider.sql
BEGIN;

-- 1. Widen provider CHECK constraints to include 'minimax'
ALTER TABLE public.voice_presets DROP CONSTRAINT IF EXISTS voice_presets_provider_check;
ALTER TABLE public.voice_presets
  ADD CONSTRAINT voice_presets_provider_check
  CHECK (provider IN ('vbee', 'elevenlabs', 'minimax'));

ALTER TABLE public.generated_audios DROP CONSTRAINT IF EXISTS generated_audios_provider_check;
ALTER TABLE public.generated_audios
  ADD CONSTRAINT generated_audios_provider_check
  CHECK (provider IN ('vbee', 'elevenlabs', 'minimax'));

-- 2. Provider-specific config blob (used by MiniMax; nullable, does not affect existing rows)
ALTER TABLE public.voice_presets ADD COLUMN IF NOT EXISTS provider_config JSONB;

-- 3. Per-brand MiniMax cloned voices
CREATE TABLE IF NOT EXISTS public.minimax_cloned_voices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  voice_id             TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  model                TEXT NOT NULL DEFAULT 'speech-2.6-hd',
  status               TEXT NOT NULL DEFAULT 'ready'
                         CHECK (status IN ('pending', 'ready', 'failed')),
  source_storage_path  TEXT,
  preview_storage_path TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, voice_id)
);

ALTER TABLE public.minimax_cloned_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY minimax_cloned_voices_owner ON public.minimax_cloned_voices
  USING (EXISTS (SELECT 1 FROM public.brands b
                 WHERE b.id = brand_id AND b.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b
                 WHERE b.id = brand_id AND b.owner_user_id = auth.uid()));

COMMIT;
```

Note: the `DROP CONSTRAINT IF EXISTS ... voice_presets_provider_check` uses Postgres's default auto-generated name for the inline CHECK created in migration 15 (`<table>_<column>_check`).

- [ ] **Step 2: Apply the migration locally and verify**

Run (whichever the project uses):
```bash
npx supabase db push
```
Expected: migration `17_minimax_provider.sql` applied with no error. Verify constraint:
```bash
npx supabase db execute "select conname from pg_constraint where conname = 'voice_presets_provider_check';"
```
Expected: one row.

> If the project applies migrations against the hosted Supabase via MCP instead, apply `17_minimax_provider.sql` through the `apply_migration` tool. Confirm `minimax_cloned_voices` appears in `list_tables`.

- [ ] **Step 3: Extend `key-provider.ts`**

Change line 3 and the map, and add the credentials helper. Replace lines 3-11:
```ts
export type ApiKeyProvider =
  | "anthropic" | "google" | "kie" | "openai" | "vbee" | "minimax";

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  kie: "KIE_API_KEY",
  openai: "OPENAI_API_KEY",
  vbee: "VBEE_API_KEY",
  minimax: "MINIMAX_API_KEY",
};
```

Add at the end of the file (after `clearAllKeyCache`), importing `ProviderError` at the top (`import { ProviderError } from "@/services/providerError";` — created in Task 3):
```ts
export function getMiniMaxCredentials(): { apiKey: string; groupId: string } {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) {
    throw new ProviderError("minimax", "key_missing", 400);
  }
  return { apiKey, groupId };
}
```

- [ ] **Step 4: Update env docs**

In `.env.example`, under the TTS section (after line 27, the ElevenLabs line):
```
# MiniMax Audio TTS — provider = minimax (needs BOTH key and group id)
MINIMAX_API_KEY=your-minimax-api-key-here
MINIMAX_GROUP_ID=your-minimax-group-id-here
```
Add the same two lines to the TTS section of `.env.local.template`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (requires Task 3's `providerError.ts` to exist — implement Task 3 first if going strictly in order).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/17_minimax_provider.sql src/lib/key-provider.ts .env.example .env.local.template
git commit -m "feat(video): MiniMax DB migration + env credentials"
```

---

### Task 3: ProviderError + handleApiError branch

Minimal friendly-error type so MiniMax failures surface as `minimax_<kind>` codes instead of `internal`. **Implement before Task 2's `getMiniMaxCredentials` usage.**

**Files:**
- Create: `src/services/providerError.ts`
- Modify: `src/lib/user-context.ts:30-39` (`handleApiError`)
- Test: `src/services/__tests__/providerError.test.ts`

**Interfaces:**
- Produces: `ProviderErrorKind`, `class ProviderError`, `providerErrorStatus(kind): number`, `mapMiniMaxStatusCode(code: number | undefined): ProviderErrorKind`.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/providerError.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  ProviderError,
  providerErrorStatus,
  mapMiniMaxStatusCode,
} from "../providerError";

describe("providerErrorStatus", () => {
  it("maps each kind to its HTTP status", () => {
    expect(providerErrorStatus("quota_exceeded")).toBe(402);
    expect(providerErrorStatus("invalid_key")).toBe(401);
    expect(providerErrorStatus("key_missing")).toBe(400);
    expect(providerErrorStatus("rate_limited")).toBe(429);
    expect(providerErrorStatus("unknown")).toBe(502);
  });
});

describe("ProviderError", () => {
  it("builds a default message of <provider>_<kind>", () => {
    const err = new ProviderError("minimax", "invalid_key", 401);
    expect(err.message).toBe("minimax_invalid_key");
    expect(err.provider).toBe("minimax");
    expect(err.kind).toBe("invalid_key");
    expect(err.httpStatus).toBe(401);
  });
});

describe("mapMiniMaxStatusCode", () => {
  it("maps known MiniMax status codes", () => {
    expect(mapMiniMaxStatusCode(1004)).toBe("invalid_key");
    expect(mapMiniMaxStatusCode(1002)).toBe("rate_limited");
    expect(mapMiniMaxStatusCode(1039)).toBe("rate_limited");
    expect(mapMiniMaxStatusCode(2038)).toBe("quota_exceeded");
    expect(mapMiniMaxStatusCode(2013)).toBe("unknown");
    expect(mapMiniMaxStatusCode(undefined)).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/__tests__/providerError.test.ts`
Expected: FAIL — cannot find module `../providerError`.

- [ ] **Step 3: Implement `providerError.ts`**

Create `src/services/providerError.ts`:
```ts
import type { ApiKeyProvider } from "@/lib/key-provider";

export type ProviderErrorKind =
  | "quota_exceeded"
  | "invalid_key"
  | "key_missing"
  | "rate_limited"
  | "unknown";

const KIND_STATUS: Record<ProviderErrorKind, number> = {
  quota_exceeded: 402,
  invalid_key: 401,
  key_missing: 400,
  rate_limited: 429,
  unknown: 502,
};

export function providerErrorStatus(kind: ProviderErrorKind): number {
  return KIND_STATUS[kind];
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: ApiKeyProvider,
    public readonly kind: ProviderErrorKind,
    public readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? `${provider}_${kind}`);
    this.name = "ProviderError";
  }
}

export function mapMiniMaxStatusCode(code: number | undefined): ProviderErrorKind {
  switch (code) {
    case 1004:
      return "invalid_key";
    case 1002:
    case 1039:
      return "rate_limited";
    case 2038:
      return "quota_exceeded";
    default:
      return "unknown";
  }
}
```

Note: `import type { ApiKeyProvider }` is erased at build time, so it does not pull `server-only` into this module.

- [ ] **Step 4: Wire `handleApiError`**

In `src/lib/user-context.ts`, add the import at the top:
```ts
import { ProviderError } from "@/services/providerError";
```
In `handleApiError`, add a branch before the `ApiError` check (or right after it, before the fallback):
```ts
export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ProviderError) {
    return NextResponse.json({ error: `${e.provider}_${e.kind}` }, { status: e.httpStatus });
  }
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: e.code, ...(e.details ? { details: e.details } : {}) },
      { status: e.status },
    );
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "internal" }, { status: 500 });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/services/__tests__/providerError.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/providerError.ts src/services/__tests__/providerError.test.ts src/lib/user-context.ts
git commit -m "feat(video): add ProviderError for friendly provider error codes"
```

---

### Task 4: MiniMaxService — synthesize

The T2A client method: build the request body, POST, classify errors, hex-decode audio, compute duration.

**Files:**
- Create: `src/services/minimaxService.ts`
- Test: `src/services/__tests__/minimaxService.synthesize.test.ts`

**Interfaces:**
- Consumes: `ProviderError`, `mapMiniMaxStatusCode`, `providerErrorStatus` (Task 3); `MiniMaxModel`, `MiniMaxEmotion` (Task 1); `MiniMaxAudioSetting`, `MiniMaxVoiceModify` (Task 1).
- Produces:
  ```ts
  export interface MiniMaxTTSRequest {
    text: string;
    voiceId: string;
    model: MiniMaxModel;
    speed?: number;
    vol?: number;
    pitch?: number;
    emotion?: MiniMaxEmotion;
    languageBoost?: string;
    audio: MiniMaxAudioSetting;
    voiceModify?: MiniMaxVoiceModify;
    pronunciationDict?: string[];
  }
  export interface MiniMaxSynthesisResult { audio: ArrayBuffer; durationSecs: number; }
  export class MiniMaxService {
    constructor(apiKey: string, groupId: string);
    synthesize(req: MiniMaxTTSRequest): Promise<MiniMaxSynthesisResult>;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/minimaxService.synthesize.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { MiniMaxService } from "../minimaxService";

function hexOf(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

afterEach(() => vi.restoreAllMocks());

describe("MiniMaxService.synthesize", () => {
  it("posts a correct body and decodes hex audio", async () => {
    const audioHex = hexOf([1, 2, 3, 255]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { audio: audioHex, status: 2 },
        extra_info: { audio_length: 2500 },
        base_resp: { status_code: 0, status_msg: "success" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("key-123", "group-9");
    const result = await svc.synthesize({
      text: "Xin chào",
      voiceId: "Vietnamese_Male_1",
      model: "speech-2.6-hd",
      speed: 1.2,
      vol: 2,
      pitch: 3,
      emotion: "happy",
      languageBoost: "Vietnamese",
      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
    });

    expect(new Uint8Array(result.audio)).toEqual(new Uint8Array([1, 2, 3, 255]));
    expect(result.durationSecs).toBe(2.5);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/t2a_v2?GroupId=group-9");
    expect(init.headers.Authorization).toBe("Bearer key-123");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("speech-2.6-hd");
    expect(body.output_format).toBe("hex");
    expect(body.voice_setting).toMatchObject({
      voice_id: "Vietnamese_Male_1",
      speed: 1.2,
      vol: 2,
      pitch: 3,
      emotion: "happy",
    });
    expect(body.audio_setting).toEqual({
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    });
  });

  it("includes voice_modify and pronunciation_dict only when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { audio: "00", status: 2 },
        extra_info: { audio_length: 1000 },
        base_resp: { status_code: 0 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await svc.synthesize({
      text: "t",
      voiceId: "v",
      model: "speech-2.6-hd",
      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      voiceModify: { timbre: 10, soundEffects: "robotic" },
      pronunciationDict: ["Ladospice/La đô spai"],
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.voice_modify).toEqual({ timbre: 10, sound_effects: "robotic" });
    expect(body.pronunciation_dict).toEqual({ tone: ["Ladospice/La đô spai"] });
  });

  it("throws ProviderError invalid_key when base_resp.status_code is 1004", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base_resp: { status_code: 1004, status_msg: "auth failed" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await expect(
      svc.synthesize({
        text: "t",
        voiceId: "v",
        model: "speech-2.6-hd",
        audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      }),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "invalid_key", httpStatus: 401 });
  });

  it("throws ProviderError invalid_key on HTTP 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await expect(
      svc.synthesize({
        text: "t",
        voiceId: "v",
        model: "speech-2.6-hd",
        audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      }),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "invalid_key" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/__tests__/minimaxService.synthesize.test.ts`
Expected: FAIL — cannot find module `../minimaxService`.

- [ ] **Step 3: Implement `minimaxService.ts` (synthesize + shared plumbing)**

Create `src/services/minimaxService.ts`:
```ts
import type {
  MiniMaxModel,
  MiniMaxEmotion,
} from "@/services/scriptPrompt";
import type {
  MiniMaxAudioSetting,
  MiniMaxVoiceModify,
} from "@/features/video/types";
import {
  ProviderError,
  providerErrorStatus,
  mapMiniMaxStatusCode,
} from "@/services/providerError";

const MINIMAX_API_BASE = "https://api.minimax.io";
const SYNTHESIZE_TIMEOUT_MS = 60_000;

export interface MiniMaxTTSRequest {
  text: string;
  voiceId: string;
  model: MiniMaxModel;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: MiniMaxEmotion;
  languageBoost?: string;
  audio: MiniMaxAudioSetting;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[];
}

export interface MiniMaxSynthesisResult {
  audio: ArrayBuffer;
  durationSecs: number;
}

interface MiniMaxBaseResp {
  status_code?: number;
  status_msg?: string;
}

interface MiniMaxT2AResponse {
  data?: { audio?: string; status?: number };
  extra_info?: { audio_length?: number };
  base_resp?: MiniMaxBaseResp;
}

export class MiniMaxService {
  constructor(
    private readonly apiKey: string,
    private readonly groupId: string,
  ) {}

  private url(path: string): string {
    return `${MINIMAX_API_BASE}${path}?GroupId=${encodeURIComponent(this.groupId)}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private httpStatusToKind(status: number): "invalid_key" | "rate_limited" | "unknown" {
    if (status === 401 || status === 403) return "invalid_key";
    if (status === 429) return "rate_limited";
    return "unknown";
  }

  async synthesize(req: MiniMaxTTSRequest): Promise<MiniMaxSynthesisResult> {
    const body: Record<string, unknown> = {
      model: req.model,
      text: req.text,
      stream: false,
      output_format: "hex",
      language_boost: req.languageBoost ?? "auto",
      voice_setting: {
        voice_id: req.voiceId,
        speed: req.speed ?? 1.0,
        vol: req.vol ?? 1.0,
        pitch: req.pitch ?? 0,
        ...(req.emotion ? { emotion: req.emotion } : {}),
      },
      audio_setting: {
        sample_rate: req.audio.sampleRate,
        bitrate: req.audio.bitrate,
        format: req.audio.format,
        channel: req.audio.channel,
      },
    };

    if (req.voiceModify) {
      const vm: Record<string, unknown> = {};
      if (typeof req.voiceModify.pitch === "number") vm.pitch = req.voiceModify.pitch;
      if (typeof req.voiceModify.intensity === "number") vm.intensity = req.voiceModify.intensity;
      if (typeof req.voiceModify.timbre === "number") vm.timbre = req.voiceModify.timbre;
      if (req.voiceModify.soundEffects) vm.sound_effects = req.voiceModify.soundEffects;
      if (Object.keys(vm).length > 0) body.voice_modify = vm;
    }
    if (req.pronunciationDict && req.pronunciationDict.length > 0) {
      body.pronunciation_dict = { tone: req.pronunciationDict };
    }

    const res = await fetch(this.url("/v1/t2a_v2"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SYNTHESIZE_TIMEOUT_MS),
    });

    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }

    // Safe: MiniMax T2A always returns a JSON object with base_resp
    const json = (await res.json()) as MiniMaxT2AResponse;
    const statusCode = json.base_resp?.status_code;
    if (statusCode !== 0) {
      const kind = mapMiniMaxStatusCode(statusCode);
      throw new ProviderError(
        "minimax",
        kind,
        providerErrorStatus(kind),
        json.base_resp?.status_msg,
      );
    }

    const hex = json.data?.audio;
    if (!hex) {
      throw new ProviderError("minimax", "unknown", providerErrorStatus("unknown"), "empty audio");
    }
    const buffer = Buffer.from(hex, "hex");
    const audio = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const durationSecs = (json.extra_info?.audio_length ?? 0) / 1000;
    return { audio, durationSecs };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/services/__tests__/minimaxService.synthesize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/minimaxService.ts src/services/__tests__/minimaxService.synthesize.test.ts
git commit -m "feat(video): MiniMaxService.synthesize (T2A hex decode + error mapping)"
```

---

### Task 5: MiniMaxService — listVoices, uploadFile, cloneVoice

Add the voice-listing and cloning methods to the existing service.

**Files:**
- Modify: `src/services/minimaxService.ts`
- Test: `src/services/__tests__/minimaxService.voices.test.ts`

**Interfaces:**
- Produces (added to `MiniMaxService`):
  ```ts
  export interface MiniMaxVoiceItem { voice_id: string; name: string; category: "system" | "cloned"; }
  export interface MiniMaxCloneVoiceInput {
    fileId: number; voiceId: string; model: MiniMaxModel;
    needNoiseReduction?: boolean; accuracy?: number; previewText?: string; languageBoost?: string;
  }
  // MiniMaxService methods:
  listVoices(): Promise<MiniMaxVoiceItem[]>;
  uploadFile(file: ArrayBuffer, filename: string): Promise<number>;
  cloneVoice(input: MiniMaxCloneVoiceInput): Promise<{ demoAudioUrl?: string }>;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/minimaxService.voices.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { MiniMaxService } from "../minimaxService";

afterEach(() => vi.restoreAllMocks());

describe("MiniMaxService.listVoices", () => {
  it("merges system_voice and voice_cloning into a flat list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        system_voice: [
          { voice_id: "Wise_Woman", voice_name: "Wise Woman" },
          { voice_id: "Calm_Man", voice_name: "Calm Man" },
        ],
        voice_cloning: [{ voice_id: "brandvoice01", description: "Brand voice" }],
        base_resp: { status_code: 0 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    const voices = await svc.listVoices();
    expect(voices).toEqual([
      { voice_id: "Wise_Woman", name: "Wise Woman", category: "system" },
      { voice_id: "Calm_Man", name: "Calm Man", category: "system" },
      { voice_id: "brandvoice01", name: "Brand voice", category: "cloned" },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/get_voice?GroupId=g");
  });
});

describe("MiniMaxService.uploadFile", () => {
  it("posts multipart and returns file_id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ file: { file_id: 987654 }, base_resp: { status_code: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    const fileId = await svc.uploadFile(new Uint8Array([1, 2, 3]).buffer, "sample.mp3");
    expect(fileId).toBe(987654);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/files/upload?GroupId=g");
    expect(init.body).toBeInstanceOf(FormData);
    // Authorization present but NOT Content-Type (browser/undici sets multipart boundary)
    expect(init.headers.Authorization).toBe("Bearer k");
    expect(init.headers["Content-Type"]).toBeUndefined();
  });
});

describe("MiniMaxService.cloneVoice", () => {
  it("posts clone request and returns demo audio url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ demo_audio: "https://x/demo.mp3", base_resp: { status_code: 0 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    const out = await svc.cloneVoice({
      fileId: 111,
      voiceId: "brandvoice01",
      model: "speech-2.6-hd",
      needNoiseReduction: true,
    });
    expect(out.demoAudioUrl).toBe("https://x/demo.mp3");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      file_id: 111,
      voice_id: "brandvoice01",
      model: "speech-2.6-hd",
      need_noise_reduction: true,
    });
  });

  it("throws ProviderError when clone base_resp indicates failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base_resp: { status_code: 2038, status_msg: "no permission" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const svc = new MiniMaxService("k", "g");
    await expect(
      svc.cloneVoice({ fileId: 1, voiceId: "brandvoice01", model: "speech-2.6-hd" }),
    ).rejects.toMatchObject({ name: "ProviderError", kind: "quota_exceeded" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/__tests__/minimaxService.voices.test.ts`
Expected: FAIL — `listVoices`/`uploadFile`/`cloneVoice` are not functions.

- [ ] **Step 3: Add the methods and types to `minimaxService.ts`**

Add these constants near the top (after `SYNTHESIZE_TIMEOUT_MS`):
```ts
const VOICES_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const CLONE_TIMEOUT_MS = 120_000;
```

Add these exported types (below `MiniMaxSynthesisResult`):
```ts
export interface MiniMaxVoiceItem {
  voice_id: string;
  name: string;
  category: "system" | "cloned";
}

export interface MiniMaxCloneVoiceInput {
  fileId: number;
  voiceId: string;
  model: MiniMaxModel;
  needNoiseReduction?: boolean;
  accuracy?: number;
  previewText?: string;
  languageBoost?: string;
}

interface MiniMaxVoiceRaw {
  voice_id?: string;
  voice_name?: string;
  description?: string;
}

interface MiniMaxGetVoiceResponse {
  system_voice?: MiniMaxVoiceRaw[];
  voice_cloning?: MiniMaxVoiceRaw[];
  base_resp?: MiniMaxBaseResp;
}
```

Add these methods inside the `MiniMaxService` class (after `synthesize`):
```ts
  async listVoices(): Promise<MiniMaxVoiceItem[]> {
    const res = await fetch(this.url("/v1/get_voice"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ voice_type: "all" }),
      signal: AbortSignal.timeout(VOICES_TIMEOUT_MS),
    });
    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }
    // Safe: get_voice returns an object with optional voice arrays
    const json = (await res.json()) as MiniMaxGetVoiceResponse;
    const system = (json.system_voice ?? []).map((v): MiniMaxVoiceItem => ({
      voice_id: v.voice_id ?? "",
      name: v.voice_name ?? v.description ?? v.voice_id ?? "",
      category: "system",
    }));
    const cloned = (json.voice_cloning ?? []).map((v): MiniMaxVoiceItem => ({
      voice_id: v.voice_id ?? "",
      name: v.voice_name ?? v.description ?? v.voice_id ?? "",
      category: "cloned",
    }));
    return [...system, ...cloned].filter((v) => v.voice_id.length > 0);
  }

  async uploadFile(file: ArrayBuffer, filename: string): Promise<number> {
    const form = new FormData();
    form.append("purpose", "voice_clone");
    form.append("file", new Blob([file]), filename);

    const res = await fetch(this.url("/v1/files/upload"), {
      method: "POST",
      // NOTE: do NOT set Content-Type — fetch sets the multipart boundary itself
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }
    // Safe: files/upload returns { file: { file_id } } on success
    const json = (await res.json()) as {
      file?: { file_id?: number };
      base_resp?: MiniMaxBaseResp;
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      const kind = mapMiniMaxStatusCode(json.base_resp.status_code);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind), json.base_resp.status_msg);
    }
    const fileId = json.file?.file_id;
    if (typeof fileId !== "number") {
      throw new ProviderError("minimax", "unknown", providerErrorStatus("unknown"), "no file_id");
    }
    return fileId;
  }

  async cloneVoice(input: MiniMaxCloneVoiceInput): Promise<{ demoAudioUrl?: string }> {
    const body: Record<string, unknown> = {
      file_id: input.fileId,
      voice_id: input.voiceId,
      model: input.model,
    };
    if (input.needNoiseReduction !== undefined) body.need_noise_reduction = input.needNoiseReduction;
    if (input.accuracy !== undefined) body.accuracy = input.accuracy;
    if (input.previewText) body.text = input.previewText;
    if (input.languageBoost) body.language_boost = input.languageBoost;

    const res = await fetch(this.url("/v1/voice_clone"), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CLONE_TIMEOUT_MS),
    });
    if (!res.ok) {
      const kind = this.httpStatusToKind(res.status);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind));
    }
    // Safe: voice_clone returns { demo_audio?, base_resp }
    const json = (await res.json()) as {
      demo_audio?: string;
      base_resp?: MiniMaxBaseResp;
    };
    if (json.base_resp && json.base_resp.status_code !== 0) {
      const kind = mapMiniMaxStatusCode(json.base_resp.status_code);
      throw new ProviderError("minimax", kind, providerErrorStatus(kind), json.base_resp.status_msg);
    }
    return { demoAudioUrl: json.demo_audio };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/services/__tests__/minimaxService.voices.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/minimaxService.ts src/services/__tests__/minimaxService.voices.test.ts
git commit -m "feat(video): MiniMaxService listVoices + uploadFile + cloneVoice"
```

---

### Task 6: MiniMaxClonedVoiceService (DB CRUD)

Service to persist and read cloned voices, following the `VoicePresetService` pattern.

**Files:**
- Create: `src/services/minimaxClonedVoiceService.ts`
- Test: `src/services/__tests__/minimaxClonedVoiceService.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface CreateClonedVoiceInput {
    brandId: string; voiceId: string; displayName: string; model: string;
    status?: "pending" | "ready" | "failed";
    sourceStoragePath?: string | null; previewStoragePath?: string | null;
  }
  export class MiniMaxClonedVoiceService {
    constructor(supabase: SupabaseClient);
    listByBrand(brandId: string): Promise<MiniMaxClonedVoice[]>;
    create(input: CreateClonedVoiceInput): Promise<MiniMaxClonedVoice>;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/minimaxClonedVoiceService.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { MiniMaxClonedVoiceService } from "../minimaxClonedVoiceService";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("MiniMaxClonedVoiceService.create", () => {
  it("inserts a row with mapped column names", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "row-1", brand_id: "b1", voice_id: "brandvoice01" },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new MiniMaxClonedVoiceService(supabase);
    const row = await svc.create({
      brandId: "b1",
      voiceId: "brandvoice01",
      displayName: "Brand Voice",
      model: "speech-2.6-hd",
      sourceStoragePath: "clone-src/b1/x.mp3",
    });

    expect(from).toHaveBeenCalledWith("minimax_cloned_voices");
    expect(insert).toHaveBeenCalledWith({
      brand_id: "b1",
      voice_id: "brandvoice01",
      display_name: "Brand Voice",
      model: "speech-2.6-hd",
      status: "ready",
      source_storage_path: "clone-src/b1/x.mp3",
      preview_storage_path: null,
    });
    expect(row.id).toBe("row-1");
  });

  it("throws on supabase error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new MiniMaxClonedVoiceService(supabase);
    await expect(
      svc.create({ brandId: "b1", voiceId: "v", displayName: "d", model: "speech-2.6-hd" }),
    ).rejects.toThrow("boom");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/__tests__/minimaxClonedVoiceService.test.ts`
Expected: FAIL — cannot find module `../minimaxClonedVoiceService`.

- [ ] **Step 3: Implement the service**

Create `src/services/minimaxClonedVoiceService.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MiniMaxClonedVoice } from "@/features/video/types";

export interface CreateClonedVoiceInput {
  brandId: string;
  voiceId: string;
  displayName: string;
  model: string;
  status?: "pending" | "ready" | "failed";
  sourceStoragePath?: string | null;
  previewStoragePath?: string | null;
}

export class MiniMaxClonedVoiceService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByBrand(brandId: string): Promise<MiniMaxClonedVoice[]> {
    const { data, error } = await this.supabase
      .from("minimax_cloned_voices")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns minimax_cloned_voices rows matching MiniMaxClonedVoice
    return (data ?? []) as MiniMaxClonedVoice[];
  }

  async create(input: CreateClonedVoiceInput): Promise<MiniMaxClonedVoice> {
    const { data, error } = await this.supabase
      .from("minimax_cloned_voices")
      .insert({
        brand_id: input.brandId,
        voice_id: input.voiceId,
        display_name: input.displayName,
        model: input.model,
        status: input.status ?? "ready",
        source_storage_path: input.sourceStoragePath ?? null,
        preview_storage_path: input.previewStoragePath ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the inserted minimax_cloned_voices row
    return data as MiniMaxClonedVoice;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/services/__tests__/minimaxClonedVoiceService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/minimaxClonedVoiceService.ts src/services/__tests__/minimaxClonedVoiceService.test.ts
git commit -m "feat(video): MiniMaxClonedVoiceService CRUD"
```

---

### Task 7: Persist provider_config in voice presets

Wire the JSONB `provider_config` through the preset service and POST route so MiniMax presets save their config.

**Files:**
- Modify: `src/services/voicePresetService.ts:5-17` (input), `:34-56` (create insert)
- Modify: `src/app/api/video/voice-presets/route.ts:25-87`
- Test: `src/services/__tests__/voicePresetService.test.ts`

**Interfaces:**
- Consumes: `MiniMaxProviderConfig` (Task 1).
- Produces: `CreateVoicePresetInput.providerConfig?: MiniMaxProviderConfig | null`; POST route accepts `provider: "minimax"` + `providerConfig`.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/voicePresetService.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { VoicePresetService } from "../voicePresetService";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("VoicePresetService.create", () => {
  it("persists provider_config for a minimax preset", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "p1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new VoicePresetService(supabase);
    await svc.create({
      brandId: "b1",
      displayName: "MM preset",
      voiceCode: "",
      speed: 1.1,
      pitch: 1.0,
      stability: 0.5,
      provider: "minimax",
      providerVoiceId: "Wise_Woman",
      elevenLabsModel: null,
      providerConfig: {
        kind: "minimax",
        model: "speech-2.6-hd",
        audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
      },
    });

    const inserted = insert.mock.calls[0][0];
    expect(inserted.provider).toBe("minimax");
    expect(inserted.provider_voice_id).toBe("Wise_Woman");
    expect(inserted.provider_config).toEqual({
      kind: "minimax",
      model: "speech-2.6-hd",
      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
    });
  });

  it("writes null provider_config for non-minimax presets", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "p2" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    const svc = new VoicePresetService(supabase);
    await svc.create({
      brandId: "b1",
      displayName: "Vbee preset",
      voiceCode: "hn_male",
      speed: 1,
      pitch: 1,
      stability: 0.5,
      provider: "vbee",
      providerVoiceId: null,
      elevenLabsModel: null,
    });
    expect(insert.mock.calls[0][0].provider_config).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/services/__tests__/voicePresetService.test.ts`
Expected: FAIL — `providerConfig` not accepted / `provider_config` not inserted.

- [ ] **Step 3: Extend `voicePresetService.ts`**

Add the import at the top:
```ts
import type { VoicePreset, MiniMaxProviderConfig } from "@/features/video/types";
```
Add to `CreateVoicePresetInput` (after `elevenLabsModel`):
```ts
  elevenLabsModel: ElevenLabsModel | null;
  providerConfig?: MiniMaxProviderConfig | null;
```
In `create`, add to the `.insert({...})` object (after `elevenlabs_model`):
```ts
        elevenlabs_model: input.elevenLabsModel,
        provider_config: input.providerConfig ?? null,
```

- [ ] **Step 4: Update the POST route**

In `src/app/api/video/voice-presets/route.ts`, extend the body type and provider handling. Replace the body type (lines 29-41) to add `providerConfig`:
```ts
    const body = await request.json() as {
      brandId?: string;
      displayName?: string;
      voiceCode?: string;
      speed?: number;
      pitch?: number;
      stability?: number;
      pauseConfig?: Record<string, unknown> | null;
      isDefault?: boolean;
      provider?: string;
      providerVoiceId?: string | null;
      elevenLabsModel?: string | null;
      providerConfig?: unknown;
    };
```
Replace the provider resolution + validation (lines 50-64) with:
```ts
    const provider: TtsProvider =
      body.provider === "elevenlabs" || body.provider === "minimax"
        ? body.provider
        : "vbee";

    if (provider === "vbee" && !body.voiceCode) {
      return NextResponse.json(
        { error: "voiceCode is required for vbee provider" },
        { status: 400 },
      );
    }

    if ((provider === "elevenlabs" || provider === "minimax") && !body.providerVoiceId) {
      return NextResponse.json(
        { error: "providerVoiceId is required for this provider" },
        { status: 400 },
      );
    }
```
Add the config parse before `service.create` (import at top):
```ts
import { parseMiniMaxConfig } from "@/features/video/providerConfig";
```
and inside POST, before the `service.create` call:
```ts
    const providerConfig =
      provider === "minimax" ? parseMiniMaxConfig(body.providerConfig) : null;
```
Then add to the `service.create({...})` args (after `elevenLabsModel`):
```ts
      // Safe: validated against CHECK constraint in DB; unknown strings are rejected at the DB level
      elevenLabsModel: (body.elevenLabsModel as ElevenLabsModel | null) ?? null,
      providerConfig,
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/services/__tests__/voicePresetService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/voicePresetService.ts src/services/__tests__/voicePresetService.test.ts src/app/api/video/voice-presets/route.ts
git commit -m "feat(video): persist MiniMax provider_config on voice presets"
```

---

### Task 8: MiniMax branch in the audio generation route

Wire MiniMax synthesis into the main `POST /api/video/audio` route.

**Files:**
- Modify: `src/app/api/video/audio/route.ts:79-135`
- Test: `src/app/api/video/__tests__/minimax-audio.test.ts`

**Interfaces:**
- Consumes: `MiniMaxService` (Task 4), `getMiniMaxCredentials` (Task 2), `parseMiniMaxConfig`/`defaultMiniMaxConfig` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `src/app/api/video/__tests__/minimax-audio.test.ts`. This test mocks the collaborators and drives the POST handler:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const synthesizeMock = vi.fn();
const uploadMock = vi.fn().mockResolvedValue("audio/b1/s1/1.mp3");
const createAudioMock = vi.fn().mockResolvedValue({ id: "a1" });

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === "brand_scripts"
              ? { data: { final_text: "Xin chào", raw_text: null, brand_id: "b1" }, error: null }
              : {
                  data: {
                    provider: "minimax",
                    provider_voice_id: "Wise_Woman",
                    speed: 1.1,
                    provider_config: {
                      kind: "minimax",
                      model: "speech-2.6-hd",
                      audio: { format: "mp3", sampleRate: 32000, bitrate: 128000, channel: 1 },
                    },
                  },
                  error: null,
                },
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
  getUserApiKey: async () => "vbee-key",
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    synthesize = synthesizeMock;
  },
}));
vi.mock("@/services/storageService", () => ({
  StorageService: class {
    upload = uploadMock;
  },
}));
vi.mock("@/services/generatedAudioService", () => ({
  GeneratedAudioService: class {
    create = createAudioMock;
  },
}));

import { POST } from "../audio/route";

function makeReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  synthesizeMock.mockReset();
  createAudioMock.mockClear();
});

describe("POST /api/video/audio — minimax", () => {
  it("synthesizes via MiniMax and stores a minimax audio row", async () => {
    synthesizeMock.mockResolvedValue({
      audio: new Uint8Array([1, 2, 3]).buffer,
      durationSecs: 2.5,
    });

    const res = await POST(makeReq({ scriptId: "s1", voicePresetId: "vp1" }));
    expect(res.status).toBe(201);
    expect(synthesizeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Xin chào",
        voiceId: "Wise_Woman",
        model: "speech-2.6-hd",
        speed: 1.1,
      }),
    );
    expect(createAudioMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "minimax", durationSecs: 2.5 }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/app/api/video/__tests__/minimax-audio.test.ts`
Expected: FAIL — no `minimax` branch, `synthesizeMock` not called.

- [ ] **Step 3: Add the MiniMax branch**

In `src/app/api/video/audio/route.ts`, insert a branch between the `elevenlabs` block (ends line 101) and the `else` Vbee block (line 102). Change `} else {` to `} else if (typedPreset.provider === "minimax") { ... } else {`:
```ts
    } else if (typedPreset.provider === "minimax") {
      if (!typedPreset.provider_voice_id) {
        return NextResponse.json({ error: "minimax_voice_id_missing" }, { status: 400 });
      }
      const { getMiniMaxCredentials } = await import("@/lib/key-provider");
      const { apiKey, groupId } = getMiniMaxCredentials();
      const { MiniMaxService } = await import("@/services/minimaxService");
      const { parseMiniMaxConfig, defaultMiniMaxConfig } = await import(
        "@/features/video/providerConfig"
      );
      const cfg = parseMiniMaxConfig(typedPreset.provider_config) ?? defaultMiniMaxConfig();
      const result = await new MiniMaxService(apiKey, groupId).synthesize({
        text: textToSpeak,
        voiceId: typedPreset.provider_voice_id,
        model: cfg.model,
        speed: typedPreset.speed,
        vol: cfg.vol,
        pitch: cfg.pitch,
        emotion: cfg.emotion,
        languageBoost: cfg.languageBoost,
        audio: cfg.audio,
        voiceModify: cfg.voiceModify,
        pronunciationDict: cfg.pronunciationDict,
      });
      audioBuffer = result.audio;
      durationSecs = result.durationSecs;
    } else {
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/app/api/video/__tests__/minimax-audio.test.ts`
Expected: PASS.

> If the mock chain for Supabase differs from other route tests in `src/app/api/__tests__/`, mirror the pattern used there (e.g. `save-ad.test.ts`) — the shape above assumes `.from().select().eq().single()`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/video/audio/route.ts src/app/api/video/__tests__/minimax-audio.test.ts
git commit -m "feat(video): MiniMax branch in audio generation route"
```

---

### Task 9: MiniMax voices route

`GET /api/video/minimax/voices?brandId=…` returns system voices merged with the brand's cloned voices.

**Files:**
- Create: `src/app/api/video/minimax/voices/route.ts`
- Test: `src/app/api/video/__tests__/minimax-voices.test.ts`

**Interfaces:**
- Consumes: `MiniMaxService.listVoices` (Task 5), `getMiniMaxCredentials` (Task 2), `MiniMaxClonedVoiceService.listByBrand` (Task 6).
- Produces: JSON `{ voices: MiniMaxVoice[] }` (system voices from the API + `{ voice_id, name, category: "cloned" }` from DB, de-duplicated by `voice_id`).

- [ ] **Step 1: Write the failing test**

Create `src/app/api/video/__tests__/minimax-voices.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    listVoices = async () => [{ voice_id: "Wise_Woman", name: "Wise Woman", category: "system" }];
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/services/minimaxClonedVoiceService", () => ({
  MiniMaxClonedVoiceService: class {
    listByBrand = async () => [
      { voice_id: "brandvoice01", display_name: "Brand Voice" },
    ];
  },
}));

import { GET } from "../minimax/voices/route";

function makeReq(url: string) {
  return { url } as unknown as Parameters<typeof GET>[0];
}

describe("GET /api/video/minimax/voices", () => {
  it("returns system voices plus the brand's cloned voices", async () => {
    const res = await GET(makeReq("http://x/api/video/minimax/voices?brandId=b1"));
    const json = await res.json();
    expect(json.voices).toEqual([
      { voice_id: "Wise_Woman", name: "Wise Woman", category: "system" },
      { voice_id: "brandvoice01", name: "Brand Voice", category: "cloned" },
    ]);
  });

  it("400s when brandId is missing", async () => {
    const res = await GET(makeReq("http://x/api/video/minimax/voices"));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/app/api/video/__tests__/minimax-voices.test.ts`
Expected: FAIL — cannot find module `../minimax/voices/route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/video/minimax/voices/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getMiniMaxCredentials } from "@/lib/key-provider";
import { MiniMaxService } from "@/services/minimaxService";
import { MiniMaxClonedVoiceService } from "@/services/minimaxClonedVoiceService";
import type { MiniMaxVoice } from "@/features/video/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const { apiKey, groupId } = getMiniMaxCredentials();
    const systemVoices = await new MiniMaxService(apiKey, groupId).listVoices();

    const supabase = await createClient();
    const clonedRows = await new MiniMaxClonedVoiceService(supabase).listByBrand(brandId);
    const clonedVoices: MiniMaxVoice[] = clonedRows.map((row) => ({
      voice_id: row.voice_id,
      name: row.display_name,
      category: "cloned",
    }));

    const seen = new Set(clonedVoices.map((v) => v.voice_id));
    const merged: MiniMaxVoice[] = [
      ...systemVoices.filter((v) => !seen.has(v.voice_id)),
      ...clonedVoices,
    ];

    return NextResponse.json({ voices: merged });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/app/api/video/__tests__/minimax-voices.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/video/minimax/voices/route.ts src/app/api/video/__tests__/minimax-voices.test.ts
git commit -m "feat(video): MiniMax voices route (system + cloned)"
```

---

### Task 10: MiniMax preview route

`POST /api/video/minimax/preview` — short synthesis returning a base64 data URI.

**Files:**
- Create: `src/app/api/video/minimax/preview/route.ts`
- Test: `src/app/api/video/__tests__/minimax-preview.test.ts`

**Interfaces:**
- Consumes: `MiniMaxService.synthesize` (Task 4), `getMiniMaxCredentials` (Task 2), `defaultMiniMaxConfig` (Task 1).
- Produces: JSON `{ audioUrl: "data:audio/mpeg;base64,…" }`.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/video/__tests__/minimax-preview.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";

const synthesizeMock = vi.fn().mockResolvedValue({
  audio: new Uint8Array([10, 20, 30]).buffer,
  durationSecs: 1,
});

vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    synthesize = synthesizeMock;
  },
}));

import { POST } from "../minimax/preview/route";

function makeReq(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/video/minimax/preview", () => {
  it("returns a base64 data URI", async () => {
    const res = await POST(
      makeReq({ voice_id: "Wise_Woman", text: "Xin chào", model: "speech-2.6-hd" }),
    );
    const json = await res.json();
    expect(json.audioUrl).toBe(`data:audio/mpeg;base64,${Buffer.from([10, 20, 30]).toString("base64")}`);
  });

  it("400s when voice_id or text is missing", async () => {
    const res = await POST(makeReq({ text: "" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/app/api/video/__tests__/minimax-preview.test.ts`
Expected: FAIL — cannot find module `../minimax/preview/route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/video/minimax/preview/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getMiniMaxCredentials } from "@/lib/key-provider";
import { MiniMaxService } from "@/services/minimaxService";
import { defaultMiniMaxConfig } from "@/features/video/providerConfig";
import type { MiniMaxModel, MiniMaxEmotion } from "@/services/scriptPrompt";
import type { MiniMaxVoiceModify } from "@/features/video/types";

const PREVIEW_TEXT_MAX_LENGTH = 500;

interface PreviewRequest {
  voice_id?: string;
  text?: string;
  model?: MiniMaxModel;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: MiniMaxEmotion;
  languageBoost?: string;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(request);
    // Safe: request.json() returns the parsed POST body
    const body = (await request.json()) as PreviewRequest;

    if (!body.voice_id || !body.text?.trim()) {
      return NextResponse.json({ error: "voice_id and text are required" }, { status: 400 });
    }
    if (body.text.length > PREVIEW_TEXT_MAX_LENGTH) {
      return NextResponse.json({ error: "text too long (max 500 chars)" }, { status: 400 });
    }

    const { apiKey, groupId } = getMiniMaxCredentials();
    const defaults = defaultMiniMaxConfig();
    const service = new MiniMaxService(apiKey, groupId);
    const result = await service.synthesize({
      text: body.text,
      voiceId: body.voice_id,
      model: body.model ?? defaults.model,
      speed: body.speed,
      vol: body.vol,
      pitch: body.pitch,
      emotion: body.emotion,
      languageBoost: body.languageBoost ?? defaults.languageBoost,
      audio: defaults.audio,
      voiceModify: body.voiceModify,
      pronunciationDict: body.pronunciationDict,
    });

    const base64 = Buffer.from(result.audio).toString("base64");
    return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/app/api/video/__tests__/minimax-preview.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/video/minimax/preview/route.ts src/app/api/video/__tests__/minimax-preview.test.ts
git commit -m "feat(video): MiniMax preview route"
```

---

### Task 11: MiniMax clone route

`POST /api/video/minimax/clone` — multipart upload → MiniMax file upload → clone → store audio + DB row.

**Files:**
- Create: `src/app/api/video/minimax/clone/route.ts`
- Test: `src/app/api/video/__tests__/minimax-clone.test.ts`

**Interfaces:**
- Consumes: `MiniMaxService.uploadFile` + `cloneVoice` (Task 5), `getMiniMaxCredentials` (Task 2), `StorageService.upload` (existing), `MiniMaxClonedVoiceService.create` (Task 6).
- Produces: JSON `{ voice: MiniMaxClonedVoice, demoAudioUrl?: string }`.

**Constants (validation):** `MAX_CLONE_BYTES = 20 * 1024 * 1024`, allowed MIME `["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/wave", "audio/x-wav"]`, `VOICE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/`.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/video/__tests__/minimax-clone.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";

const uploadFileMock = vi.fn().mockResolvedValue(555);
const cloneVoiceMock = vi.fn().mockResolvedValue({ demoAudioUrl: "https://x/demo.mp3" });
const storageUploadMock = vi.fn().mockResolvedValue("clone-src/b1/x.mp3");
const createRowMock = vi.fn().mockResolvedValue({ id: "cv1", voice_id: "brandvoice01" });

vi.mock("@/lib/user-context", async (orig) => {
  const actual = await orig<typeof import("@/lib/user-context")>();
  return { ...actual, requireUser: async () => ({ userId: "u1" }) };
});
vi.mock("@/lib/key-provider", () => ({
  getMiniMaxCredentials: () => ({ apiKey: "k", groupId: "g" }),
}));
vi.mock("@/services/minimaxService", () => ({
  MiniMaxService: class {
    uploadFile = uploadFileMock;
    cloneVoice = cloneVoiceMock;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/services/storageService", () => ({
  StorageService: class {
    upload = storageUploadMock;
  },
}));
vi.mock("@/services/minimaxClonedVoiceService", () => ({
  MiniMaxClonedVoiceService: class {
    create = createRowMock;
  },
}));

import { POST } from "../minimax/clone/route";

function makeReq(form: FormData) {
  return { formData: async () => form } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/video/minimax/clone", () => {
  it("uploads, clones, and stores a row", async () => {
    const form = new FormData();
    form.append("brandId", "b1");
    form.append("displayName", "Brand Voice");
    form.append("voiceId", "brandvoice01");
    form.append("model", "speech-2.6-hd");
    form.append("file", new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }), "s.mp3");

    const res = await POST(makeReq(form));
    expect(res.status).toBe(201);
    expect(uploadFileMock).toHaveBeenCalled();
    expect(cloneVoiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 555, voiceId: "brandvoice01", model: "speech-2.6-hd" }),
    );
    expect(createRowMock).toHaveBeenCalledWith(
      expect.objectContaining({ brandId: "b1", voiceId: "brandvoice01" }),
    );
  });

  it("rejects an invalid voiceId", async () => {
    const form = new FormData();
    form.append("brandId", "b1");
    form.append("displayName", "d");
    form.append("voiceId", "bad"); // too short / fails regex
    form.append("file", new Blob([new Uint8Array([1])], { type: "audio/mpeg" }), "s.mp3");
    const res = await POST(makeReq(form));
    expect(res.status).toBe(400);
  });

  it("rejects a non-audio file", async () => {
    const form = new FormData();
    form.append("brandId", "b1");
    form.append("displayName", "d");
    form.append("voiceId", "brandvoice01");
    form.append("file", new Blob([new Uint8Array([1])], { type: "text/plain" }), "s.txt");
    const res = await POST(makeReq(form));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/app/api/video/__tests__/minimax-clone.test.ts`
Expected: FAIL — cannot find module `../minimax/clone/route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/video/minimax/clone/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getMiniMaxCredentials } from "@/lib/key-provider";
import { MiniMaxService } from "@/services/minimaxService";
import { StorageService } from "@/services/storageService";
import { MiniMaxClonedVoiceService } from "@/services/minimaxClonedVoiceService";
import type { MiniMaxModel } from "@/services/scriptPrompt";

const MAX_CLONE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
];
const VOICE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{6,254}[A-Za-z0-9]$/;
const VALID_MODELS: readonly MiniMaxModel[] = [
  "speech-2.6-hd",
  "speech-2.6-turbo",
  "speech-02-hd",
  "speech-02-turbo",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireUser(request);
    const form = await request.formData();
    const brandId = form.get("brandId");
    const displayName = form.get("displayName");
    const voiceId = form.get("voiceId");
    const modelRaw = form.get("model");
    const file = form.get("file");

    if (typeof brandId !== "string" || typeof displayName !== "string" || typeof voiceId !== "string") {
      return NextResponse.json({ error: "brandId, displayName, voiceId are required" }, { status: 400 });
    }
    if (!VOICE_ID_RE.test(voiceId)) {
      return NextResponse.json({ error: "invalid_voice_id" }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "invalid_audio_format" }, { status: 400 });
    }
    if (file.size > MAX_CLONE_BYTES) {
      return NextResponse.json({ error: "file too large (max 20MB)" }, { status: 400 });
    }
    const model: MiniMaxModel =
      typeof modelRaw === "string" && VALID_MODELS.includes(modelRaw as MiniMaxModel)
        ? // Safe: membership checked against VALID_MODELS
          (modelRaw as MiniMaxModel)
        : "speech-2.6-hd";

    const arrayBuffer = await file.arrayBuffer();
    const filename = file instanceof File ? file.name : "clone-source";

    const { apiKey, groupId } = getMiniMaxCredentials();
    const service = new MiniMaxService(apiKey, groupId);
    const fileId = await service.uploadFile(arrayBuffer, filename);
    const clone = await service.cloneVoice({ fileId, voiceId, model, needNoiseReduction: true });

    const supabase = await createClient();
    const storage = new StorageService(supabase);
    const sourcePath = `clone-src/${brandId}/${voiceId}.mp3`;
    await storage.upload("generated-audio", sourcePath, arrayBuffer, file.type);

    const clonedService = new MiniMaxClonedVoiceService(supabase);
    const voice = await clonedService.create({
      brandId,
      voiceId,
      displayName,
      model,
      status: "ready",
      sourceStoragePath: sourcePath,
    });

    return NextResponse.json({ voice, demoAudioUrl: clone.demoAudioUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/app/api/video/__tests__/minimax-clone.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/video/minimax/clone/route.ts src/app/api/video/__tests__/minimax-clone.test.ts
git commit -m "feat(video): MiniMax voice clone route"
```

---

### Task 12: React Query hooks

Add MiniMax hooks and extend the create-preset hook input.

**Files:**
- Modify: `src/hooks/api/useVoicePresets.ts`
- Test: `src/hooks/api/__tests__/useVoicePresets.minimax.test.ts`

**Interfaces:**
- Consumes: `MiniMaxVoice`, `MiniMaxProviderConfig` (Task 1).
- Produces: `useMiniMaxVoices(brandId, enabled)`, `useMiniMaxPreview()`, `useCloneMiniMaxVoice()`; `useCreateVoicePreset` input gains `providerConfig?: MiniMaxProviderConfig | null`.

- [ ] **Step 1: Write the failing test (payload shape)**

Create `src/hooks/api/__tests__/useVoicePresets.minimax.test.ts`. This verifies the preview hook builds the right request via a mocked `apiFetch`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const apiFetchMock = vi.fn().mockResolvedValue({ audioUrl: "data:audio/mpeg;base64,AAAA" });
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => apiFetchMock(...args) }));

import { buildMiniMaxPreviewBody } from "../useVoicePresets";

beforeEach(() => apiFetchMock.mockClear());

describe("buildMiniMaxPreviewBody", () => {
  it("maps camelCase input to the route's snake/nested body", () => {
    const body = buildMiniMaxPreviewBody({
      voiceId: "Wise_Woman",
      text: "Xin chào",
      model: "speech-2.6-hd",
      speed: 1.1,
      vol: 2,
      pitch: 3,
      emotion: "happy",
      languageBoost: "Vietnamese",
    });
    expect(body).toEqual({
      voice_id: "Wise_Woman",
      text: "Xin chào",
      model: "speech-2.6-hd",
      speed: 1.1,
      vol: 2,
      pitch: 3,
      emotion: "happy",
      languageBoost: "Vietnamese",
      voiceModify: undefined,
      pronunciationDict: undefined,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/hooks/api/__tests__/useVoicePresets.minimax.test.ts`
Expected: FAIL — `buildMiniMaxPreviewBody` not exported.

- [ ] **Step 3: Extend `useVoicePresets.ts`**

Update the type imports at the top:
```ts
import type { VoicePreset, VbeeVoice, VoiceAvgRating, ElevenLabsVoice, MiniMaxVoice, MiniMaxProviderConfig } from "@/features/video/types";
import type { TtsProvider, ElevenLabsModel, MiniMaxModel, MiniMaxEmotion } from "@/services/scriptPrompt";
import type { MiniMaxVoiceModify } from "@/features/video/types";
```
Add a stale constant next to the others:
```ts
const MINIMAX_VOICES_STALE_MS = 10 * 60 * 1000;
```
Extend `useCreateVoicePreset`'s mutation input (add after `elevenLabsModel`):
```ts
      elevenLabsModel?: ElevenLabsModel | null;
      providerConfig?: MiniMaxProviderConfig | null;
```
Add these exports at the end of the file:
```ts
export interface MiniMaxPreviewInput {
  voiceId: string;
  text: string;
  model?: MiniMaxModel;
  speed?: number;
  vol?: number;
  pitch?: number;
  emotion?: MiniMaxEmotion;
  languageBoost?: string;
  voiceModify?: MiniMaxVoiceModify;
  pronunciationDict?: string[];
}

export function buildMiniMaxPreviewBody(input: MiniMaxPreviewInput): Record<string, unknown> {
  return {
    voice_id: input.voiceId,
    text: input.text,
    model: input.model,
    speed: input.speed,
    vol: input.vol,
    pitch: input.pitch,
    emotion: input.emotion,
    languageBoost: input.languageBoost,
    voiceModify: input.voiceModify,
    pronunciationDict: input.pronunciationDict,
  };
}

export function useMiniMaxVoices(brandId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["minimax-voices", brandId],
    queryFn: () =>
      apiFetch<{ voices: MiniMaxVoice[] }>(`/api/video/minimax/voices?brandId=${brandId}`),
    select: (d) => d.voices,
    staleTime: MINIMAX_VOICES_STALE_MS,
    enabled: enabled && !!brandId,
  });
}

export function useMiniMaxPreview() {
  return useMutation({
    mutationFn: (input: MiniMaxPreviewInput) =>
      apiFetch<{ audioUrl: string }>("/api/video/minimax/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildMiniMaxPreviewBody(input)),
      }),
  });
}

export function useCloneMiniMaxVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      brandId: string;
      displayName: string;
      voiceId: string;
      model: MiniMaxModel;
      file: File;
    }) => {
      const form = new FormData();
      form.append("brandId", input.brandId);
      form.append("displayName", input.displayName);
      form.append("voiceId", input.voiceId);
      form.append("model", input.model);
      form.append("file", input.file);
      return apiFetch<{ voice: { id: string; voice_id: string }; demoAudioUrl?: string }>(
        "/api/video/minimax/clone",
        { method: "POST", body: form },
      );
    },
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: ["minimax-voices", brandId] });
    },
  });
}
```

> Note: `apiFetch` must forward a `FormData` body without forcing a JSON `content-type`. If `apiFetch` always sets `content-type: application/json`, check its implementation in `src/lib/api.ts` first; when the body is `FormData`, omit the JSON content-type so the browser sets the multipart boundary. Adjust `apiFetch` if needed (small change), and note it in the commit.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/hooks/api/__tests__/useVoicePresets.minimax.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/api/useVoicePresets.ts src/hooks/api/__tests__/useVoicePresets.minimax.test.ts
git commit -m "feat(video): MiniMax voice hooks (voices, preview, clone)"
```

---

### Task 13: MiniMaxVoicePanel component

Self-contained MiniMax tab UI (keeps the already-large `voice-config/page.tsx` from growing further). Holds all MiniMax state, renders the voice picker + config controls + clone section, and saves a preset.

**Files:**
- Create: `src/features/video/components/MiniMaxVoicePanel.tsx`
- Modify: `src/features/video/constants.ts` — create if absent (option lists)

**Interfaces:**
- Consumes: `useMiniMaxVoices`, `useMiniMaxPreview`, `useCloneMiniMaxVoice`, `useCreateVoicePreset` (Task 12); `MiniMaxProviderConfig` (Task 1).
- Produces: `export function MiniMaxVoicePanel({ brandId }: MiniMaxVoicePanelProps)`.

- [ ] **Step 1: Create the option constants**

Create (or add to) `src/features/video/minimaxOptions.ts`:
```ts
import type { MiniMaxModel, MiniMaxEmotion, MiniMaxSoundEffect } from "@/services/scriptPrompt";

export const MINIMAX_MODEL_OPTIONS: { value: MiniMaxModel; label: string }[] = [
  { value: "speech-2.6-hd", label: "2.6 HD (chất lượng cao)" },
  { value: "speech-2.6-turbo", label: "2.6 Turbo (nhanh, rẻ)" },
  { value: "speech-02-hd", label: "02 HD" },
  { value: "speech-02-turbo", label: "02 Turbo" },
];

export const MINIMAX_EMOTION_OPTIONS: { value: MiniMaxEmotion; label: string }[] = [
  { value: "calm", label: "Bình thản" },
  { value: "happy", label: "Vui vẻ" },
  { value: "sad", label: "Buồn" },
  { value: "angry", label: "Giận dữ" },
  { value: "fearful", label: "Sợ hãi" },
  { value: "disgusted", label: "Ghê tởm" },
  { value: "surprised", label: "Ngạc nhiên" },
  { value: "fluent", label: "Trôi chảy" },
  { value: "whisper", label: "Thì thầm" },
];

export const MINIMAX_LANGUAGE_OPTIONS: string[] = [
  "Vietnamese", "auto", "English", "Chinese", "Japanese", "Korean", "Thai", "Indonesian",
];

export const MINIMAX_SOUND_EFFECT_OPTIONS: { value: MiniMaxSoundEffect; label: string }[] = [
  { value: "spacious_echo", label: "Vọng rộng" },
  { value: "auditorium_echo", label: "Khán phòng" },
  { value: "lofi_telephone", label: "Điện thoại lo-fi" },
  { value: "robotic", label: "Robot" },
];

export const MINIMAX_BITRATE_OPTIONS: number[] = [32000, 64000, 128000, 256000];
export const MINIMAX_SAMPLE_RATE_OPTIONS: number[] = [16000, 24000, 32000, 44100];

export const MINIMAX_SPEED_MIN = 0.5;
export const MINIMAX_SPEED_MAX = 2.0;
export const MINIMAX_SPEED_STEP = 0.1;
export const MINIMAX_VOL_MIN = 0.1;
export const MINIMAX_VOL_MAX = 10;
export const MINIMAX_VOL_STEP = 0.1;
export const MINIMAX_PITCH_MIN = -12;
export const MINIMAX_PITCH_MAX = 12;
export const MINIMAX_PITCH_STEP = 1;
export const MINIMAX_PREVIEW_TEXT_MAX_LENGTH = 500;
```

- [ ] **Step 2: Implement the component**

Create `src/features/video/components/MiniMaxVoicePanel.tsx`:
```tsx
// Client Component: MiniMax voice panel manages selection, config sliders, preview audio, clone upload
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  useMiniMaxVoices,
  useMiniMaxPreview,
  useCloneMiniMaxVoice,
  useCreateVoicePreset,
} from "@/hooks/api/useVoicePresets";
import type { MiniMaxModel, MiniMaxEmotion } from "@/services/scriptPrompt";
import type { MiniMaxProviderConfig } from "@/features/video/types";
import {
  MINIMAX_MODEL_OPTIONS,
  MINIMAX_EMOTION_OPTIONS,
  MINIMAX_LANGUAGE_OPTIONS,
  MINIMAX_SOUND_EFFECT_OPTIONS,
  MINIMAX_BITRATE_OPTIONS,
  MINIMAX_SAMPLE_RATE_OPTIONS,
  MINIMAX_SPEED_MIN,
  MINIMAX_SPEED_MAX,
  MINIMAX_SPEED_STEP,
  MINIMAX_VOL_MIN,
  MINIMAX_VOL_MAX,
  MINIMAX_VOL_STEP,
  MINIMAX_PITCH_MIN,
  MINIMAX_PITCH_MAX,
  MINIMAX_PITCH_STEP,
  MINIMAX_PREVIEW_TEXT_MAX_LENGTH,
} from "@/features/video/minimaxOptions";

const SAMPLE_TEXT =
  "Sản phẩm này đã thay đổi hoàn toàn cách tôi chăm sóc da. Chỉ sau 2 tuần, làn da trở nên mịn màng và sáng khỏe hơn rõ rệt.";
const PRESET_SAVED_FEEDBACK_MS = 2_000;
const DEFAULT_AUDIO: MiniMaxProviderConfig["audio"] = {
  format: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channel: 1,
};

export interface MiniMaxVoicePanelProps {
  brandId: string | null;
}

export function MiniMaxVoicePanel({ brandId }: MiniMaxVoicePanelProps) {
  const { data: voices = [], isLoading } = useMiniMaxVoices(brandId, true);
  const preview = useMiniMaxPreview();
  const cloneVoice = useCloneMiniMaxVoice();
  const createPreset = useCreateVoicePreset();

  const [voiceId, setVoiceId] = useState("");
  const [model, setModel] = useState<MiniMaxModel>("speech-2.6-hd");
  const [emotion, setEmotion] = useState<MiniMaxEmotion | "">("");
  const [languageBoost, setLanguageBoost] = useState("Vietnamese");
  const [speed, setSpeed] = useState(1.0);
  const [vol, setVol] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [bitrate, setBitrate] = useState(128000);
  const [sampleRate, setSampleRate] = useState(32000);

  const [timbre, setTimbre] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [soundEffect, setSoundEffect] = useState("");
  const [pronunciation, setPronunciation] = useState("");

  const [testText, setTestText] = useState(SAMPLE_TEXT);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetSaved, setPresetSaved] = useState(false);

  const [cloneName, setCloneName] = useState("");
  const [cloneVoiceId, setCloneVoiceId] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  function buildConfig(): MiniMaxProviderConfig {
    const pronDict = pronunciation
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.includes("/"));
    const voiceModify =
      timbre !== 0 || intensity !== 0 || soundEffect
        ? {
            ...(timbre !== 0 ? { timbre } : {}),
            ...(intensity !== 0 ? { intensity } : {}),
            // Safe: soundEffect is one of MINIMAX_SOUND_EFFECT_OPTIONS values or ""
            ...(soundEffect ? { soundEffects: soundEffect as MiniMaxProviderConfig["voiceModify"] extends infer T ? never : never } : {}),
          }
        : undefined;
    return {
      kind: "minimax",
      model,
      ...(emotion ? { emotion } : {}),
      vol,
      pitch,
      languageBoost,
      audio: { ...DEFAULT_AUDIO, bitrate, sampleRate },
      ...(voiceModify ? { voiceModify } : {}),
      ...(pronDict.length ? { pronunciationDict: pronDict } : {}),
    };
  }

  async function handlePreview() {
    if (!voiceId || !testText.trim()) return;
    setPreviewUrl(null);
    setPreviewError(null);
    try {
      const res = await preview.mutateAsync({
        voiceId,
        text: testText,
        model,
        speed,
        vol,
        pitch,
        emotion: emotion || undefined,
        languageBoost,
      });
      setPreviewUrl(res.audioUrl);
    } catch {
      setPreviewError("Không tạo được preview. Kiểm tra key MiniMax hoặc thử lại.");
    }
  }

  async function handleSavePreset() {
    if (!brandId || !voiceId || !presetName.trim()) return;
    await createPreset.mutateAsync({
      brandId,
      displayName: presetName.trim(),
      voiceCode: "",
      speed,
      pitch: 1.0,
      stability: 0.5,
      provider: "minimax",
      providerVoiceId: voiceId,
      providerConfig: buildConfig(),
    });
    setPresetSaved(true);
    setPresetName("");
    setTimeout(() => setPresetSaved(false), PRESET_SAVED_FEEDBACK_MS);
  }

  async function handleClone() {
    if (!brandId || !cloneFile || !cloneName.trim() || !cloneVoiceId.trim()) return;
    setCloneError(null);
    try {
      await cloneVoice.mutateAsync({
        brandId,
        displayName: cloneName.trim(),
        voiceId: cloneVoiceId.trim(),
        model,
        file: cloneFile,
      });
      setCloneName("");
      setCloneVoiceId("");
      setCloneFile(null);
    } catch {
      setCloneError("Clone thất bại. Kiểm tra file (10s–5 phút, ≤20MB) và voice_id (≥8 ký tự, bắt đầu bằng chữ).");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: voice picker + clone */}
      <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Chọn giọng MiniMax</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách giọng...
          </div>
        ) : (
          <div className="max-h-[40vh] space-y-1 overflow-y-auto">
            {voices.map((v) => (
              <button
                key={v.voice_id}
                type="button"
                onClick={() => setVoiceId(v.voice_id)}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors ${
                  voiceId === v.voice_id ? "bg-primary/10" : "hover:bg-black/[0.04]"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{v.name}</span>
                <span className="text-xs capitalize text-foreground-muted">{v.category}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-border/20 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Clone giọng riêng</h3>
          <p className="mb-2 text-xs text-foreground-subtle">Audio 10s–5 phút, ≤20MB (mp3/m4a/wav).</p>
          <input
            type="text"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="Tên hiển thị"
            className="mb-2 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={cloneVoiceId}
            onChange={(e) => setCloneVoiceId(e.target.value)}
            placeholder="voice_id (vd: brandvoice01)"
            className="mb-2 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav"
            onChange={(e) => setCloneFile(e.target.files?.[0] ?? null)}
            className="mb-2 w-full text-xs text-foreground-muted"
          />
          <button
            type="button"
            onClick={() => void handleClone()}
            disabled={cloneVoice.isPending || !cloneFile || !cloneName.trim() || !cloneVoiceId.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {cloneVoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clone giọng"}
          </button>
          {cloneError && <p className="mt-2 text-xs text-danger">{cloneError}</p>}
        </div>
      </div>

      {/* Right: config + preview + save */}
      <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Cấu hình MiniMax</h2>
        {!voiceId ? (
          <p className="text-sm text-foreground-muted">Chọn giọng từ danh sách bên trái để tiếp tục.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as MiniMaxModel)}
                className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                {MINIMAX_MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Cảm xúc</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value as MiniMaxEmotion | "")}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                  <option value="">(mặc định)</option>
                  {MINIMAX_EMOTION_OPTIONS.map((em) => (
                    <option key={em.value} value={em.value}>{em.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Ngôn ngữ</label>
                <select
                  value={languageBoost}
                  onChange={(e) => setLanguageBoost(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                  {MINIMAX_LANGUAGE_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Tốc độ: {speed.toFixed(1)}x</label>
                <input type="range" min={MINIMAX_SPEED_MIN} max={MINIMAX_SPEED_MAX} step={MINIMAX_SPEED_STEP}
                  value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Âm lượng: {vol.toFixed(1)}</label>
                <input type="range" min={MINIMAX_VOL_MIN} max={MINIMAX_VOL_MAX} step={MINIMAX_VOL_STEP}
                  value={vol} onChange={(e) => setVol(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Cao độ: {pitch}</label>
                <input type="range" min={MINIMAX_PITCH_MIN} max={MINIMAX_PITCH_MAX} step={MINIMAX_PITCH_STEP}
                  value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Bitrate</label>
                <select value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                  {MINIMAX_BITRATE_OPTIONS.map((b) => <option key={b} value={b}>{b / 1000} kbps</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Sample rate</label>
                <select value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                  {MINIMAX_SAMPLE_RATE_OPTIONS.map((s) => <option key={s} value={s}>{s} Hz</option>)}
                </select>
              </div>
            </div>

            <details className="rounded-xl border border-border/30 bg-background p-3">
              <summary className="cursor-pointer text-xs font-medium text-foreground-muted">Nâng cao (voice_modify, phát âm)</summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">Timbre: {timbre}</label>
                    <input type="range" min={-100} max={100} step={1} value={timbre}
                      onChange={(e) => setTimbre(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">Cường độ: {intensity}</label>
                    <input type="range" min={-100} max={100} step={1} value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-muted">Hiệu ứng âm thanh</label>
                  <select value={soundEffect} onChange={(e) => setSoundEffect(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                    <option value="">(không)</option>
                    {MINIMAX_SOUND_EFFECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-muted">Từ điển phát âm (mỗi dòng: từ/cách đọc)</label>
                  <textarea value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} rows={2}
                    placeholder="Ladospice/La đô spai"
                    className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none" />
                </div>
                <p className="text-[11px] text-foreground-subtle">Mẹo: chèn khoảng nghỉ trong kịch bản bằng cú pháp &lt;#0.5#&gt; (0.5 giây).</p>
              </div>
            </details>

            <div className="border-t border-border/20 pt-4">
              <label className="mb-1 block text-xs font-medium text-foreground-muted">Văn bản thử</label>
              <textarea value={testText} onChange={(e) => setTestText(e.target.value)} rows={3}
                maxLength={MINIMAX_PREVIEW_TEXT_MAX_LENGTH}
                className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button type="button" onClick={() => void handlePreview()}
                disabled={preview.isPending || !testText.trim()}
                className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50">
                {preview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {preview.isPending ? "Đang tạo..." : "Tạo preview"}
              </button>
              {previewError && <p className="mt-2 text-xs text-danger">{previewError}</p>}
              {previewUrl && (
                <div className="mt-2 rounded-xl border border-border/30 bg-background p-3">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              )}
            </div>

            <div className="border-t border-border/20 pt-4">
              <label className="mb-2 block text-xs font-medium text-foreground-muted">Tên preset</label>
              <div className="flex gap-2">
                <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
                  placeholder="VD: MiniMax nữ miền Nam"
                  className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                <button type="button" onClick={() => void handleSavePreset()}
                  disabled={createPreset.isPending || !presetName.trim() || !brandId}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50">
                  {createPreset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : presetSaved ? "Đã lưu" : "Lưu preset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

> **Fix the `soundEffects` cast before running the build.** The inline conditional above is a placeholder for the assignment — replace the whole `voiceModify` construction with a clearly-typed version:
> ```tsx
> import type { MiniMaxSoundEffect } from "@/services/scriptPrompt";
> // ...
> const voiceModify =
>   timbre !== 0 || intensity !== 0 || soundEffect
>     ? {
>         ...(timbre !== 0 ? { timbre } : {}),
>         ...(intensity !== 0 ? { intensity } : {}),
>         // Safe: soundEffect value comes from MINIMAX_SOUND_EFFECT_OPTIONS
>         ...(soundEffect ? { soundEffects: soundEffect as MiniMaxSoundEffect } : {}),
>       }
>     : undefined;
> ```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/features/video/minimaxOptions.ts src/features/video/components/MiniMaxVoicePanel.tsx
git commit -m "feat(video): MiniMaxVoicePanel UI component"
```

---

### Task 14: Wire MiniMax tab + ScriptEditor toggle

Render the panel behind a third tab in Voice Lab and add `minimax` to the script provider toggle.

**Files:**
- Modify: `src/app/app/video/voice-config/page.tsx:58` (`ActiveTab`), tab bar (lines 235-258), tab body (lines 260-672)
- Modify: `src/features/video/components/ScriptEditor.tsx:240` (provider toggle)

- [ ] **Step 1: Add the MiniMax tab type + button + render**

In `voice-config/page.tsx`:
- Import the panel near the other imports:
  ```ts
  import { MiniMaxVoicePanel } from "@/features/video/components/MiniMaxVoicePanel";
  ```
- Change `type ActiveTab = "vbee" | "elevenlabs";` to:
  ```ts
  type ActiveTab = "vbee" | "elevenlabs" | "minimax";
  ```
- Add a third tab button after the ElevenLabs button (after line 257):
  ```tsx
  <button
    type="button"
    onClick={() => setActiveTab("minimax")}
    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
      activeTab === "minimax"
        ? "bg-background text-foreground shadow-sm"
        : "text-foreground-muted hover:text-foreground"
    }`}
  >
    MiniMax
  </button>
  ```
- The body currently is `activeTab === "vbee" ? (<Vbee/>) : (<ElevenLabs/>)`. Convert to explicit branches so MiniMax renders its own panel. Wrap the existing ElevenLabs block: change the top-level ternary so that when `activeTab === "minimax"` the page renders `<MiniMaxVoicePanel brandId={selectedBrandId} />`. Concretely, replace the outer `{activeTab === "vbee" ? ( … Vbee … ) : ( … ElevenLabs … )}` with:
  ```tsx
  {activeTab === "vbee" ? (
    <> {/* existing Vbee block unchanged */} </>
  ) : activeTab === "elevenlabs" ? (
    <> {/* existing ElevenLabs block unchanged */} </>
  ) : (
    <MiniMaxVoicePanel brandId={selectedBrandId} />
  )}
  ```
  (Keep the existing Vbee and ElevenLabs JSX exactly as-is inside the first two branches.)

- [ ] **Step 2: Add minimax to the ScriptEditor provider toggle**

In `src/features/video/components/ScriptEditor.tsx`, change the toggle array (line 240) and label:
```tsx
{(["vbee", "elevenlabs", "minimax"] as TtsProvider[]).map((p) => (
```
and update the label expression (line 251):
```tsx
{p === "vbee" ? "Vbee" : p === "elevenlabs" ? "ElevenLabs" : "MiniMax"}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open `/app/video/voice-config`, click the **MiniMax** tab. With `MINIMAX_API_KEY` + `MINIMAX_GROUP_ID` set, the voice list loads; pick a voice, type text, click **Tạo preview** and confirm audio plays. Without keys set, confirm the friendly error appears (not a raw 500).

- [ ] **Step 5: Full test suite + commit**

Run: `npm test`
Expected: all tests pass.
```bash
git add src/app/app/video/voice-config/page.tsx src/features/video/components/ScriptEditor.tsx
git commit -m "feat(video): add MiniMax tab to Voice Lab + script provider toggle"
```

---

## Self-Review

**Spec coverage:**
- T2A full config (model, voice_id, speed, vol, pitch, emotion, language_boost, audio format/bitrate/sample_rate) → Tasks 1, 4, 13. ✓
- Advanced: pause markers (script syntax note in Task 1 + UI hint Task 13), voice_modify (Tasks 1/4/13), pronunciation_dict (Tasks 1/4/13). ✓
- Voice Cloning (upload→clone→store→list) → Tasks 5, 6, 9, 11, 13. ✓
- Credentials via env (`MINIMAX_API_KEY` + `MINIMAX_GROUP_ID`) → Task 2. ✓
- `provider_config` JSONB + `minimax_cloned_voices` table + widened CHECK → Task 2. ✓
- ProviderError friendly codes → Task 3, used in Tasks 4/5. ✓
- Audio route branch → Task 8. ✓
- Routes: voices/preview/clone → Tasks 9/10/11. ✓
- Types & wiring (scriptPrompt union, key-provider, types.ts, services) → Tasks 1/2/7. ✓
- Testing (unit + route) → each task's tests. ✓

**Placeholder scan:** One intentional inline placeholder in Task 13 Step 2 (`soundEffects` cast) is explicitly called out with a corrected replacement block immediately after — resolve it during implementation. No other TBD/TODO.

**Type consistency:** `MiniMaxProviderConfig`, `MiniMaxTTSRequest`, `MiniMaxVoiceItem`/`MiniMaxVoice`, `parseMiniMaxConfig`, `defaultMiniMaxConfig`, `getMiniMaxCredentials`, `ProviderError` used with consistent signatures across tasks. `MiniMaxVoiceItem` (service) and `MiniMaxVoice` (feature type) are intentionally the same shape; routes return `MiniMaxVoice`.

**Ordering note:** Task 3 (`providerError.ts`) must be implemented before Task 2's `getMiniMaxCredentials` and Task 4's service compile. Recommended order: 1 → 3 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14.

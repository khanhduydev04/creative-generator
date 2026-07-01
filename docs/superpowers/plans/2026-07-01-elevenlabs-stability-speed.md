# ElevenLabs Stability + Speed Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stability and Speed controls to the ElevenLabs tab of the Voice Lab page, model-aware (v3: 3-preset Stability + no Speed; v2.5 Flash: continuous sliders for both), persisted to `voice_presets`, applied when generating real audio, and previewable before saving.

**Architecture:** A new `stability` column on `voice_presets` flows from a new UI control → `useCreateVoicePreset` hook → `POST /api/video/voice-presets` → `VoicePresetService.create()` → DB. Generating real audio (`POST /api/video/audio`) reads `stability`/`speed` off the preset and passes them to the already-capable `ElevenLabsService.synthesize()`, omitting `speed` for the v3 model (unsupported by ElevenLabs' real API). A new preview endpoint (`POST /api/video/elevenlabs/preview`) lets the user hear the effect before saving, mirroring the existing Vbee preview endpoint but returning a base64 data URL instead of uploading anywhere.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres), TanStack React Query, Tailwind CSS, Vitest.

## Global Constraints

- No `any`; type assertions require a `// Safe:` comment explaining why.
- No barrel `index.ts` files.
- v3 model (`eleven_v3`): Stability only takes 3 discrete values `0` / `0.5` / `1.0` (labels "Creative" / "Natural" / "Robust"); Speed control must not be shown and must not be sent to the ElevenLabs API for this model.
- v2.5 Flash model (`eleven_flash_v2_5`): Stability is a continuous slider 0.0–1.0 (step 0.05); Speed is a continuous slider 0.7–1.2 (step 0.05) — this range is specific to ElevenLabs and different from Vbee's 0.5–2.0 range.
- ElevenLabs tab state (`elStability`, `elSpeed`, preview state) must be fully separate from the Vbee tab's shared `speed`/`pitch`/`previewUrl` state — do not reuse those.
- Preview audio is returned as a base64 data URL, never uploaded to Supabase Storage (it's disposable, not a saved asset).
- `pitch` is not part of the ElevenLabs API — when saving an ElevenLabs preset, send a fixed `1.0`, not the Vbee tab's shared `pitch` state.
- Run tests with `npx vitest run <path>`. If you see "Vitest failed to find the runner" or all files failing, that's a known stale-cache issue — run `rm -rf node_modules/.vite node_modules/.vitest` once and retry before concluding anything is broken.
- This repo has no dedicated hook-test or component-test convention (no jsdom/RTL wiring in `vitest.config.ts`) — hooks and the final UI task are verified without a new automated test, per existing precedent in this codebase.

---

### Task 1: DB migration + `VoicePreset` type + `VoicePresetService.create()` stability support

**Files:**
- Create: `supabase/migrations/16_voice_stability.sql`
- Modify: `src/features/video/types.ts:122-135` (`VoicePreset` interface)
- Modify: `src/services/voicePresetService.ts`
- Test: `src/services/__tests__/voicePresetService.test.ts`

**Interfaces:**
- Produces: `CreateVoicePresetInput.stability: number` (required, matches `speed`/`pitch`'s existing required style); `VoicePresetService.create()` now stores it; `VoicePreset.stability: number` on every returned preset row.

- [ ] **Step 1: Add the migration**

Create `supabase/migrations/16_voice_stability.sql`:

```sql
BEGIN;

ALTER TABLE public.voice_presets
  ADD COLUMN stability NUMERIC NOT NULL DEFAULT 0.5
    CHECK (stability BETWEEN 0 AND 1);

COMMIT;
```

Run this migration against your local/dev Supabase project (however this repo's existing migrations are normally applied — check `supabase/migrations/15_elevenlabs_provider.sql` for the most recent precedent; this plan does not change that process).

- [ ] **Step 2: Add `stability` to the `VoicePreset` type**

In `src/features/video/types.ts`, the `VoicePreset` interface currently reads (lines 122-135):

```ts
export interface VoicePreset {
  id: string;
  brand_id: string;
  display_name: string;
  voice_code: string;
  speed: number;
  pitch: number;
  pause_config: Record<string, unknown> | null;
  is_default: boolean;
  provider: TtsProvider;
  provider_voice_id: string | null;
  elevenlabs_model: ElevenLabsModel | null;
  created_at: string;
}
```

Add `stability: number;` right after `pitch: number;`:

```ts
export interface VoicePreset {
  id: string;
  brand_id: string;
  display_name: string;
  voice_code: string;
  speed: number;
  pitch: number;
  stability: number;
  pause_config: Record<string, unknown> | null;
  is_default: boolean;
  provider: TtsProvider;
  provider_voice_id: string | null;
  elevenlabs_model: ElevenLabsModel | null;
  created_at: string;
}
```

- [ ] **Step 3: Write the failing test for `VoicePresetService.create()`**

Create `src/services/__tests__/voicePresetService.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VoicePresetService } from "@/services/voicePresetService";

describe("VoicePresetService.create", () => {
  it("stores the given stability value on the inserted row", async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { ...row, id: "preset-1" }, error: null }) }) };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new VoicePresetService(supabase);
    const preset = await service.create({
      brandId: "brand-1",
      displayName: "Adam - Firm",
      voiceCode: "",
      speed: 1.0,
      pitch: 1.0,
      stability: 0.3,
      provider: "elevenlabs",
      providerVoiceId: "voice-1",
      elevenLabsModel: "eleven_flash_v2_5",
    });

    expect(preset.stability).toBe(0.3);
    expect(insertedRows[0]).toMatchObject({ stability: 0.3 });
  });

  it("throws when the insert fails", async () => {
    const supabase = {
      from: () => ({
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "boom" } }) }) }),
      }),
    } as unknown as SupabaseClient;

    const service = new VoicePresetService(supabase);
    await expect(
      service.create({
        brandId: "brand-1",
        displayName: "X",
        voiceCode: "",
        speed: 1.0,
        pitch: 1.0,
        stability: 0.5,
        provider: "elevenlabs",
        providerVoiceId: "voice-1",
        elevenLabsModel: "eleven_flash_v2_5",
      }),
    ).rejects.toThrow("boom");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/services/__tests__/voicePresetService.test.ts`
Expected: FAIL — TypeScript error / runtime mismatch because `CreateVoicePresetInput` doesn't have a `stability` field yet and `create()` doesn't insert it.

- [ ] **Step 5: Add `stability` to `CreateVoicePresetInput` and `create()`**

In `src/services/voicePresetService.ts`, update the interface (currently lines 5-16):

```ts
export interface CreateVoicePresetInput {
  brandId: string;
  displayName: string;
  voiceCode: string;
  speed: number;
  pitch: number;
  stability: number;
  pauseConfig?: Record<string, unknown> | null;
  isDefault?: boolean;
  provider: TtsProvider;
  providerVoiceId: string | null;
  elevenLabsModel: ElevenLabsModel | null;
}
```

Update `create()` (currently lines 33-54) to insert it:

```ts
  async create(input: CreateVoicePresetInput): Promise<VoicePreset> {
    const { data, error } = await this.supabase
      .from("voice_presets")
      .insert({
        brand_id: input.brandId,
        display_name: input.displayName,
        voice_code: input.voiceCode,
        speed: input.speed,
        pitch: input.pitch,
        stability: input.stability,
        pause_config: input.pauseConfig ?? null,
        is_default: input.isDefault ?? false,
        provider: input.provider,
        provider_voice_id: input.providerVoiceId,
        elevenlabs_model: input.elevenLabsModel,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: Supabase returns the inserted voice_preset row
    return data as VoicePreset;
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/voicePresetService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/16_voice_stability.sql src/features/video/types.ts src/services/voicePresetService.ts src/services/__tests__/voicePresetService.test.ts
git commit -m "feat(voice): add stability column to voice_presets"
```

---

### Task 2: `POST /api/video/voice-presets` forwards `stability` + hook update

**Files:**
- Modify: `src/app/api/video/voice-presets/route.ts`
- Modify: `src/hooks/api/useVoicePresets.ts` (`useCreateVoicePreset`)
- Test: `src/app/api/__tests__/voice-presets.test.ts`

**Interfaces:**
- Consumes: `VoicePresetService.create()` from Task 1 (now requires `stability: number`).
- Produces: `useCreateVoicePreset()`'s mutation input gains `stability: number` — Task 5's UI passes it.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/__tests__/voice-presets.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "user-1" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/services/voicePresetService", () => ({
  VoicePresetService: class {
    create = mockCreate;
  },
}));

import { POST } from "../video/voice-presets/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/video/voice-presets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/video/voice-presets", () => {
  it("forwards the given stability value to the service", async () => {
    mockCreate.mockResolvedValue({ id: "preset-1", stability: 0.3 });
    const res = await POST(
      makeRequest({
        brandId: "brand-1",
        displayName: "Adam - Firm",
        provider: "elevenlabs",
        providerVoiceId: "voice-1",
        elevenLabsModel: "eleven_flash_v2_5",
        stability: 0.3,
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stability: 0.3 }));
  });

  it("defaults stability to 0.5 when not provided", async () => {
    mockCreate.mockResolvedValue({ id: "preset-1", stability: 0.5 });
    await POST(
      makeRequest({
        brandId: "brand-1",
        displayName: "Adam - Firm",
        provider: "elevenlabs",
        providerVoiceId: "voice-1",
        elevenLabsModel: "eleven_flash_v2_5",
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stability: 0.5 }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/__tests__/voice-presets.test.ts`
Expected: FAIL — `mockCreate` receives an object without a `stability` key, so `toHaveBeenCalledWith(expect.objectContaining({ stability: ... }))` fails.

- [ ] **Step 3: Update the route to forward `stability`**

In `src/app/api/video/voice-presets/route.ts`, add `stability?: number;` to the body type (currently lines 29-40):

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
    };
```

Add `stability: body.stability ?? 0.5,` to the `service.create()` call (currently lines 67-79), right after the `pitch` line:

```ts
    const preset = await service.create({
      brandId: body.brandId,
      displayName: body.displayName,
      voiceCode: body.voiceCode ?? "",
      speed: body.speed ?? 1.0,
      pitch: body.pitch ?? 1.0,
      stability: body.stability ?? 0.5,
      pauseConfig: body.pauseConfig ?? null,
      isDefault: body.isDefault ?? false,
      provider,
      providerVoiceId: body.providerVoiceId ?? null,
      // Safe: validated against CHECK constraint in DB; unknown strings are rejected at the DB level
      elevenLabsModel: (body.elevenLabsModel as ElevenLabsModel | null) ?? null,
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/__tests__/voice-presets.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add `stability` to the `useCreateVoicePreset` hook's input type**

In `src/hooks/api/useVoicePresets.ts`, update `useCreateVoicePreset()`'s mutation input type (currently lines 23-33):

```ts
export function useCreateVoicePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      brandId: string;
      displayName: string;
      voiceCode: string;
      speed: number;
      pitch: number;
      stability: number;
      pauseConfig?: Record<string, unknown> | null;
      provider?: TtsProvider;
      providerVoiceId?: string | null;
      elevenLabsModel?: ElevenLabsModel | null;
      isDefault?: boolean;
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
```

(No test for this hook — matches this repo's existing convention of not unit-testing thin React Query wrapper hooks; the request shape is already verified by Task 2's route test above, and Task 5 wires the call site.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (the Vbee tab's existing `createPreset.mutateAsync(...)` call in `voice-config/page.tsx` will now fail to type-check unless it also passes `stability` — if `tsc` reports an error there, that confirms Task 5 must add it; do not fix it in this task, Task 5 owns `voice-config/page.tsx`).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/video/voice-presets/route.ts src/hooks/api/useVoicePresets.ts src/app/api/__tests__/voice-presets.test.ts
git commit -m "feat(voice): forward stability through voice-presets create route and hook"
```

---

### Task 3: `POST /api/video/audio` passes `stability`, omits `speed` for v3

**Files:**
- Modify: `src/app/api/video/audio/route.ts:83-99`
- Test: `src/app/api/__tests__/audio-elevenlabs-settings.test.ts`

**Interfaces:**
- Consumes: `VoicePreset.stability` (Task 1), `ElevenLabsService.synthesize({ text, voice_id, model_id?, speed?, stability?, similarity_boost?, style? })` (existing, unchanged — already accepts both fields).

**Note:** `src/app/api/video/audio/route.ts` currently has no test file at all. This task adds one scoped narrowly to the ElevenLabs branch's `stability`/`speed` handling — it does not attempt to cover the rest of the route (Vbee branch, script/preset-not-found paths, storage upload) since those are pre-existing and unrelated to this change.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/__tests__/audio-elevenlabs-settings.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSynthesize, mockUpload, mockCreateAudio } = vi.hoisted(() => ({
  mockSynthesize: vi.fn(),
  mockUpload: vi.fn(),
  mockCreateAudio: vi.fn(),
}));

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn(() => Promise.resolve({ userId: "user-1" })),
  handleApiError: vi.fn((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }),
}));

vi.mock("@/services/elevenlabsService", () => ({
  ElevenLabsService: class {
    synthesize = mockSynthesize;
  },
}));

vi.mock("@/services/storageService", () => ({
  StorageService: class {
    upload = mockUpload;
  },
}));

vi.mock("@/services/generatedAudioService", () => ({
  GeneratedAudioService: class {
    create = mockCreateAudio;
  },
}));

function makeSupabase(presetRow: Record<string, unknown>) {
  return {
    from: (table: string) => {
      if (table === "brand_scripts") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { final_text: "Xin chào", raw_text: null, brand_id: "brand-1" },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "voice_presets") {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: presetRow, error: null }) }) }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { POST } from "../video/audio/route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ELEVENLABS_API_KEY = "test-key";
  mockSynthesize.mockResolvedValue(new ArrayBuffer(8));
  mockUpload.mockResolvedValue("audio/brand-1/script-1/123.mp3");
  mockCreateAudio.mockResolvedValue({ id: "audio-1" });
});

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/video/audio", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scriptId: "script-1", voicePresetId: "preset-1" }),
  });
}

describe("POST /api/video/audio — ElevenLabs stability/speed", () => {
  it("passes both stability and speed for eleven_flash_v2_5", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabase({
        id: "preset-1",
        provider: "elevenlabs",
        provider_voice_id: "voice-1",
        elevenlabs_model: "eleven_flash_v2_5",
        stability: 0.3,
        speed: 0.9,
      }),
    );

    await POST(makeRequest());

    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({ stability: 0.3, speed: 0.9 }),
    );
  });

  it("omits speed but still passes stability for eleven_v3", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabase({
        id: "preset-1",
        provider: "elevenlabs",
        provider_voice_id: "voice-1",
        elevenlabs_model: "eleven_v3",
        stability: 1.0,
        speed: 1.0,
      }),
    );

    await POST(makeRequest());

    const callArg = mockSynthesize.mock.calls[0][0];
    expect(callArg.stability).toBe(1.0);
    expect(callArg.speed).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/__tests__/audio-elevenlabs-settings.test.ts`
Expected: FAIL — the current call to `elService.synthesize()` doesn't pass `stability` at all, so `expect.objectContaining({ stability: 0.3, ... })` fails; the second test fails too since `speed` is always passed (never `undefined`) today.

- [ ] **Step 3: Update the ElevenLabs branch**

In `src/app/api/video/audio/route.ts`, the ElevenLabs branch (currently lines 83-99) reads:

```ts
    if (typedPreset.provider === "elevenlabs") {
      const elKey = process.env.ELEVENLABS_API_KEY;
      if (!elKey) {
        return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
      }
      if (!typedPreset.provider_voice_id) {
        return NextResponse.json({ error: "elevenlabs_voice_id_missing" }, { status: 400 });
      }
      // Dynamic import avoids loading the ElevenLabs module for Vbee requests
      const { ElevenLabsService } = await import("@/services/elevenlabsService");
      const elService = new ElevenLabsService(elKey);
      audioBuffer = await elService.synthesize({
        text: textToSpeak,
        voice_id: typedPreset.provider_voice_id,
        model_id: typedPreset.elevenlabs_model ?? undefined,
        speed: typedPreset.speed,
      });
    } else {
```

Change the `synthesize()` call to:

```ts
      audioBuffer = await elService.synthesize({
        text: textToSpeak,
        voice_id: typedPreset.provider_voice_id,
        model_id: typedPreset.elevenlabs_model ?? undefined,
        stability: typedPreset.stability,
        // v3 does not support speed control — only pass it for v2.5 Flash
        speed: typedPreset.elevenlabs_model === "eleven_v3" ? undefined : typedPreset.speed,
      });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/__tests__/audio-elevenlabs-settings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all tests passing (no regressions in the Vbee branch, which this task doesn't touch).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/video/audio/route.ts src/app/api/__tests__/audio-elevenlabs-settings.test.ts
git commit -m "feat(voice): use preset stability/speed for ElevenLabs synthesis, omit speed for v3"
```

---

### Task 4: New ElevenLabs preview endpoint + hook

**Files:**
- Create: `src/app/api/video/elevenlabs/preview/route.ts`
- Modify: `src/hooks/api/useVoicePresets.ts` (add `useElevenLabsPreview`)
- Test: `src/app/api/__tests__/elevenlabs-preview.test.ts`

**Interfaces:**
- Consumes: `ElevenLabsService.synthesize()` (existing).
- Produces: `POST /api/video/elevenlabs/preview` body `{ voice_id: string, text: string, model_id?: ElevenLabsModel, stability?: number, speed?: number }` → `{ audioUrl: string }` (a `data:audio/mpeg;base64,...` URL). `useElevenLabsPreview()` hook — `.mutateAsync({ voiceId, text, modelId?, stability?, speed? })` returns `{ audioUrl: string }`, consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/__tests__/elevenlabs-preview.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/user-context", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-1" }),
  handleApiError: vi.fn((e: unknown) =>
    NextResponse.json({ error: (e as Error).message }, { status: 500 }),
  ),
}));

vi.mock("@/services/elevenlabsService", () => ({
  ElevenLabsService: class {
    synthesize = vi.fn().mockResolvedValue(new TextEncoder().encode("fake-mp3-bytes").buffer);
  },
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

import { POST } from "../video/elevenlabs/preview/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/video/elevenlabs/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/video/elevenlabs/preview", () => {
  it("rejects a missing voice_id or text", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const res = await POST(makeRequest({ voice_id: "", text: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects text longer than 500 characters", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const res = await POST(makeRequest({ voice_id: "v1", text: "a".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns a base64 data URL on success", async () => {
    process.env = { ...ORIGINAL_ENV, ELEVENLABS_API_KEY: "test-key" };
    const res = await POST(makeRequest({ voice_id: "v1", text: "Xin chào", model_id: "eleven_flash_v2_5", stability: 0.3, speed: 0.9 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { audioUrl: string };
    expect(body.audioUrl.startsWith("data:audio/mpeg;base64,")).toBe(true);
  });

  it("returns 500 when ELEVENLABS_API_KEY is missing", async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env["ELEVENLABS_API_KEY"];
    const res = await POST(makeRequest({ voice_id: "v1", text: "Xin chào" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("elevenlabs_key_missing");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/__tests__/elevenlabs-preview.test.ts`
Expected: FAIL — module `../video/elevenlabs/preview/route` does not exist yet.

- [ ] **Step 3: Implement the route**

Create `src/app/api/video/elevenlabs/preview/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ElevenLabsService } from "@/services/elevenlabsService";
import type { ElevenLabsModel } from "@/services/scriptPrompt";

const PREVIEW_TEXT_MAX_LENGTH = 500;

interface PreviewRequest {
  voice_id?: string;
  text?: string;
  model_id?: ElevenLabsModel;
  stability?: number;
  speed?: number;
}

export async function POST(request: NextRequest) {
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

    const elKey = process.env.ELEVENLABS_API_KEY;
    if (!elKey) {
      return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
    }

    const service = new ElevenLabsService(elKey);
    const audioBuffer = await service.synthesize({
      text: body.text,
      voice_id: body.voice_id,
      model_id: body.model_id,
      stability: body.stability,
      speed: body.model_id === "eleven_v3" ? undefined : body.speed,
    });

    const base64 = Buffer.from(audioBuffer).toString("base64");
    return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/__tests__/elevenlabs-preview.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the `useElevenLabsPreview` hook**

In `src/hooks/api/useVoicePresets.ts`, add after `useElevenLabsVoices` (currently ending at line 54):

```ts
export function useElevenLabsPreview() {
  return useMutation({
    mutationFn: (input: {
      voiceId: string;
      text: string;
      modelId?: ElevenLabsModel;
      stability?: number;
      speed?: number;
    }) =>
      apiFetch<{ audioUrl: string }>("/api/video/elevenlabs/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voice_id: input.voiceId,
          text: input.text,
          model_id: input.modelId,
          stability: input.stability,
          speed: input.speed,
        }),
      }),
  });
}
```

(No dedicated test for this hook, matching this repo's existing convention — the request shape is already verified by Task 4's route test above.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/video/elevenlabs/preview/route.ts src/hooks/api/useVoicePresets.ts src/app/api/__tests__/elevenlabs-preview.test.ts
git commit -m "feat(voice): add ElevenLabs preview endpoint and hook"
```

---

### Task 5: UI — Stability/Speed controls, preview, and preset-save wiring

**Files:**
- Modify: `src/app/app/video/voice-config/page.tsx`
- Modify: `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts` (1 new key)

**Interfaces:**
- Consumes: `useCreateVoicePreset()` (Task 2, now requires `stability: number`), `useElevenLabsPreview()` (Task 4).

**No automated test for this task.** There are zero `.test.tsx` files anywhere in this repo and `vitest.config.ts` runs with `environment: "node"` — introducing component-test infrastructure is out of scope for this feature (matches the precedent set in the most recent prior feature in this codebase). Verified via `npx tsc --noEmit` plus a manual browser check (Step 5).

- [ ] **Step 1: Add the i18n key**

In `src/lib/i18n/vi.ts`, add near the other `video` section keys added most recently (search for `bulkDeleteConfirm` and insert right after it):

```ts
    elevenLabsPreviewCreditNote: "Mỗi lần tạo preview sẽ trừ credit ElevenLabs.",
```

In `src/lib/i18n/en.ts`, in the same relative position:

```ts
    elevenLabsPreviewCreditNote: "Each preview generation uses ElevenLabs credits.",
```

Run: `npx tsc --noEmit` — must be clean (catches any key mismatch between the two files, since `en.ts` is typed as `Dictionary` derived from `vi.ts`'s shape).

- [ ] **Step 2: Add constants, imports, and state**

In `src/app/app/video/voice-config/page.tsx`, add these constants near the top (after the existing `PITCH_STEP` constant, currently line 31):

```ts
const EL_STABILITY_MIN = 0;
const EL_STABILITY_MAX = 1;
const EL_STABILITY_STEP = 0.05;
const EL_SPEED_MIN = 0.7;
const EL_SPEED_MAX = 1.2;
const EL_SPEED_STEP = 0.05;

const EL_V3_STABILITY_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: "Creative" },
  { value: 0.5, label: "Natural" },
  { value: 1, label: "Robust" },
];
```

Add `useElevenLabsPreview` to the existing hooks import (currently lines 9-15):

```ts
import {
  useVbeeVoices,
  useVoiceRatings,
  useSubmitVoiceRating,
  useCreateVoicePreset,
  useElevenLabsVoices,
  useElevenLabsPreview,
} from "@/hooks/api/useVoicePresets";
```

Add new state after the existing ElevenLabs tab state block (currently lines 55-59):

```ts
  // ElevenLabs tab state
  const [elVoiceId, setElVoiceId] = useState<string>("");
  const [elVoiceName, setElVoiceName] = useState<string>("");
  const [elModel, setElModel] = useState<ElevenLabsModel>("eleven_flash_v2_5");
  const [elPreviewUrl, setElPreviewUrl] = useState<string | null>(null);
  const [elStability, setElStability] = useState(0.5);
  const [elSpeed, setElSpeed] = useState(1.0);
  const [elGeneratedPreviewUrl, setElGeneratedPreviewUrl] = useState<string | null>(null);
  const [generatingElPreview, setGeneratingElPreview] = useState(false);
  const [elPreviewError, setElPreviewError] = useState<string | null>(null);
```

Add the hook instance next to `createPreset` (currently line 78):

```ts
  const createPreset = useCreateVoicePreset();
  const generateElPreview = useElevenLabsPreview();
```

- [ ] **Step 3: Add `handleGenerateElPreview` and update `handleSaveElPreset`**

Add this new handler right after `handleSavePreset` (currently ending at line 140, before `handleSaveElPreset`):

```ts
  async function handleGenerateElPreview() {
    if (!elVoiceId || !testText.trim()) return;
    setGeneratingElPreview(true);
    setElGeneratedPreviewUrl(null);
    setElPreviewError(null);
    try {
      const res = await generateElPreview.mutateAsync({
        voiceId: elVoiceId,
        text: testText,
        modelId: elModel,
        stability: elStability,
        speed: elModel === "eleven_v3" ? undefined : elSpeed,
      });
      setElGeneratedPreviewUrl(res.audioUrl);
    } catch {
      setElPreviewError(t.video.audioFailed);
    } finally {
      setGeneratingElPreview(false);
    }
  }
```

Replace `handleSaveElPreset` (currently lines 142-162) with:

```ts
  async function handleSaveElPreset() {
    if (!selectedBrandId || !elVoiceId || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      await createPreset.mutateAsync({
        brandId: selectedBrandId,
        displayName: presetName.trim(),
        voiceCode: "",
        speed: elModel === "eleven_v3" ? 1.0 : elSpeed,
        pitch: 1.0,
        stability: elStability,
        provider: "elevenlabs",
        providerVoiceId: elVoiceId,
        elevenLabsModel: elModel,
      });
      setPresetSaved(true);
      setPresetName("");
      setTimeout(() => setPresetSaved(false), PRESET_SAVED_FEEDBACK_MS);
    } finally {
      setSavingPreset(false);
    }
  }
```

- [ ] **Step 4: Add the Stability/Speed + preview UI**

In the "Cấu hình ElevenLabs" panel (currently lines 469-538), insert this block right after the Model selector's closing `</div>` (currently line 513) and before the "Preset name + save" block's opening comment (currently line 516):

```tsx
                  {/* Stability + Speed */}
                  {elModel === "eleven_v3" ? (
                    <div>
                      <p className="mb-2 text-xs font-medium text-foreground-muted">Stability</p>
                      <div className="flex gap-2">
                        {EL_V3_STABILITY_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setElStability(preset.value)}
                            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                              elStability === preset.value
                                ? "border-primary/50 bg-primary/10 text-foreground"
                                : "border-border/40 bg-background text-foreground-muted hover:bg-black/[0.04]"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground-muted">
                          Stability: {elStability.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min={EL_STABILITY_MIN}
                          max={EL_STABILITY_MAX}
                          step={EL_STABILITY_STEP}
                          value={elStability}
                          onChange={(e) => setElStability(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground-muted">
                          Speed: {elSpeed.toFixed(2)}x
                        </label>
                        <input
                          type="range"
                          min={EL_SPEED_MIN}
                          max={EL_SPEED_MAX}
                          step={EL_SPEED_STEP}
                          value={elSpeed}
                          onChange={(e) => setElSpeed(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview with custom text */}
                  <div className="border-t border-border/20 pt-4">
                    <p className="mb-1 text-xs font-medium text-foreground-muted">{t.video.testText}</p>
                    <textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder={t.video.testTextPlaceholder}
                      rows={3}
                      maxLength={PREVIEW_TEXT_MAX_LENGTH}
                      className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => void handleGenerateElPreview()}
                      disabled={generatingElPreview || !testText.trim()}
                      className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
                    >
                      {generatingElPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                      {generatingElPreview ? t.video.generatingPreview : t.video.generatePreview}
                    </button>
                    <p className="mt-1.5 text-xs text-foreground-subtle">{t.video.elevenLabsPreviewCreditNote}</p>

                    {elPreviewError && <p className="mt-2 text-xs text-danger">{elPreviewError}</p>}

                    {elGeneratedPreviewUrl && (
                      <div className="mt-2 rounded-xl border border-border/30 bg-background p-3">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio src={elGeneratedPreviewUrl} controls className="w-full" />
                      </div>
                    )}
                  </div>
```

- [ ] **Step 5: Type-check, then manual verification**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open `/app/video/voice-config`, switch to the ElevenLabs tab, select a voice:
1. With Model = "v3 (Expression tags...)" selected: confirm 3 buttons "Creative"/"Natural"/"Robust" appear (no Speed slider anywhere).
2. Switch Model to "v2.5 Flash": confirm the 3 buttons are replaced by 2 continuous sliders (Stability 0–1, Speed 0.7–1.2), each showing the current numeric value.
3. Type text into "Test text", click "Tạo preview" — confirm a loading state, then an `<audio>` player appears with playable audio, and the small credit-cost note is visible.
4. Save a preset with a name — confirm no error, and that the saved preset's stability/speed reflect what was selected (check via `GET /api/video/voice-presets?brandId=...` response or the Supabase table if you have DB access).
5. Confirm the Vbee tab (speed/pitch sliders, its own preview button) still behaves exactly as before — no shared-state leakage from the new ElevenLabs-only state.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/video/voice-config/page.tsx src/lib/i18n/vi.ts src/lib/i18n/en.ts
git commit -m "feat(voice): add Stability/Speed controls and preview to ElevenLabs tab"
```

---

## Self-Review Notes

- **Spec coverage:** Model-aware Stability/Speed (v3 discrete + no speed; v2.5 continuous) → Task 5. Persisted to DB → Task 1 (migration + type + service). Used in real audio generation with v3 speed omission → Task 3. Preview button with credit-cost note → Task 4 (endpoint) + Task 5 (UI). `pitch` no longer sent from shared Vbee state for ElevenLabs presets → Task 5's `handleSaveElPreset` now sends a fixed `1.0` instead of reading shared `pitch` state. Separate state from Vbee tab → Task 5's new `el*` state variables, never touching `speed`/`pitch`/`previewUrl`. All covered.
- **Type consistency:** `CreateVoicePresetInput.stability: number` (Task 1) ↔ route's `stability: body.stability ?? 0.5` (Task 2) ↔ hook's `stability: number` (Task 2) ↔ UI's `stability: elStability` (Task 5) — all consistent. `ElevenLabsService.synthesize()`'s existing `stability?`/`speed?` params (unchanged) ↔ Task 3's `audio/route.ts` call ↔ Task 4's preview route call — same optional-number shape throughout.
- **No placeholders:** every step has complete, runnable code; no "TBD" or "add validation" left unstated.

# Audio Product Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show which brand product a generated audio was created for, in both the "Chi tiết Audio" detail modal and the "Thư viện Audio" list table.

**Architecture:** A new `product_id` column on `brand_scripts` (a real FK to `brand_products`, backfilled from the existing `prompt_config.productId` JSON field) lets `GeneratedAudioService.listByBrand()` do a genuine nested Supabase join (`generated_audios` → `brand_scripts` → `brand_products`) to fetch the product name alongside every audio row. `ScriptService.create()` already receives `promptConfig.productId` on every script creation — it now also writes that value into the new column, no route change needed. The UI reads the new `audio.brand_script.brand_product.name` field in two places.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres), TanStack React Query, Tailwind CSS, Vitest.

## Global Constraints

- No `any`; type assertions require a `// Safe:` comment explaining why.
- No barrel `index.ts` files.
- No i18n keys for the two new UI labels — hardcode the Vietnamese strings directly in JSX (explicit user instruction; this is an intentional, scoped exception to this page's usual `t.video.*` convention).
- `prompt_config.productId` (the JSON copy) is left untouched by this feature — it is not read from anymore, but removing it is out of scope.
- Run tests with `npx vitest run <path>`. If you see "Vitest failed to find the runner" or all files failing, that's a known stale-cache issue — run `rm -rf node_modules/.vite node_modules/.vitest` once and retry before concluding anything is broken.
- Do NOT run the SQL migration against any live Supabase project — creating the `.sql` file is the deliverable (matches this repo's existing convention: migrations are applied out-of-band by the user).
- This repo has no dedicated component-test convention (no `.test.tsx` files, `vitest.config.ts` runs with `environment: "node"`) — the UI task is verified via `tsc --noEmit` plus a manual/static trace, not a new automated test.

---

### Task 1: Migration + `BrandScript.product_id` type + `ScriptService.create()` writes it

**Files:**
- Create: `supabase/migrations/17_brand_script_product_id.sql`
- Modify: `src/features/video/types.ts:75-87` (`BrandScript` interface)
- Modify: `src/services/scriptService.ts:20-46` (`create()`)
- Test: `src/services/__tests__/scriptService.test.ts`

**Interfaces:**
- Produces: `BrandScript.product_id: string | null` on every returned script row. `ScriptService.create()`'s behavior changes (no signature change) — it now writes `product_id` derived from the `promptConfig.productId` argument it already receives.

- [ ] **Step 1: Add the migration**

Create `supabase/migrations/17_brand_script_product_id.sql`:

```sql
-- supabase/migrations/17_brand_script_product_id.sql
BEGIN;

ALTER TABLE public.brand_scripts
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.brand_products(id) ON DELETE SET NULL;

UPDATE public.brand_scripts bs
SET product_id = (bs.prompt_config->>'productId')::uuid
WHERE bs.prompt_config->>'productId' IS NOT NULL
  AND bs.prompt_config->>'productId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.brand_products bp WHERE bp.id = (bs.prompt_config->>'productId')::uuid
  );

COMMIT;
```

Run this migration against your local/dev Supabase project however this repo's existing migrations are normally applied (check `supabase/migrations/16_voice_stability.sql` for the most recent precedent; this plan does not change that process).

- [ ] **Step 2: Add `product_id` to the `BrandScript` type**

In `src/features/video/types.ts`, the `BrandScript` interface currently reads (lines 75-87):

```ts
export interface BrandScript {
  id: string;
  transcript_id: string;
  brand_id: string;
  prompt_config: PromptConfig;
  raw_text: string | null;
  final_text: string | null;
  llm_model: string | null;
  tts_provider: TtsProvider | null;
  elevenlabs_model: ElevenLabsModel | null;
  created_at: string;
  updated_at: string;
}
```

Add `product_id: string | null;` right after `prompt_config: PromptConfig;`:

```ts
export interface BrandScript {
  id: string;
  transcript_id: string;
  brand_id: string;
  prompt_config: PromptConfig;
  product_id: string | null;
  raw_text: string | null;
  final_text: string | null;
  llm_model: string | null;
  tts_provider: TtsProvider | null;
  elevenlabs_model: ElevenLabsModel | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Write the failing test for `ScriptService.create()`**

Create `src/services/__tests__/scriptService.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ScriptService } from "@/services/scriptService";

describe("ScriptService.create", () => {
  it("stores promptConfig.productId as the product_id column", async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { ...row, id: "script-1" }, error: null }) }) };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new ScriptService(supabase);
    const script = await service.create(
      "transcript-1",
      "brand-1",
      "raw text",
      { tone: "friendly", notes: "", productId: "product-1" },
      "claude-sonnet",
    );

    expect(script.product_id).toBe("product-1");
    expect(insertedRows[0]).toMatchObject({ product_id: "product-1" });
  });

  it("stores null product_id when promptConfig.productId is absent", async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { ...row, id: "script-2" }, error: null }) }) };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new ScriptService(supabase);
    const script = await service.create(
      "transcript-1",
      "brand-1",
      "raw text",
      { tone: "friendly", notes: "" },
      "claude-sonnet",
    );

    expect(script.product_id).toBeNull();
    expect(insertedRows[0]).toMatchObject({ product_id: null });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/services/__tests__/scriptService.test.ts`
Expected: FAIL — `script.product_id` is `undefined` (the insert payload doesn't include `product_id` yet).

- [ ] **Step 5: Update `create()` to write `product_id`**

In `src/services/scriptService.ts`, `create()` currently reads (lines 20-46):

```ts
  async create(
    transcriptId: string,
    brandId: string,
    rawText: string,
    promptConfig: PromptConfig,
    llmModel: string,
    ttsProvider: TtsProvider = "vbee",
    elevenLabsModel: ElevenLabsModel | null = null,
  ): Promise<BrandScript> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .insert({
        transcript_id: transcriptId,
        brand_id: brandId,
        raw_text: rawText,
        prompt_config: promptConfig,
        llm_model: llmModel,
        tts_provider: ttsProvider,
        elevenlabs_model: elevenLabsModel,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: .single() guarantees a single brand_scripts row matching BrandScript
    return data as BrandScript;
  }
```

Change the `.insert({...})` call to add `product_id`, derived from `promptConfig.productId`:

```ts
  async create(
    transcriptId: string,
    brandId: string,
    rawText: string,
    promptConfig: PromptConfig,
    llmModel: string,
    ttsProvider: TtsProvider = "vbee",
    elevenLabsModel: ElevenLabsModel | null = null,
  ): Promise<BrandScript> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .insert({
        transcript_id: transcriptId,
        brand_id: brandId,
        raw_text: rawText,
        prompt_config: promptConfig,
        product_id: promptConfig.productId ?? null,
        llm_model: llmModel,
        tts_provider: ttsProvider,
        elevenlabs_model: elevenLabsModel,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: .single() guarantees a single brand_scripts row matching BrandScript
    return data as BrandScript;
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/scriptService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`src/app/api/video/scripts/route.ts` needs no changes — it already builds `promptConfig` with `productId: body.productId` at line 160 and passes it unchanged into `scriptService.create()`.)

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/17_brand_script_product_id.sql src/features/video/types.ts src/services/scriptService.ts src/services/__tests__/scriptService.test.ts
git commit -m "feat(video): add product_id column to brand_scripts, write it on script create"
```

---

### Task 2: `GeneratedAudioService.listByBrand()` joins `brand_product`

**Files:**
- Modify: `src/services/generatedAudioService.ts:8-18` (`listByBrand()`)
- Modify: `src/features/video/types.ts:147-159` (`GeneratedAudio` interface)
- Test: `src/services/__tests__/generatedAudioService.test.ts`

**Interfaces:**
- Consumes: `BrandScript.product_id` (Task 1) — only indirectly, via the new FK enabling the nested Supabase join; no direct TS dependency.
- Produces: `GeneratedAudio.brand_script.brand_product: Pick<BrandProduct, "id" | "name"> | null` — Task 3's UI reads `audio.brand_script?.brand_product?.name`.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/generatedAudioService.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GeneratedAudioService } from "@/services/generatedAudioService";

describe("GeneratedAudioService.listByBrand", () => {
  it("selects the nested brand_product join and returns the product name", async () => {
    let capturedSelect = "";
    const rowWithProduct = {
      id: "audio-1",
      brand_script: {
        final_text: "hello",
        raw_text: null,
        brand_product: { id: "product-1", name: "Kho quẹt tôm thịt" },
      },
    };
    const supabase = {
      from: () => ({
        select: (query: string) => {
          capturedSelect = query;
          return {
            eq: () => ({
              order: () => Promise.resolve({ data: [rowWithProduct], error: null }),
            }),
          };
        },
      }),
      // Safe: fake only implements the from().select().eq().order() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new GeneratedAudioService(supabase);
    const audios = await service.listByBrand("brand-1");

    expect(capturedSelect).toContain("brand_product:brand_products(id, name)");
    expect(audios[0]?.brand_script?.brand_product?.name).toBe("Kho quẹt tôm thịt");
  });

  it("throws when the query fails", async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { message: "boom" } }) }) }),
      }),
      // Safe: fake only implements the from().select().eq().order() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new GeneratedAudioService(supabase);
    await expect(service.listByBrand("brand-1")).rejects.toThrow("boom");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/generatedAudioService.test.ts`
Expected: FAIL — the current `select(...)` string doesn't contain `brand_product:brand_products(id, name)`.

- [ ] **Step 3: Widen the `GeneratedAudio` type**

In `src/features/video/types.ts`, add the import (near the top, alongside the existing import on line 1):

```ts
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
import type { BrandProduct } from "@/features/brand/types";
```

Then update the `GeneratedAudio` interface (currently lines 147-159):

```ts
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

to:

```ts
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
  brand_script?:
    | (Pick<BrandScript, "final_text" | "raw_text"> & {
        brand_product?: Pick<BrandProduct, "id" | "name"> | null;
      })
    | null;
}
```

- [ ] **Step 4: Update `listByBrand()`'s select**

In `src/services/generatedAudioService.ts`, `listByBrand()` currently reads (lines 8-18):

```ts
  async listByBrand(brandId: string): Promise<GeneratedAudio[]> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .select("*, voice_preset:voice_presets(display_name, voice_code, speed), brand_script:brand_scripts(final_text, raw_text)")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns generated_audios rows with joined voice_preset and brand_script
    return (data ?? []) as GeneratedAudio[];
  }
```

Change the `.select(...)` string to add the nested `brand_product` join:

```ts
  async listByBrand(brandId: string): Promise<GeneratedAudio[]> {
    const { data, error } = await this.supabase
      .from("generated_audios")
      .select(
        "*, voice_preset:voice_presets(display_name, voice_code, speed), brand_script:brand_scripts(final_text, raw_text, brand_product:brand_products(id, name))",
      )
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    // Safe: Supabase returns generated_audios rows with joined voice_preset and brand_script(brand_product)
    return (data ?? []) as GeneratedAudio[];
  }
```

Do NOT change `listByScript()` (lines 20-30) — it's unrelated to this feature (used for the per-script audio history view, not the brand-wide library).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/generatedAudioService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full suite and type-check**

Run: `npx vitest run`
Expected: all tests passing, no regressions.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/generatedAudioService.ts src/features/video/types.ts src/services/__tests__/generatedAudioService.test.ts
git commit -m "feat(video): join brand_product into GeneratedAudioService.listByBrand"
```

---

### Task 3: UI — show product name in the detail modal and the library table

**Files:**
- Modify: `src/features/video/components/AudioDetailModal.tsx`
- Modify: `src/app/app/video/audio/page.tsx`

**Interfaces:**
- Consumes: `GeneratedAudio.brand_script.brand_product` (Task 2).

**No automated test for this task.** There are zero `.test.tsx` files anywhere in this repo and `vitest.config.ts` runs with `environment: "node"` — matches the precedent set by every prior UI-only task in this codebase. Verified via `npx tsc --noEmit` plus a manual/static trace (Step 3).

- [ ] **Step 1: Add the product row to `AudioDetailModal.tsx`**

In `src/features/video/components/AudioDetailModal.tsx`, the metadata `<dl>` currently starts (lines 68-74):

```tsx
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                {t.video.audioDetailVoice}
              </dt>
              <dd className="mt-0.5 text-foreground">{voiceLabel}</dd>
            </div>
```

Add a new "Sản phẩm" entry as the first item, right before the Voice entry. The hardcoded string is intentional — no i18n key, per this feature's explicit scope (see Global Constraints):

```tsx
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                Sản phẩm
              </dt>
              <dd className="mt-0.5 text-foreground">{audio.brand_script?.brand_product?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                {t.video.audioDetailVoice}
              </dt>
              <dd className="mt-0.5 text-foreground">{voiceLabel}</dd>
            </div>
```

(Leave the rest of the `<dl>` — Provider, Speed, Duration, Created — untouched.)

- [ ] **Step 2: Add the product column to the audio library table**

In `src/app/app/video/audio/page.tsx`, the table header currently reads (lines 66-72):

```tsx
                <tr className="border-b border-border/20 bg-background-elevated/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableScript}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableVoice}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableDuration}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableCreated}</th>
                  <th className="px-4 py-3" />
                </tr>
```

Add a new "Sản phẩm" header right after the Script column (hardcoded, no i18n key):

```tsx
                <tr className="border-b border-border/20 bg-background-elevated/50 text-left">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableScript}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">Sản phẩm</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableVoice}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableDuration}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-foreground-subtle">{t.video.audioTableCreated}</th>
                  <th className="px-4 py-3" />
                </tr>
```

The row-rendering body currently reads (lines 90-92, right after the Script `<td>`):

```tsx
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-1 text-sm text-foreground">{scriptText}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {audio.voice_preset?.display_name ?? "—"}
                      </td>
```

Add a new `<td>` for the product name right after the Script `<td>`, matching the Voice column's styling:

```tsx
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-1 text-sm text-foreground">{scriptText}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {audio.brand_script?.brand_product?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {audio.voice_preset?.display_name ?? "—"}
                      </td>
```

- [ ] **Step 3: Type-check, then manual verification**

Run: `npx tsc --noEmit`
Expected: no errors.

Since there's no dev server/browser available for a live check in most environments, do a careful static trace instead:
1. Confirm `AudioDetailModal.tsx`'s new `<dd>` reads `audio.brand_script?.brand_product?.name ?? "—"` — matches the `GeneratedAudio` type from Task 2, so `audio.brand_script?.brand_product?.name` type-checks as `string | undefined`, safely coalesced to `"—"`.
2. Confirm the table's new `<td>` reads the identical expression and sits between the Script and Voice columns in both the `<thead>` and the row-mapping body (same column count in both, so alignment holds — count `<th>` vs `<td>` per row: 6 header cells, 6 body cells).
3. If a dev server IS available: run `npm run dev`, open `/app/video/audio`, and confirm: (a) an audio row created from a script that had a product selected shows the product name; (b) an audio row from a script created before this migration's backfill (or with no product) shows "—" in both the table and the modal, with no runtime error.

- [ ] **Step 4: Commit**

```bash
git add src/features/video/components/AudioDetailModal.tsx src/app/app/video/audio/page.tsx
git commit -m "feat(video): show product name in audio detail modal and library table"
```

---

## Self-Review Notes

- **Spec coverage:** Migration + backfill → Task 1. `ScriptService.create()` writes `product_id` → Task 1 (no route change needed — `promptConfig.productId` already flows in unchanged from `src/app/api/video/scripts/route.ts:160`). Nested join for product name → Task 2. Detail modal + library table display → Task 3. No i18n keys added → Task 3 (hardcoded strings, per explicit user instruction). `prompt_config.productId` untouched → Task 1 (only reads it, never writes/removes it). All covered.
- **Type consistency:** `BrandScript.product_id: string | null` (Task 1) is not directly consumed by any TS code in Task 2 or 3 — it only enables the Postgres FK relationship that makes the nested Supabase join in Task 2 possible. `GeneratedAudio.brand_script.brand_product: Pick<BrandProduct, "id" | "name"> | null` (Task 2) ↔ UI's `audio.brand_script?.brand_product?.name` (Task 3) — consistent optional-chaining shape throughout.
- **No placeholders:** every step has complete, runnable code; no "TBD" or "add validation" left unstated.
- **Not regenerating `src/types/database.types.ts`:** matches this repo's existing precedent (confirmed inert in the ElevenLabs stability/speed feature's final review) — `ScriptService`/`GeneratedAudioService` use an untyped `SupabaseClient`, so the generated schema file isn't type-checked against. Regenerating it is a reasonable follow-up but not required for this plan's `tsc --noEmit` gate to pass.

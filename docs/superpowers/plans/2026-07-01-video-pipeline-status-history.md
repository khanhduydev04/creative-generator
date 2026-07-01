# Video Pipeline Status Marker & Script History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users see, from the video list, which Winner videos already have generated voice (or a failed transcription), and let them browse/restore past script versions (with their matching voice history) from the pipeline detail page, without hunting through each pipeline manually.

**Architecture:** Add a pure derivation function (`deriveVideoFlags`) that turns a Supabase embedded-join row into two booleans; wire it into the existing `listVideos` query via an embedded select (no migration). Surface the booleans as small badges in the list. In the pipeline detail page, replace the single "latest script" prop with the full scripts array and add a version-select dropdown; fix a pre-existing gap where reopening an already-scripted video doesn't restore the active script id, which also unlocks correct auto-scroll to the first unfinished stage.

**Tech Stack:** Next.js App Router, TypeScript (strict), Supabase (`@supabase/supabase-js`, untyped client), TanStack Query, Tailwind, Vitest.

## Global Constraints

- No `any` — use precise types and narrow with type guards; if a type assertion (`as X`) is unavoidable (e.g. at a Supabase query boundary), add a comment explaining why it's safe.
- No barrel `index.ts` files — import directly from source files.
- Client Components require a `// Client Component: [reason]` comment above `"use client"` (all touched files already have one — keep it accurate if behavior changes).
- i18n: `en.ts` must mirror every key added to `vi.ts` under `video` (the `Dictionary` type is inferred from `vi.ts` and `en.ts` is checked against it — a missing key is a compile error).
- Magic numbers/strings → named constants where the file already follows that convention.
- Follow existing test conventions: pure logic gets a Vitest unit test (see `src/features/video/utils/__tests__/pipelineStages.test.ts`); this codebase does not unit-test React components or raw Supabase query builders, so UI-only changes are verified manually via `npm run dev`, not with new test infra.

---

### Task 1: `CompetitorVideo` type fields + `deriveVideoFlags` pure function

**Files:**
- Modify: `src/features/video/types.ts`
- Create: `src/features/video/utils/deriveVideoFlags.ts`
- Create: `src/features/video/utils/__tests__/deriveVideoFlags.test.ts`

**Interfaces:**
- Produces: `deriveVideoFlags(transcripts: TranscriptJoinRow[] | TranscriptJoinRow | null): VideoFlags` where `VideoFlags = { hasGeneratedAudio: boolean; transcriptionFailed: boolean }`, and `TranscriptJoinRow = { whisper_status: WhisperStatus | null; brand_scripts: { generated_audios: { id: string }[] | null }[] | null }` — both exported from `deriveVideoFlags.ts`.
- Produces: `CompetitorVideo` (in `types.ts`) gains `hasGeneratedAudio: boolean` and `transcriptionFailed: boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/features/video/utils/__tests__/deriveVideoFlags.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveVideoFlags } from "@/features/video/utils/deriveVideoFlags";

describe("deriveVideoFlags", () => {
  it("returns all false when transcripts is null", () => {
    expect(deriveVideoFlags(null)).toEqual({
      hasGeneratedAudio: false,
      transcriptionFailed: false,
    });
  });

  it("returns all false when transcripts is an empty array", () => {
    expect(deriveVideoFlags([])).toEqual({
      hasGeneratedAudio: false,
      transcriptionFailed: false,
    });
  });

  it("flags transcriptionFailed when whisper_status is failed", () => {
    const result = deriveVideoFlags({ whisper_status: "failed", brand_scripts: [] });
    expect(result).toEqual({ hasGeneratedAudio: false, transcriptionFailed: true });
  });

  it("flags hasGeneratedAudio when any script has a generated audio", () => {
    const result = deriveVideoFlags({
      whisper_status: "done",
      brand_scripts: [
        { generated_audios: [] },
        { generated_audios: [{ id: "audio-1" }] },
      ],
    });
    expect(result).toEqual({ hasGeneratedAudio: true, transcriptionFailed: false });
  });

  it("handles transcripts passed as a single-element array (Supabase embed shape)", () => {
    const result = deriveVideoFlags([
      { whisper_status: "done", brand_scripts: [{ generated_audios: [{ id: "a1" }] }] },
    ]);
    expect(result).toEqual({ hasGeneratedAudio: true, transcriptionFailed: false });
  });

  it("treats null generated_audios as no audio", () => {
    const result = deriveVideoFlags({
      whisper_status: "done",
      brand_scripts: [{ generated_audios: null }],
    });
    expect(result.hasGeneratedAudio).toBe(false);
  });

  it("treats null brand_scripts as no audio", () => {
    const result = deriveVideoFlags({ whisper_status: "processing", brand_scripts: null });
    expect(result).toEqual({ hasGeneratedAudio: false, transcriptionFailed: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- deriveVideoFlags`
Expected: FAIL — `Cannot find module '@/features/video/utils/deriveVideoFlags'`

- [ ] **Step 3: Add the two fields to `CompetitorVideo`**

In `src/features/video/types.ts`, extend the interface (after `created_at: string;`):

```ts
export interface CompetitorVideo {
  id: string;
  brand_id: string;
  tiktok_url: string;
  video_id: string | null;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  author_handle: string | null;
  cover_url: string | null;
  scraped_at: string | null;
  apify_run_id: string | null;
  status: VideoStatus;
  scrape_status: ScrapeStatus;
  created_at: string;
  hasGeneratedAudio: boolean;
  transcriptionFailed: boolean;
}
```

- [ ] **Step 4: Write the implementation**

Create `src/features/video/utils/deriveVideoFlags.ts`:

```ts
import type { WhisperStatus } from "@/features/video/types";

export interface TranscriptJoinRow {
  whisper_status: WhisperStatus | null;
  brand_scripts: { generated_audios: { id: string }[] | null }[] | null;
}

export interface VideoFlags {
  hasGeneratedAudio: boolean;
  transcriptionFailed: boolean;
}

export function deriveVideoFlags(
  transcripts: TranscriptJoinRow[] | TranscriptJoinRow | null,
): VideoFlags {
  const transcript = Array.isArray(transcripts) ? transcripts[0] : transcripts;
  if (!transcript) {
    return { hasGeneratedAudio: false, transcriptionFailed: false };
  }

  const hasGeneratedAudio = (transcript.brand_scripts ?? []).some(
    (script) => (script.generated_audios?.length ?? 0) > 0,
  );

  return {
    hasGeneratedAudio,
    transcriptionFailed: transcript.whisper_status === "failed",
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- deriveVideoFlags`
Expected: PASS (7 tests)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (note: `CompetitorVideo` now requires the 2 new fields everywhere it's constructed — this will surface any missed call site; Task 2 fixes the only real constructor, `CompetitorVideoService`)

Because `addVideo` and `updateStatus` in `competitorVideoService.ts` also return `CompetitorVideo` (cast from raw Supabase rows that won't have the new fields), expect `tsc` to flag those two `as CompetitorVideo` casts as now-incorrect. That's expected — Task 2 fixes it by changing those two casts to include the new fields with default `false` values (a freshly added/updated video never has generated audio yet).

- [ ] **Step 7: Commit**

```bash
git add src/features/video/types.ts src/features/video/utils/deriveVideoFlags.ts src/features/video/utils/__tests__/deriveVideoFlags.test.ts
git commit -m "feat(video): add deriveVideoFlags + CompetitorVideo pipeline status fields"
```

---

### Task 2: Wire `deriveVideoFlags` into `CompetitorVideoService.listVideos`

**Files:**
- Modify: `src/services/competitorVideoService.ts`

**Interfaces:**
- Consumes: `deriveVideoFlags` and `TranscriptJoinRow` from Task 1 (`@/features/video/utils/deriveVideoFlags`).
- Produces: `CompetitorVideoService.listVideos(...)` now returns `CompetitorVideo[]` where every item has correctly-populated `hasGeneratedAudio` / `transcriptionFailed`. `addVideo` and `updateStatus` return `CompetitorVideo` with both fields `false` (a video that was just added or whose status was just toggled cannot yet have a transcript/script/audio).

- [ ] **Step 1: Update imports and add the row type**

In `src/services/competitorVideoService.ts`, change the top imports and add a local row type right after them:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";
import { deriveVideoFlags, type TranscriptJoinRow } from "@/features/video/utils/deriveVideoFlags";

export interface ApifyVideoItem {
  webVideoUrl?: string;
  id?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  authorMeta?: { name?: string; nickName?: string };
  videoMeta?: { coverUrl?: string; duration?: number };
  createTimeISO?: string;
  isAd?: boolean;
  searchKey?: string;
}

interface CompetitorVideoRow extends Omit<CompetitorVideo, "hasGeneratedAudio" | "transcriptionFailed"> {
  transcripts: TranscriptJoinRow[] | TranscriptJoinRow | null;
}
```

- [ ] **Step 2: Rewrite `listVideos` to join and map**

Replace the whole `listVideos` method body:

```ts
  async listVideos(
    brandId: string,
    status?: VideoStatus,
    page = 1,
    limit = 20,
    q?: string,
  ): Promise<{ videos: CompetitorVideo[]; total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from("competitor_videos")
      .select(
        `*, transcripts:transcripts!video_id(whisper_status, brand_scripts(generated_audios(id)))`,
        { count: "exact" },
      )
      .eq("brand_id", brandId)
      // Newest-first within null-views group so manually-added videos surface at top
      .order("views", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(`tiktok_url.ilike.${like},author_handle.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    // Safe: the select() above requests exactly the columns + embedded
    // transcripts/brand_scripts/generated_audios join shaped as CompetitorVideoRow.
    const rows = (data ?? []) as CompetitorVideoRow[];
    const videos: CompetitorVideo[] = rows.map(({ transcripts, ...video }) => ({
      ...video,
      ...deriveVideoFlags(transcripts),
    }));

    return { videos, total: count ?? 0 };
  }
```

- [ ] **Step 3: Fix the two other `CompetitorVideo` constructors**

In the same file, `addVideo` and `updateStatus` currently end with `return data as CompetitorVideo;`. Update both to include the two new fields (a just-added or just-status-changed video never has a transcript yet):

```ts
  async addVideo(brandId: string, tiktokUrl: string): Promise<CompetitorVideo> {
    const videoId = extractTikTokVideoId(tiktokUrl);
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .insert({
        brand_id: brandId,
        tiktok_url: tiktokUrl,
        video_id: videoId,
        status: "pending",
        scrape_status: "success",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("URL_EXISTS");
      throw new Error(error.message);
    }
    // Safe: a freshly-inserted video has no transcript/script/audio yet.
    return { ...data, hasGeneratedAudio: false, transcriptionFailed: false } as CompetitorVideo;
  }

  async updateStatus(videoId: string, status: VideoStatus): Promise<CompetitorVideo> {
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .update({ status })
      .eq("id", videoId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Safe: this endpoint only flips status; it doesn't reflect pipeline
    // progress, so the caller's cached list (which does) is the source of
    // truth for these two flags until the next full list refetch.
    return { ...data, hasGeneratedAudio: false, transcriptionFailed: false } as CompetitorVideo;
  }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all existing tests still PASS (no test exercises `listVideos` directly, per this codebase's convention of not mocking the raw Supabase query builder — see Task 1's test for the logic that matters)

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open the Video Trending page, switch to the Winner tab. Confirm the page loads without errors (check the terminal and browser console) for a brand that has at least one winner video with a saved script/audio. This confirms the embedded Supabase select resolves against the real schema.

- [ ] **Step 7: Commit**

```bash
git add src/services/competitorVideoService.ts
git commit -m "feat(video): join transcript/script/audio state into listVideos"
```

---

### Task 3: i18n keys for badges and version picker

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

**Interfaces:**
- Produces: `t.video.hasAudioBadge`, `t.video.transcriptFailedBadge`, `t.video.scriptVersionLabel`, `t.video.scriptVersionsCount` (string with a `{0}` placeholder, replaced via `.replace("{0}", ...)` — same pattern as `t.video.syncSuccess`).

- [ ] **Step 1: Add keys to `vi.ts`**

In `src/lib/i18n/vi.ts`, inside the `video: { ... }` object, add after `sellingPointsLabel: "Điểm bán / USP",` (the last key before the closing `},`):

```ts
    sellingPointsLabel: "Điểm bán / USP",
    hasAudioBadge: "Đã tạo",
    transcriptFailedBadge: "Lỗi bóc băng",
    scriptVersionLabel: "Phiên bản",
    scriptVersionsCount: "{0} phiên bản đã tạo",
  },
```

- [ ] **Step 2: Add matching keys to `en.ts`**

In `src/lib/i18n/en.ts`, find the corresponding `video: { ... }` object and add the same keys in the same position (after `sellingPointsLabel`):

```ts
    sellingPointsLabel: "Selling points / USP",
    hasAudioBadge: "Generated",
    transcriptFailedBadge: "Transcription failed",
    scriptVersionLabel: "Version",
    scriptVersionsCount: "{0} versions",
  },
```

(Match whatever the existing `sellingPointsLabel` line reads in `en.ts` — only add the 4 new lines after it.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (this is what catches a missing key in either file, since `Dictionary = StringLeaves<typeof vi>` and `en` must satisfy it)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/vi.ts src/lib/i18n/en.ts
git commit -m "feat(video): add i18n keys for pipeline status badges and script versions"
```

---

### Task 4: Status badges in `CompetitorVideoCard`

**Files:**
- Modify: `src/features/video/components/CompetitorVideoCard.tsx`

**Interfaces:**
- Consumes: `video.hasGeneratedAudio`, `video.transcriptionFailed` (Task 1/2), `t.video.hasAudioBadge`, `t.video.transcriptFailedBadge` (Task 3).

- [ ] **Step 1: Add the two new icons to the lucide-react import**

Change:

```ts
import { Trophy, XCircle, Loader2, X, Play, ArrowRight } from "lucide-react";
```

to:

```ts
import { Trophy, XCircle, Loader2, X, Play, ArrowRight, Check, AlertTriangle } from "lucide-react";
```

- [ ] **Step 2: Render the badges under the Status pill**

Replace the Status `<td>` block:

```tsx
        {/* Status */}
        <td className="py-2 pr-4">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}>
            {statusLabel[video.status]}
          </span>
        </td>
```

with:

```tsx
        {/* Status */}
        <td className="py-2 pr-4">
          <div className="flex flex-col items-start gap-1">
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}>
              {statusLabel[video.status]}
            </span>
            {video.hasGeneratedAudio && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-600">
                <Check className="h-2.5 w-2.5" />
                {t.video.hasAudioBadge}
              </span>
            )}
            {video.transcriptionFailed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-500">
                <AlertTriangle className="h-2.5 w-2.5" />
                {t.video.transcriptFailedBadge}
              </span>
            )}
          </div>
        </td>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open the Video Trending page on the Winner tab:
- For a winner video that has a generated audio (check via its pipeline page first if unsure), confirm the green "Đã tạo" chip appears under the Winner badge.
- For a winner video whose transcript run failed (or temporarily edit one row's `whisper_status` to `'failed'` in Supabase to check), confirm the red "Lỗi bóc băng" chip appears instead.
- For a winner video with neither, confirm no extra chip renders and the row layout looks unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/features/video/components/CompetitorVideoCard.tsx
git commit -m "feat(video): show generated/failed status chips in video list"
```

---

### Task 5: Script version picker + fix stale `savedScriptId` on pipeline reopen

**Files:**
- Modify: `src/features/video/components/ScriptEditor.tsx`
- Modify: `src/app/app/video/[id]/page.tsx`

**Interfaces:**
- Consumes: `t.video.scriptVersionLabel`, `t.video.scriptVersionsCount` (Task 3).
- Produces: `ScriptEditor` now takes `scripts: BrandScript[]` instead of `latestScript: BrandScript | null` (breaking change to its props, fixed up in the same task in `page.tsx`). Calling `onScriptCreated(scriptId)` when the user picks a different version keeps working exactly as it did for newly-generated scripts, since it's the same callback.

- [ ] **Step 1: Change `ScriptEditor`'s prop and internal state to use the full list**

In `src/features/video/components/ScriptEditor.tsx`, change the props interface:

```ts
interface ScriptEditorProps {
  transcriptId: string | null;
  brandId: string;
  products: ProductOption[];
  scripts: BrandScript[];
  onScriptCreated: (scriptId: string) => void;
}
```

Update the function signature and the two `useState` initializers that referenced `latestScript`:

```ts
export function ScriptEditor({
  transcriptId,
  brandId,
  products,
  scripts,
  onScriptCreated,
}: ScriptEditorProps) {
  const { t } = useT();
  const patchScript = usePatchScript();
  const abortRef = useRef<AbortController | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("authentic");
  const [notes, setNotes] = useState("");
  const [attributes, setAttributes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(scripts[0]?.id ?? null);
  const [editedFinalText, setEditedFinalText] = useState(scripts[0]?.final_text ?? "");
  const [saved, setSaved] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("vbee");
  const [elevenLabsModel, setElevenLabsModel] = useState<ElevenLabsModel>("eleven_flash_v2_5");
```

- [ ] **Step 2: Add the version-select formatter and handler**

Add this function near the top of the file, after the existing module-level constants (`SAVE_FEEDBACK_DURATION_MS`, etc.) and before the component:

```ts
function formatScriptVersionLabel(createdAt: string): string {
  const date = new Date(createdAt);
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${time} ${day}`;
}
```

Inside the component, add the handler next to `handleSave`:

```ts
  function handleSelectVersion(scriptId: string) {
    const script = scripts.find((s) => s.id === scriptId);
    if (!script) return;
    setSavedScriptId(script.id);
    setEditedFinalText(script.final_text ?? script.raw_text ?? "");
    setSaved(false);
    onScriptCreated(script.id);
  }
```

- [ ] **Step 3: Render the version picker**

In the JSX, right after the `{streamError && <p ...>}` line and before the `<textarea ...>`, add:

```tsx
      {scripts.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-foreground-muted">
            {t.video.scriptVersionLabel}
          </label>
          <select
            value={savedScriptId ?? ""}
            onChange={(e) => handleSelectVersion(e.target.value)}
            className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            {scripts.map((script) => (
              <option key={script.id} value={script.id}>
                {formatScriptVersionLabel(script.created_at)}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-foreground-subtle">
            {t.video.scriptVersionsCount.replace("{0}", String(scripts.length))}
          </span>
        </div>
      )}
```

- [ ] **Step 4: Wire `page.tsx` to pass `scripts` and seed `savedScriptId` on load**

In `src/app/app/video/[id]/page.tsx`, remove the now-unused `latestScript` line:

```ts
  const { data: scripts = [] } = useScripts(transcriptId);
  const { data: audios = [] } = useGeneratedAudiosByScript(savedScriptId);
```

(delete the `const latestScript = scripts[0] ?? null;` line that used to sit between those two)

Add a `useEffect` right after the existing effects (after the products-loading effect, before `handleCreateTranscript`) that seeds `savedScriptId` the first time `scripts` loads, so reopening an already-scripted video immediately shows its existing voice history instead of appearing locked:

```ts
  useEffect(() => {
    if (savedScriptId === null && scripts.length > 0) {
      setSavedScriptId(scripts[0].id);
    }
  }, [scripts, savedScriptId]);
```

Update the `<ScriptEditor>` usage:

```tsx
          <ScriptEditor
            transcriptId={
              transcript?.whisper_status === "done" ? transcriptId : null
            }
            brandId={selectedBrandId ?? ""}
            products={products}
            scripts={scripts}
            onScriptCreated={setSavedScriptId}
          />
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 6: Manual verification**

Run `npm run dev`:
1. Open a pipeline for a winner video that already has 2+ generated scripts (or generate a second script for one that has one, by clicking "Tạo kịch bản ✦" again after saving the first). Confirm the version dropdown appears showing both timestamps, newest first-selected.
2. Switch to the older version in the dropdown — confirm the textarea updates to that version's text, and the Voice section below now shows that version's own audio list (or the empty state if that version never had audio generated).
3. Reload the page entirely (full browser refresh) on a video that already has a saved script + generated audio from a previous session. Confirm the Voice section is unlocked immediately (not showing the "Lưu kịch bản trước khi tạo giọng đọc" placeholder) and lists the existing audio — this is the `savedScriptId` seeding fix from Step 4.

- [ ] **Step 7: Commit**

```bash
git add src/features/video/components/ScriptEditor.tsx src/app/app/video/[id]/page.tsx
git commit -m "feat(video): add script version picker and fix stale script id on pipeline reopen"
```

---

### Task 6: Auto-scroll to the first unfinished stage on pipeline mount

**Files:**
- Modify: `src/app/app/video/[id]/page.tsx`

**Interfaces:**
- Consumes: `derivePipelineStages` (existing, `src/features/video/utils/pipelineStages.ts`, unchanged).

- [ ] **Step 1: Add a one-shot scroll effect**

In `src/app/app/video/[id]/page.tsx`, import `derivePipelineStages` alongside the existing `StageKey` import:

```ts
import { derivePipelineStages, type StageKey } from "@/features/video/utils/pipelineStages";
```

Add a ref and an effect right after the `savedScriptId`-seeding effect from Task 5:

```ts
  const hasAutoScrolledRef = useRef(false);

  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    if (loadingVideo || !video) return;
    // Wait for the transcript query to settle at least once so `transcript`
    // isn't mistaken for "not started" while it's still loading.
    if (transcriptId && transcript === undefined) return;

    const stages = derivePipelineStages({
      whisperStatus: transcript?.whisper_status ?? null,
      hasSavedScript: Boolean(savedScriptId ?? scripts[0]),
      hasAudio: audios.length > 0,
    });
    const firstUnfinished = stages.find(
      (stage) => stage.key !== "done" && stage.state !== "done",
    );
    if (!firstUnfinished) return;

    hasAutoScrolledRef.current = true;
    handleStageClick(firstUnfinished.key);
  }, [loadingVideo, video, transcriptId, transcript, savedScriptId, scripts, audios]);
```

- [ ] **Step 2: Move `handleStageClick` above this new effect**

`handleStageClick` is currently defined after the data-loading effects, further down in the file. Since the new effect calls it, move the existing `handleStageClick` function definition to sit directly above the new `useEffect` added in Step 1 (function declarations aren't hoisted for `const`-style arrow functions used inside `useEffect`, so ordering matters for readability even though JS closures don't strictly require it here — keep them adjacent since they're conceptually paired):

```ts
  function handleStageClick(key: StageKey) {
    const target =
      key === "transcribe" ? transcribeRef.current
      : key === "script" ? scriptRef.current
      : voiceRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run `npm run dev`:
1. Open a pipeline for a video that has a transcript done but no script yet. Confirm the page auto-scrolls to the Kịch bản section on load.
2. Open a pipeline for a video with nothing done yet. Confirm the page stays at the top (transcribe is the first stage, already visible).
3. Open a pipeline for a video that's fully done (has audio). Confirm the page stays at the top (no unfinished stage to scroll to).
4. On any of the above, generate something (e.g. save a script) and confirm the page does **not** auto-scroll again afterward (one-shot guard works).

- [ ] **Step 5: Commit**

```bash
git add src/app/app/video/[id]/page.tsx
git commit -m "feat(video): auto-scroll pipeline page to the first unfinished stage"
```

---

## Self-Review Notes

- **Spec coverage:** §A/§B (data layer + type) → Task 1. §C (list badges) → Task 2 + 4. §D (version picker) → Task 5. §E (auto-scroll) → Task 6. i18n keys referenced throughout → Task 3. All spec sections have a task.
- **Extra fix beyond the spec:** Task 5 also seeds `savedScriptId` from `scripts[0]` on mount. The spec didn't call this out explicitly, but without it, reopening any already-scripted video leaves the Voice section and stage-bar state stuck on "not started" (a pre-existing bug), which would make both the version picker's voice history and Task 6's auto-scroll show wrong state. Fixing it here is necessary for §D and §E to actually work as designed.
- **Type consistency:** `deriveVideoFlags` (Task 1) is consumed with the same signature in Task 2. `ScriptEditor`'s `scripts` prop (Task 5) matches the `BrandScript[]` type already returned by `useScripts`. `onScriptCreated(scriptId: string)` keeps its original signature from the pre-existing SSE flow, reused unchanged for version switching.

# Video Pipeline UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "generated"/"failed" status more recognizable in the video list (its own table column with solid-color badges instead of a tiny tinted chip stacked under Status), and make the generated-audio list in the pipeline page richer (provider badge, relative timestamp, script text preview), inspired by ElevenLabs' history list layout.

**Architecture:** Two independent, additive UI changes on top of already-existing data (no new DB columns, no backend changes). A new pure `formatRelativeTime` utility (Vietnamese-only phrasing, no ICU dependency) is added first since the audio-list redesign consumes it.

**Tech Stack:** Next.js App Router, TypeScript (strict), Tailwind, Vitest.

## Global Constraints

- No `any` — use precise types; type assertions require a safety comment.
- No barrel `index.ts` files.
- Client Components keep their existing `// Client Component: [reason]` comment.
- i18n: `en.ts` must mirror every key added to `vi.ts` under `video` (compile-time checked via `Dictionary = StringLeaves<typeof vi>`).
- Follow existing test conventions: pure logic gets a Vitest unit test (see `src/features/video/utils/__tests__/pipelineStages.test.ts`, `deriveVideoFlags.test.ts`); this codebase does not unit-test React components — UI-only changes are verified via `npx tsc --noEmit` plus manual browser check, not new test infra.
- Provider names ("Vbee", "ElevenLabs") are hardcoded proper nouns, not translated — matches the existing precedent in `src/features/video/components/ScriptEditor.tsx` (`{p === "vbee" ? "Vbee" : "ElevenLabs"}`).

---

### Task 1: `formatRelativeTime` pure function

**Files:**
- Create: `src/features/video/utils/formatRelativeTime.ts`
- Create: `src/features/video/utils/__tests__/formatRelativeTime.test.ts`

**Interfaces:**
- Produces: `formatRelativeTime(iso: string, now?: Date): string` — exported from `src/features/video/utils/formatRelativeTime.ts`. Task 3 imports this.

- [ ] **Step 1: Write the failing test**

Create `src/features/video/utils/__tests__/formatRelativeTime.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/features/video/utils/formatRelativeTime";

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-01T12:00:00.000Z");

  it("returns 'Vừa xong' for under a minute ago", () => {
    const iso = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("Vừa xong");
  });

  it("returns minutes for under an hour ago", () => {
    const iso = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("5 phút trước");
  });

  it("returns hours for under a day ago", () => {
    const iso = new Date(now.getTime() - 3 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("3 giờ trước");
  });

  it("returns days for under 30 days ago", () => {
    const iso = new Date(now.getTime() - 5 * 24 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("5 ngày trước");
  });

  it("falls back to an absolute vi-VN date beyond 30 days", () => {
    const iso = new Date(now.getTime() - 40 * 24 * 60 * 60_000).toISOString();
    const expected = new Date(iso).toLocaleDateString("vi-VN");
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });

  it("defaults `now` to the current time when omitted", () => {
    const iso = new Date().toISOString();
    expect(formatRelativeTime(iso)).toBe("Vừa xong");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- formatRelativeTime`
Expected: FAIL — `Cannot find module '@/features/video/utils/formatRelativeTime'`

- [ ] **Step 3: Write the implementation**

Create `src/features/video/utils/formatRelativeTime.ts`:

```ts
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- formatRelativeTime`
Expected: PASS (6 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/features/video/utils/formatRelativeTime.ts src/features/video/utils/__tests__/formatRelativeTime.test.ts
git commit -m "feat(video): add formatRelativeTime pure utility"
```

(Note: per current project instructions, hold this commit — see the controller's execution notes. Do not run this step if told commits are deferred until the end.)

---

### Task 2: "Pipeline" status column in the video list

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/app/app/video/page.tsx`
- Modify: `src/features/video/components/CompetitorVideoCard.tsx`

**Interfaces:**
- Consumes: `video.hasGeneratedAudio`, `video.transcriptionFailed` (already on `CompetitorVideo`, already populated server-side — no changes needed there).
- Produces: `t.video.pipelineColumnHeader` (new i18n key, used only in `page.tsx`'s `<th>`).

- [ ] **Step 1: Add the i18n key to `vi.ts`**

In `src/lib/i18n/vi.ts`, after the `scriptVersionsCount` line (currently line 886, right before the `video` object's closing `},`), add:

```ts
    scriptVersionsCount: "{0} phiên bản đã tạo",
    pipelineColumnHeader: "Pipeline",
  },
```

- [ ] **Step 2: Add the matching key to `en.ts`**

In `src/lib/i18n/en.ts`, after the `scriptVersionsCount` line (currently line 889), add:

```ts
    scriptVersionsCount: "{0} versions",
    pipelineColumnHeader: "Pipeline",
  },
```

- [ ] **Step 3: Add the table header column**

In `src/app/app/video/page.tsx`, the table header currently reads (around line 161-170):

```tsx
                    <tr className="border-b border-border/20 bg-background-subtle">
                      <th className="py-2.5 pl-4 pr-3 text-xs font-medium text-foreground-subtle" />
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Video</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.views}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.likes}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.shares}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.comments}</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Status</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle" />
                    </tr>
```

Insert a new `<th>` between the Status column and the trailing empty (Actions) column:

```tsx
                    <tr className="border-b border-border/20 bg-background-subtle">
                      <th className="py-2.5 pl-4 pr-3 text-xs font-medium text-foreground-subtle" />
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Video</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.views}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.likes}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.shares}</th>
                      <th className="py-2.5 pr-4 text-right text-xs font-medium text-foreground-subtle">{t.video.comments}</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Status</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">{t.video.pipelineColumnHeader}</th>
                      <th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle" />
                    </tr>
```

- [ ] **Step 4: Revert the Status cell and add the Pipeline cell**

In `src/features/video/components/CompetitorVideoCard.tsx`, the Status `<td>` currently reads (around line 108-127):

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

Replace it with a plain Status cell plus a new Pipeline cell right after it:

```tsx
        {/* Status */}
        <td className="py-2 pr-4">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}>
            {statusLabel[video.status]}
          </span>
        </td>

        {/* Pipeline */}
        <td className="py-2 pr-4">
          {video.hasGeneratedAudio ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-medium text-white">
              <Check className="h-3 w-3" />
              {t.video.hasAudioBadge}
            </span>
          ) : video.transcriptionFailed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white">
              <AlertTriangle className="h-3 w-3" />
              {t.video.transcriptFailedBadge}
            </span>
          ) : (
            <span className="text-sm text-foreground-subtle">—</span>
          )}
        </td>
```

`Check` and `AlertTriangle` are already imported in this file (from the previous feature) — do not add another import line.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open the Video Trending page:
- Confirm the table now has a "Pipeline" column header between Status and the action buttons.
- For a winner video with generated audio: confirm a solid green "Đã tạo" badge shows in the Pipeline column (not tucked under Status anymore), and the Status column only shows the plain Winner pill.
- For a video with a failed transcription: confirm a solid red "Lỗi bóc băng" badge shows instead.
- For a video with neither: confirm a plain "—" shows in the Pipeline column.

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/vi.ts src/lib/i18n/en.ts src/app/app/video/page.tsx src/features/video/components/CompetitorVideoCard.tsx
git commit -m "feat(video): move pipeline status into its own solid-badge column"
```

(Note: per current project instructions, hold this commit — see the controller's execution notes.)

---

### Task 3: `AudioPlayer` — provider badge, relative time, script preview

**Files:**
- Modify: `src/features/video/components/AudioPlayer.tsx`

**Interfaces:**
- Consumes: `formatRelativeTime(iso: string, now?: Date): string` (Task 1). `audio.provider: TtsProvider` and `audio.brand_script?: Pick<BrandScript, "final_text" | "raw_text"> | null` (both already exist on `GeneratedAudio`, already populated by `generatedAudioService.ts:11`'s existing join — no service/API changes needed).

- [ ] **Step 1: Add imports and the provider-badge constants**

In `src/features/video/components/AudioPlayer.tsx`, change the imports and add two module-level constants right after the existing `AudioPlayerProps` interface:

```tsx
// Client Component: HTML5 audio player with play/pause, download, delete controls
"use client";

import { useRef, useState } from "react";
import { Play, Pause, Download, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { formatRelativeTime } from "@/features/video/utils/formatRelativeTime";
import type { GeneratedAudio } from "@/features/video/types";
import type { TtsProvider } from "@/services/scriptPrompt";

interface AudioPlayerProps {
  audio: GeneratedAudio;
  publicUrl: string;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const PROVIDER_BADGE: Record<TtsProvider, string> = {
  vbee: "bg-purple-500/15 text-purple-600",
  elevenlabs: "bg-blue-500/15 text-blue-600",
};

const PROVIDER_LABEL: Record<TtsProvider, string> = {
  vbee: "Vbee",
  elevenlabs: "ElevenLabs",
};
```

- [ ] **Step 2: Rewrite the component body**

Replace the rest of the file (from `export function AudioPlayer` to the end) with:

```tsx
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
  const scriptPreview = audio.brand_script?.final_text ?? audio.brand_script?.raw_text ?? null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background-elevated/30 px-4 py-3">
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PROVIDER_BADGE[audio.provider]}`}>
            {PROVIDER_LABEL[audio.provider]}
          </span>
          <span className="ml-auto shrink-0 text-xs text-foreground-subtle">
            {formatRelativeTime(audio.created_at)}
          </span>
        </div>
        {scriptPreview && (
          <p className="truncate text-xs text-foreground-subtle">{scriptPreview}</p>
        )}
        {duration && (
          <p className="text-xs text-foreground-subtle">{duration}</p>
        )}
      </div>

      <a
        href={publicUrl}
        download
        className="shrink-0 rounded-lg p-1.5 text-foreground-muted hover:bg-black/[0.04] hover:text-foreground"
        aria-label={t.video.downloadAudio}
      >
        <Download className="h-4 w-4" />
      </a>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          aria-label={t.video.deleteAudio}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

(Changes from the original: `items-center` → `items-start` on the outer flex container since the content block now wraps to 2-3 lines; play button `h-8 w-8`/`h-4 w-4` → `h-10 w-10`/`h-5 w-5`; added the provider badge + relative-time spans in a new inner flex row; added the `scriptPreview` paragraph; added `shrink-0` to the download/delete controls so they don't compress when the text content wraps.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open a pipeline page for a video with at least one generated audio:
- Confirm each audio row now shows: play button (larger), voice preset name, a small colored provider badge ("Vbee" or "ElevenLabs"), a relative timestamp on the right (e.g. "5 phút trước"), a script text preview line below, and the duration.
- Confirm download and delete buttons still work and don't get squeezed when the row wraps to multiple lines.
- Generate a fresh audio and confirm its timestamp reads "Vừa xong" immediately after creation.

- [ ] **Step 5: Commit**

```bash
git add src/features/video/components/AudioPlayer.tsx
git commit -m "feat(video): redesign AudioPlayer with provider badge, relative time, script preview"
```

(Note: per current project instructions, hold this commit — see the controller's execution notes.)

---

## Self-Review Notes

- **Spec coverage:** §A (Pipeline column) → Task 2. §B (AudioPlayer redesign + `formatRelativeTime`) → Tasks 1 + 3. All spec sections have a task.
- **Placeholder scan:** none found — every step has literal code.
- **Type consistency:** `formatRelativeTime(iso: string, now?: Date): string` (Task 1) is imported and called with the same signature in Task 3 (`formatRelativeTime(audio.created_at)`, relying on the default `now`). `TtsProvider` is imported from `@/services/scriptPrompt` in Task 3, matching where it's actually defined (confirmed: `src/services/scriptPrompt.ts:1`), not redefined locally.

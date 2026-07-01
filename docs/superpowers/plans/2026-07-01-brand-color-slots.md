# Brand Color Slots (No Auto-Default) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brand Setup shows exactly the colors a brand has configured — no auto-filled defaults for missing slots, and a clear visual difference between "configured" and "not set" swatches in both the edit form and the live preview.

**Architecture:** Brand kit colors move from a hardcoded 6-value default record to a `Record<ColorKey, string | null>` model. A new pure-logic util module (`src/features/brand/utils/brandColorSlots.ts`) centralizes the shared types/constants and the "which colors in a tier are actually set" query, tested in isolation. `BrandSetupForm.tsx` gets a small local `ColorSlot` component (same file, following the existing `LogoUpload` co-location pattern) that renders either a real swatch+hex+clear-button, or a dashed "not set" placeholder that opens the native color picker. The brand-kit PUT route is fixed to distinguish an omitted field (leave untouched) from an explicit `null` (clear it) — today both collapse to `undefined` in `route.ts`, so no field can ever be cleared once set.

**Tech Stack:** Next.js App Router, React (client component), TypeScript, Vitest, Tailwind CSS, Supabase.

## Global Constraints

- No `any`; no `unknown`-free type assertions without a comment explaining why they're safe (per `CLAUDE.md`).
- Props interfaces named `[ComponentName]Props` (per `CLAUDE.md`).
- No barrel `index.ts` files; import directly from source files (per `CLAUDE.md`).
- Magic literals that are genuinely shared constants get named identifiers, not inline repeats (per `CLAUDE.md`).
- Scope is Brand Setup only (form + preview). Do **not** touch `WorkspaceView.tsx`, `LibraryView.tsx`, or `StealthView.tsx` — they keep their existing default-color fallback (out of scope, confirmed with user; see `docs/superpowers/specs/2026-07-01-brand-color-slots-design.md`).
- **Do not run `git commit` for any step in this plan unless the user explicitly asks in that session.** Stage changes with `git add` at the end of each task and stop there — this overrides the usual "Commit" step in the plan template for this feature.
- No automated component tests exist for this feature area today (client components are verified manually in the browser per `CLAUDE.md`); only pure-logic utils and API routes have Vitest coverage in this codebase, so that's what gets automated tests here — the `ColorSlot` rendering is verified manually.

---

## Task 1: Brand color slot utilities (pure logic)

**Files:**
- Create: `src/features/brand/utils/brandColorSlots.ts`
- Test: `src/features/brand/utils/__tests__/brandColorSlots.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no dependencies on other tasks).
- Produces (used by Task 3):
  - `type ColorTier = "primary" | "secondary" | "accent"`
  - `type ColorKey = \`${ColorTier}1\` | \`${ColorTier}2\`` (i.e. `"primary1" | "primary2" | "secondary1" | "secondary2" | "accent1" | "accent2"`)
  - `type BrandColors = Record<ColorKey, string | null>`
  - `const COLOR_TIERS: readonly ColorTier[]`
  - `const EMPTY_BRAND_COLORS: BrandColors`
  - `function getConfiguredTierColors(colors: BrandColors, keys: readonly [ColorKey, ColorKey]): { key: ColorKey; value: string }[]`
  - `function hasAnyConfiguredColor(colors: BrandColors): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/features/brand/utils/__tests__/brandColorSlots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  EMPTY_BRAND_COLORS,
  getConfiguredTierColors,
  hasAnyConfiguredColor,
} from "../brandColorSlots";

describe("getConfiguredTierColors", () => {
  it("returns both keys when both colors in the tier are set", () => {
    const colors = { ...EMPTY_BRAND_COLORS, primary1: "#111111", primary2: "#222222" };
    expect(getConfiguredTierColors(colors, ["primary1", "primary2"])).toEqual([
      { key: "primary1", value: "#111111" },
      { key: "primary2", value: "#222222" },
    ]);
  });

  it("returns only the configured key when one color in the tier is null", () => {
    const colors = { ...EMPTY_BRAND_COLORS, accent1: "#facc15" };
    expect(getConfiguredTierColors(colors, ["accent1", "accent2"])).toEqual([
      { key: "accent1", value: "#facc15" },
    ]);
  });

  it("returns an empty array when neither color in the tier is set", () => {
    expect(getConfiguredTierColors(EMPTY_BRAND_COLORS, ["secondary1", "secondary2"])).toEqual([]);
  });
});

describe("hasAnyConfiguredColor", () => {
  it("returns false when no colors are configured", () => {
    expect(hasAnyConfiguredColor(EMPTY_BRAND_COLORS)).toBe(false);
  });

  it("returns true when at least one color is configured", () => {
    expect(hasAnyConfiguredColor({ ...EMPTY_BRAND_COLORS, accent2: "#f59e0b" })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/features/brand/utils/__tests__/brandColorSlots.test.ts`
Expected: FAIL — `Cannot find module '../brandColorSlots'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/features/brand/utils/brandColorSlots.ts`:

```ts
export type ColorTier = "primary" | "secondary" | "accent";
export type ColorKey = `${ColorTier}1` | `${ColorTier}2`;
export type BrandColors = Record<ColorKey, string | null>;

export const COLOR_TIERS: readonly ColorTier[] = ["primary", "secondary", "accent"];

export const EMPTY_BRAND_COLORS: BrandColors = {
  primary1: null,
  primary2: null,
  secondary1: null,
  secondary2: null,
  accent1: null,
  accent2: null,
};

export function getConfiguredTierColors(
  colors: BrandColors,
  keys: readonly [ColorKey, ColorKey],
): { key: ColorKey; value: string }[] {
  return keys
    .map((key) => ({ key, value: colors[key] }))
    .filter((entry): entry is { key: ColorKey; value: string } => entry.value !== null);
}

export function hasAnyConfiguredColor(colors: BrandColors): boolean {
  return Object.values(colors).some((value) => value !== null);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/features/brand/utils/__tests__/brandColorSlots.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Stage changes (do not commit)**

```bash
git add src/features/brand/utils/brandColorSlots.ts src/features/brand/utils/__tests__/brandColorSlots.test.ts
```

Stop here — do not run `git commit`. Per this session's instructions, commits happen only when the user explicitly asks.

---

## Task 2: Backend — distinguish "clear to null" from "leave untouched"

**Files:**
- Modify: `src/app/api/brand-kit/[brandId]/route.ts:23-65`
- Test: `src/app/api/__tests__/brand-kit.test.ts` (extend existing `describe("PUT ...")` block)

**Interfaces:**
- Consumes: nothing from Task 1 (independent; can run in parallel with Task 1 if using subagents).
- Produces: no new exports — internal behavior change only. `BrandKitService.saveBrandKit` (unchanged) already accepts `string | null | undefined` for the 6 color fields via `BrandKitUpdate`.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/api/__tests__/brand-kit.test.ts`, inside the existing `describe("PUT /api/brand-kit/[brandId]", ...)` block (after the `"ignores invalid font_source values"` test):

```ts
  it("clears a color to null when the field is explicitly sent as null", async () => {
    mockSaveBrandKit.mockResolvedValue({});
    mockGetLogoUrls.mockReturnValue(null);

    await PUT(makeRequest({ primary_color_1: null }), { params: mockParams });
    expect(mockSaveBrandKit).toHaveBeenCalledWith(
      "brand-123",
      expect.objectContaining({ primary_color_1: null }),
    );
  });

  it("leaves a color untouched when the field is omitted from the payload", async () => {
    mockSaveBrandKit.mockResolvedValue({});
    mockGetLogoUrls.mockReturnValue(null);

    await PUT(makeRequest({ typography: "Inter" }), { params: mockParams });
    expect(mockSaveBrandKit).toHaveBeenCalledWith(
      "brand-123",
      expect.objectContaining({ primary_color_1: undefined }),
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/app/api/__tests__/brand-kit.test.ts`
Expected: FAIL on the new "clears a color to null" test — `primary_color_1` is received as `undefined` instead of `null`, because `route.ts` currently does `typeof primary_color_1 === 'string' ? primary_color_1 : undefined`, which collapses `null` to `undefined`.

- [ ] **Step 3: Fix the route**

In `src/app/api/brand-kit/[brandId]/route.ts`, add a helper above `export async function PUT` (after the `GET` function, before line 23):

```ts
function toNullableString(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value
  if (value === null) return null
  return undefined
}
```

Then replace the 6 color-field lines inside `service.saveBrandKit(brandId, { ... })` (currently lines 52-57):

```ts
      primary_color_1: toNullableString(primary_color_1),
      primary_color_2: toNullableString(primary_color_2),
      secondary_color_1: toNullableString(secondary_color_1),
      secondary_color_2: toNullableString(secondary_color_2),
      accent_color_1: toNullableString(accent_color_1),
      accent_color_2: toNullableString(accent_color_2),
```

(`typography` and `font_source` lines above them are unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/app/api/__tests__/brand-kit.test.ts`
Expected: PASS — all tests in the file, including the 2 new ones.

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npm run test`
Expected: PASS — no other suite references the old collapsed-to-undefined behavior.

- [ ] **Step 6: Stage changes (do not commit)**

```bash
git add src/app/api/brand-kit/[brandId]/route.ts src/app/api/__tests__/brand-kit.test.ts
```

Stop here — do not run `git commit`.

---

## Task 3: Brand Setup form + preview — no auto-default colors

**Files:**
- Modify: `src/features/brand/components/BrandSetupForm.tsx` (full file provided as read; key line ranges below refer to the version before this task's edits)
- Modify: `src/lib/i18n/vi.ts` (namespace `brandSetup`, after `colorSwatches` at line 409)
- Modify: `src/lib/i18n/en.ts` (namespace `brandSetup`, after `colorSwatches` at line 412)
- Manual verification: dev server + browser (no automated test — this codebase doesn't unit-test client components; see Global Constraints)

**Interfaces:**
- Consumes from Task 1: `ColorKey`, `BrandColors`, `COLOR_TIERS`, `EMPTY_BRAND_COLORS`, `getConfiguredTierColors`, `hasAnyConfiguredColor` from `@/features/brand/utils/brandColorSlots`.
- Depends on Task 2 being applied for the "clear color persists after Save" behavior to actually work end-to-end (the UI change alone only affects local state; persistence correctness needs the route fix).
- Produces: no new exports (top-level component `BrandSetupForm` unchanged in name/signature; adds a new local component `ColorSlot`, not exported).

- [ ] **Step 1: Add i18n strings**

In `src/lib/i18n/vi.ts`, inside the `brandSetup` object, right after the `colorSwatches: "Bảng màu",` line:

```ts
    colorNotSet: "Chưa đặt",
    addColorAria: "Thêm màu",
    removeColorAria: "Xóa màu",
    noColorsConfigured: "Chưa cấu hình màu nào",
```

In `src/lib/i18n/en.ts`, inside the `brandSetup` object, right after the `colorSwatches: "Color Swatches",` line:

```ts
    colorNotSet: "Not set",
    addColorAria: "Add color",
    removeColorAria: "Remove color",
    noColorsConfigured: "No colors configured yet",
```

- [ ] **Step 2: Replace `DEFAULT_COLORS` with the nullable color model**

In `src/features/brand/components/BrandSetupForm.tsx`:

Replace the import block for lucide icons (lines 22-34) to add `Plus`:

```ts
import {
  AlignLeft,
  Eye,
  ImageIcon,
  Info,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
```

Add an import for the new util module, right after the `lucide-react` import:

```ts
import {
  COLOR_TIERS,
  EMPTY_BRAND_COLORS,
  getConfiguredTierColors,
  hasAnyConfiguredColor,
  type BrandColors,
  type ColorKey,
} from "@/features/brand/utils/brandColorSlots";
```

Replace the `DEFAULT_COLORS` constant (lines 37-44) with:

```ts
const COLOR_PICKER_SEED = "#000000"; // Native <input type="color"> requires a value even before the user has picked one; never displayed as a swatch or persisted on its own.
```

Replace the `colors` state declaration (line 86):

```ts
  const [colors, setColors] = useState<BrandColors>(EMPTY_BRAND_COLORS);
```

Replace the brand-kit-loaded `useEffect` body (lines 104-118) — only the `setColors` call changes:

```ts
  useEffect(() => {
    const kit = brandKit.data?.kit as Record<string, string | null> | null;
    if (kit) {
      setTypography((kit.typography as string) ?? "Inter");
      setFontSource((kit.font_source as "google" | "local" | null) ?? "google");
      setColors({
        primary1: kit.primary_color_1 ?? null,
        primary2: kit.primary_color_2 ?? null,
        secondary1: kit.secondary_color_1 ?? null,
        secondary2: kit.secondary_color_2 ?? null,
        accent1: kit.accent_color_1 ?? null,
        accent2: kit.accent_color_2 ?? null,
      });
    }
  }, [brandKit.data]);
```

Replace `updateColor` (lines 134-136) and add `clearColor` right after it:

```ts
  function updateColor(key: ColorKey, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
  }

  function clearColor(key: ColorKey) {
    setColors((prev) => ({ ...prev, [key]: null }));
  }
```

In `handleResetBrand` (lines 251-261), replace `setColors(DEFAULT_COLORS);` with:

```ts
    setColors(EMPTY_BRAND_COLORS);
```

- [ ] **Step 3: Add the `ColorSlot` component**

In `src/features/brand/components/BrandSetupForm.tsx`, add this new component after the closing brace of the `LogoUpload` function (end of file, after line 908), following the same co-located-component pattern already used for `LogoUpload` in this file:

```tsx
interface ColorSlotProps {
  value: string | null;
  canEdit: boolean;
  notSetLabel: string;
  addAriaLabel: string;
  removeAriaLabel: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

function ColorSlot({
  value,
  canEdit,
  notSetLabel,
  addAriaLabel,
  removeAriaLabel,
  onChange,
  onClear,
}: ColorSlotProps) {
  if (value === null && !canEdit) {
    return (
      <div className="flex-1 flex items-center gap-1.5 p-2 border border-dashed border-border rounded-lg bg-background-subtle/50 text-foreground-subtle">
        <div className="w-6 h-6 rounded shrink-0 border border-dashed border-border-strong" />
        <span className="text-[10px] uppercase truncate">{notSetLabel}</span>
      </div>
    );
  }

  if (value === null) {
    return (
      <label
        className="flex-1 flex items-center gap-1.5 p-2 border border-dashed border-border rounded-lg bg-background-subtle/50 text-foreground-subtle cursor-pointer hover:border-primary/50 hover:text-primary/60 transition-colors"
        aria-label={addAriaLabel}
      >
        <div className="w-6 h-6 rounded shrink-0 border border-dashed border-border-strong flex items-center justify-center">
          <Plus className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase truncate">{notSetLabel}</span>
        <input
          type="color"
          value={COLOR_PICKER_SEED}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1.5 p-2 border border-border rounded-lg bg-background-subtle">
      <label className={canEdit ? "cursor-pointer" : "cursor-default"}>
        <div className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: value }} />
        {canEdit && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        )}
      </label>
      <span className="text-[10px] font-mono uppercase text-foreground-muted truncate">
        {value}
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={onClear}
          aria-label={removeAriaLabel}
          className="ml-auto shrink-0 text-foreground-subtle hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire `ColorSlot` into the edit form**

Replace the color-tier editing block (lines 387-452, the `<div className="space-y-3">...</div>` inside the typography/colors grid) with:

```tsx
                <div className="space-y-3">
                  {COLOR_TIERS.map((tier) => {
                    // Template-literal concatenation can't be narrowed to the ColorKey union by TS; both suffixes are always valid for every tier.
                    const key1 = `${tier}1` as ColorKey;
                    const key2 = `${tier}2` as ColorKey;
                    return (
                      <div key={tier}>
                        <label className="block text-sm font-semibold text-foreground-muted mb-2">
                          {tierLabels[tier]}
                        </label>
                        <div className="flex gap-2">
                          <ColorSlot
                            value={colors[key1]}
                            canEdit={canEdit}
                            notSetLabel={t.brandSetup.colorNotSet}
                            addAriaLabel={t.brandSetup.addColorAria}
                            removeAriaLabel={t.brandSetup.removeColorAria}
                            onChange={(value) => updateColor(key1, value)}
                            onClear={() => clearColor(key1)}
                          />
                          <ColorSlot
                            value={colors[key2]}
                            canEdit={canEdit}
                            notSetLabel={t.brandSetup.colorNotSet}
                            addAriaLabel={t.brandSetup.addColorAria}
                            removeAriaLabel={t.brandSetup.removeColorAria}
                            onChange={(value) => updateColor(key2, value)}
                            onClear={() => clearColor(key2)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
```

- [ ] **Step 5: Wire the live preview to only show configured colors**

Replace the "Color swatches" preview block (lines 503-535, from `<div>` wrapping `{t.brandSetup.colorSwatches}` through its closing `</div>`) with:

```tsx
                  <div>
                    <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest mb-3">
                      {t.brandSetup.colorSwatches}
                    </p>
                    {hasAnyConfiguredColor(colors) ? (
                      <div className="space-y-3">
                        {COLOR_TIERS.map((tier) => {
                          // Template-literal concatenation can't be narrowed to the ColorKey union by TS; both suffixes are always valid for every tier.
                          const key1 = `${tier}1` as ColorKey;
                          const key2 = `${tier}2` as ColorKey;
                          const presentColors = getConfiguredTierColors(colors, [key1, key2]);
                          if (presentColors.length === 0) return null;
                          return (
                            <div key={tier}>
                              <p className="text-[10px] font-mono uppercase text-foreground-subtle mb-1">
                                {tierLabels[tier]}
                              </p>
                              <div className="flex gap-2">
                                {presentColors.map(({ key, value }) => (
                                  <div
                                    key={key}
                                    className="flex-1 h-10 rounded-lg shadow-inner"
                                    style={{ backgroundColor: value }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-subtle italic">
                        {t.brandSetup.noColorsConfigured}
                      </p>
                    )}
                  </div>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `BrandSetupForm.tsx`, `brandColorSlots.ts`, `vi.ts`, or `en.ts`. (Pre-existing unrelated errors elsewhere in the repo, if any, are not this task's concern — only confirm nothing new surfaces in the touched files.)

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: PASS — includes the Task 1 and Task 2 suites plus everything else, no regressions.

- [ ] **Step 8: Manual verification in the browser**

Run: `npm run dev`, open the Brand Setup page for a brand.

Check each scenario and confirm the observed behavior matches:

1. **Brand new (no `brand_kits` row yet):** all 6 edit-form slots show the dashed "+  Chưa đặt" placeholder; the preview's "Bảng màu" section shows the italic "Chưa cấu hình màu nào" line instead of any swatch.
2. **Partially configured (e.g. only `accent_color_2` set, rest null):** in the edit form, 5 slots are dashed placeholders and 1 (Nhấn, second slot) shows the real swatch + hex + "x". In the preview, only the "Nhấn" tier row renders, with a single swatch (not two, no empty second box) — "Chính" and "Phụ" rows are absent entirely.
3. **Set a previously-empty slot:** click a dashed placeholder, pick a color in the native picker → it immediately turns into a real swatch with hex + "x" in the edit form, and the preview updates to show that tier (and only the slot(s) actually set).
4. **Clear a set slot:** click "x" on a configured swatch → it reverts to the dashed placeholder immediately, and disappears from the preview. Click "Lưu Brand Kit", then reload the page → the slot is still a dashed placeholder (confirms Task 2's null persisted, not silently kept as the old value).
5. **Reset Brand:** click "Reset brand" → all 6 slots go back to dashed placeholders (not the old hardcoded green/amber defaults).
6. **View-only mode (no `profile`, i.e. `canEdit === false`):** unset slots show a plain muted "Chưa đặt" box with no clickable affordance and no "x" button on set slots.

- [ ] **Step 9: Stage changes (do not commit)**

```bash
git add src/features/brand/components/BrandSetupForm.tsx src/lib/i18n/vi.ts src/lib/i18n/en.ts
```

Stop here — do not run `git commit`. Wait for the user to explicitly ask before committing anything from this plan.

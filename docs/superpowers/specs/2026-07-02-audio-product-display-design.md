# Audio Product Display — Design

**Goal:** Show which brand product a generated audio was created for, in both the "Thư viện Audio" (Audio Library) list table and the "Chi tiết Audio" (Audio Detail) modal.

## Problem

`generated_audios` rows link to a `brand_scripts` row via `script_id`. The script may have been generated for a specific product, but today that link only exists as an untyped, unindexed `productId` string buried inside `brand_scripts.prompt_config` (a JSONB column) — there is no real foreign key, so it cannot be joined via Supabase's nested `select()`, and there's no product name available without a second manual lookup.

## Data Model Change

Add a real column to `brand_scripts`:

```sql
ALTER TABLE public.brand_scripts
  ADD COLUMN product_id UUID NULL REFERENCES public.brand_products(id) ON DELETE SET NULL;

UPDATE public.brand_scripts bs
SET product_id = (bs.prompt_config->>'productId')::uuid
WHERE bs.prompt_config->>'productId' IS NOT NULL
  AND bs.prompt_config->>'productId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.brand_products bp WHERE bp.id = (bs.prompt_config->>'productId')::uuid
  );
```

The backfill only sets `product_id` when the JSON value is a syntactically valid UUID AND that product still exists in `brand_products` — a deleted or malformed product reference silently becomes `NULL` rather than a dangling/invalid value or a migration failure.

`prompt_config.productId` (the JSON copy) is left untouched — it is not read from anymore going forward, but removing it is out of scope for this change.

## Backend Changes

- **`ScriptService.create()`** (`src/services/scriptService.ts`): the `promptConfig` argument it already receives already carries `productId` (set at `src/app/api/video/scripts/route.ts:160`) — no new parameter or route change is needed. `create()` extracts `promptConfig.productId ?? null` and writes it to the new `product_id` column on insert, alongside the unchanged `prompt_config` JSON (which keeps its own `productId` field, read by nothing anymore but left as-is for backward compatibility).
- **`GeneratedAudioService.listByBrand()`** (`src/services/generatedAudioService.ts`): extend the existing nested select to also pull the product name through the new FK:
  ```
  brand_script:brand_scripts(final_text, raw_text, brand_product:brand_products(id, name))
  ```
- **Types** (`src/features/video/types.ts`):
  - `BrandScript.product_id: string | null` (new field on the base interface).
  - `GeneratedAudio.brand_script` widens from `Pick<BrandScript, "final_text" | "raw_text">` to also include a nested `brand_product: Pick<BrandProduct, "id" | "name"> | null`.

## Frontend Changes

- **`AudioDetailModal.tsx`**: add one more `dt`/`dd` row, label "Sản phẩm" (hardcoded string, no i18n key — per explicit user instruction), value `audio.brand_script?.brand_product?.name ?? "—"`.
- **Audio Library table** (`src/app/app/video/audio/page.tsx`): add one more `<th>`/`<td>` column, header "Sản phẩm" (hardcoded), same fallback value logic.
- No i18n keys added to `vi.ts`/`en.ts` for this feature, per explicit user instruction (deviates from this page's existing convention of using `t.video.*` for all other labels — an accepted, intentional exception for this feature only).

## Out of Scope

- Removing/cleaning up `prompt_config.productId` (the JSON copy stays as a legacy field).
- Any UI to filter/search audio by product.
- Any change to how scripts choose or attach a product at creation time — this only makes the existing link queryable and displayable.

## Testing

- `ScriptService.create()`: unit test that `product_id` is written to the insert payload from `promptConfig.productId`, and that it's `null` when `promptConfig.productId` is absent.
- `GeneratedAudioService.listByBrand()`: unit test that the nested `brand_product` join is included and mapped through.
- No automated UI test for the two display changes, matching this repo's existing convention (no `.test.tsx` files anywhere) — verified via `tsc --noEmit` plus a manual/static trace, same as prior UI-only tasks in this codebase.

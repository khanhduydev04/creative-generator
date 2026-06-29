# Video Pipeline Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nối liền các stage Winner → Bóc băng → Kịch bản → Giọng đọc thành một workflow mượt mà, và bổ sung cấu hình tham số marketing cho sản phẩm dùng trong sinh kịch bản.

**Architecture:** Next.js App Router (RSC mặc định, các component tương tác là Client Component). DB Supabase Postgres + RLS. Thêm 3 cột marketing vào `brand_products`; logic sinh prompt và suy ra trạng thái stage được tách thành hàm thuần để unit-test bằng Vitest. UI giữ kiểu 1 trang cuộn + thanh trạng thái + mở khóa dần.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict, no `any`), TanStack Query, Tailwind, Supabase JS, Vitest, lucide-react.

## Global Constraints

- TypeScript bắt buộc kiểu tường minh; **không** dùng `any` (dùng `unknown` + type guard). Type assertion phải kèm comment giải thích.
- **Không** dùng enum — dùng `as const` object / union literal.
- **Không** barrel `index.ts`; import trực tiếp từ file nguồn.
- Client Component phải có comment `// Client Component: [lý do]` phía trên `"use client"`.
- Một component chính/ file, tên file PascalCase khớp export.
- Magic number/string tách thành hằng số đặt tên.
- Gate tự động mỗi task code: `npx tsc --noEmit` PASS (và `npm test` PASS cho task có unit test).
- Ngôn ngữ UI: chuỗi mới phải thêm vào cả `src/lib/i18n/vi.ts` và `src/lib/i18n/en.ts`.
- Override tham số sản phẩm ở Stage 4 **không** ghi đè default trên `brand_products`; chỉ đi vào `prompt_config` của script.
- Commit thường xuyên, mỗi task 1 commit.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| `supabase/migrations/11_brand_product_marketing_fields.sql` (mới) | Thêm 3 cột marketing |
| `src/types/database.types.ts` (sửa) | Thêm 3 cột vào Row/Insert/Update `brand_products` |
| `src/features/brand/types.ts` (sửa) | Thêm 3 field vào `BrandProduct` |
| `src/app/api/brand-products/route.ts` (sửa) | POST nhận 3 field |
| `src/app/api/brand-products/[id]/route.ts` (sửa) | PUT nhận 3 field |
| `src/hooks/api/useProducts.ts` (sửa) | Mở rộng payload create/update |
| `src/features/brand/components/ProductsTab.tsx` (sửa) | 3 textarea trong form |
| `src/services/scriptPrompt.ts` (mới) | Hàm thuần build system prompt |
| `src/services/__tests__/scriptPrompt.test.ts` (mới) | Unit test prompt builder |
| `src/features/video/types.ts` (sửa) | Mở rộng `PromptConfig` + `CreateScriptRequest` |
| `src/app/api/video/scripts/route.ts` (sửa) | Dùng `buildScriptSystemPrompt`, nạp field marketing |
| `src/features/video/components/ScriptEditor.tsx` (sửa) | Panel cấu hình sản phẩm + override |
| `src/features/video/utils/pipelineStages.ts` (mới) | Hàm thuần suy ra trạng thái 4 stage |
| `src/features/video/utils/__tests__/pipelineStages.test.ts` (mới) | Unit test derive |
| `src/features/video/components/PipelineStageBar.tsx` (mới) | Thanh trạng thái stage |
| `src/app/app/video/[id]/page.tsx` (sửa) | Gắn stage bar + gating + gộp create/run |
| `src/features/video/components/CompetitorVideoCard.tsx` (sửa) | Nút "Mở pipeline" |
| `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts` (sửa) | Chuỗi mới |

---

## Task 1: Schema — 3 cột marketing cho `brand_products`

**Files:**
- Create: `supabase/migrations/11_brand_product_marketing_fields.sql`
- Modify: `src/types/database.types.ts:188-238`
- Modify: `src/features/brand/types.ts:24-40`

**Interfaces:**
- Produces: 3 cột text nullable `attributes`, `target_audience`, `selling_points` trên bảng `brand_products`; `BrandProduct` có thêm 3 field cùng tên (`string | null`).

- [ ] **Step 1: Viết migration**

Create `supabase/migrations/11_brand_product_marketing_fields.sql`:

```sql
-- 11_brand_product_marketing_fields.sql
-- Add marketing config fields used by Stage 4 script generation.
alter table public.brand_products
  add column if not exists attributes text,
  add column if not exists target_audience text,
  add column if not exists selling_points text;

comment on column public.brand_products.attributes is 'Đặc tính sản phẩm (vd: độ cay, nguyên liệu)';
comment on column public.brand_products.target_audience is 'Đối tượng khách hàng mục tiêu';
comment on column public.brand_products.selling_points is 'Điểm bán/USP (vd: freeship, giá tốt)';
```

- [ ] **Step 2: Áp migration qua Supabase MCP**

Dùng `mcp__supabase__apply_migration` với name `11_brand_product_marketing_fields` và nội dung file trên.
Expected: success, không lỗi.

- [ ] **Step 3: Cập nhật `database.types.ts`**

Trong `src/types/database.types.ts`, khối `brand_products`, thêm 3 dòng vào **Row** (sau `accent_color_2: string | null` dòng 202):

```ts
          accent_color_2: string | null
          attributes: string | null
          target_audience: string | null
          selling_points: string | null
          created_at: string
```

Thêm tương tự vào **Insert** (sau `accent_color_2?: string | null` dòng 219) và **Update** (sau dòng 236), dạng optional:

```ts
          accent_color_2?: string | null
          attributes?: string | null
          target_audience?: string | null
          selling_points?: string | null
          created_at?: string
```

- [ ] **Step 4: Cập nhật `BrandProduct` type**

Trong `src/features/brand/types.ts`, thêm vào interface `BrandProduct` (sau `accent_color_2: string | null;`):

```ts
  accent_color_2: string | null;
  attributes: string | null;
  target_audience: string | null;
  selling_points: string | null;
  created_at: string;
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (0 lỗi).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/11_brand_product_marketing_fields.sql src/types/database.types.ts src/features/brand/types.ts
git commit -m "feat(brand): add marketing config columns to brand_products"
```

---

## Task 2: API brand-products nhận field marketing

**Files:**
- Modify: `src/app/api/brand-products/route.ts:23-60`
- Modify: `src/app/api/brand-products/[id]/route.ts:27-61`
- Modify: `src/hooks/api/useProducts.ts:22-77`

**Interfaces:**
- Consumes: cột DB + types từ Task 1.
- Produces: POST `/api/brand-products` và PUT `/api/brand-products/[id]` chấp nhận `attributes`, `target_audience`, `selling_points` (string | null). Hook `useCreateProduct`/`useUpdateProduct` gửi 3 field này.

- [ ] **Step 1: POST route — nhận 3 field**

Trong `src/app/api/brand-products/route.ts`, mở rộng kiểu body và lệnh create:

```ts
    const body = await request.json() as {
      brand_id: string
      name: string
      description?: string | null
      images: string[]
      product_url?: string | null
      attributes?: string | null
      target_audience?: string | null
      selling_points?: string | null
    }
```

```ts
    const product = await service.create({
      brand_id: body.brand_id,
      name: body.name,
      description: body.description ?? null,
      images: body.images,
      product_url: body.product_url ?? null,
      attributes: body.attributes ?? null,
      target_audience: body.target_audience ?? null,
      selling_points: body.selling_points ?? null,
    })
```

- [ ] **Step 2: PUT route — nhận 3 field**

Trong `src/app/api/brand-products/[id]/route.ts`, mở rộng kiểu body (service.update đã pass-through nguyên `body`):

```ts
    const body = await request.json() as {
      name?: string
      description?: string | null
      images?: string[]
      attributes?: string | null
      target_audience?: string | null
      selling_points?: string | null
    }
```

- [ ] **Step 3: Hook — mở rộng payload**

Trong `src/hooks/api/useProducts.ts`, thêm 3 field optional `attributes?`, `target_audience?`, `selling_points?` (kiểu `string | null`) vào kiểu `mutationFn` của **cả** `useCreateProduct` và `useUpdateProduct` (đặt cạnh các field màu sắc hiện có).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/brand-products src/hooks/api/useProducts.ts
git commit -m "feat(brand): persist marketing fields through product API + hooks"
```

---

## Task 3: i18n — chuỗi mới (vi + en)

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

**Interfaces:**
- Produces: key i18n dùng ở Task 4, 6, 8, 10, 11. Trong `brand`: `productAttributes`, `productAttributesPlaceholder`, `targetAudience`, `targetAudiencePlaceholder`, `sellingPoints`, `sellingPointsPlaceholder`, `marketingConfig`. Trong `video`: `openPipeline`, `stageTranscribe`, `stageScript`, `stageVoice`, `stageDone`, `stageLocked`, `productConfigTitle`, `productConfigHint`, `attributesLabel`, `targetAudienceLabel`, `sellingPointsLabel`.

- [ ] **Step 1: Thêm key vào `brand` (vi.ts)**

Trong object `brand` của `src/lib/i18n/vi.ts`, thêm:

```ts
    marketingConfig: "Cấu hình marketing",
    productAttributes: "Đặc tính sản phẩm",
    productAttributesPlaceholder: "VD: độ cay xé lưỡi, nguyên liệu chân ái",
    targetAudience: "Đối tượng khách hàng",
    targetAudiencePlaceholder: "VD: dân văn phòng 22–35, thích ăn cay",
    sellingPoints: "Điểm bán / USP",
    sellingPointsPlaceholder: "VD: freeship, giá tốt, giao nhanh",
```

- [ ] **Step 2: Thêm key vào `video` (vi.ts)**

Trong object `video` của `src/lib/i18n/vi.ts`, thêm:

```ts
    openPipeline: "Mở pipeline",
    stageTranscribe: "Bóc băng",
    stageScript: "Kịch bản",
    stageVoice: "Giọng đọc",
    stageDone: "Hoàn tất",
    stageLocked: "Hoàn tất bước trước để mở khóa",
    productConfigTitle: "Cấu hình sản phẩm",
    productConfigHint: "Nạp sẵn từ sản phẩm, có thể sửa riêng cho video này",
    attributesLabel: "Đặc tính",
    targetAudienceLabel: "Đối tượng KH",
    sellingPointsLabel: "Điểm bán / USP",
```

- [ ] **Step 3: Thêm key tương ứng vào en.ts**

Trong `src/lib/i18n/en.ts`, `brand`:

```ts
    marketingConfig: "Marketing config",
    productAttributes: "Product attributes",
    productAttributesPlaceholder: "e.g. tongue-numbing spicy, premium ingredients",
    targetAudience: "Target audience",
    targetAudiencePlaceholder: "e.g. office workers 22–35 who love spicy food",
    sellingPoints: "Selling points / USP",
    sellingPointsPlaceholder: "e.g. free shipping, great price, fast delivery",
```

`video`:

```ts
    openPipeline: "Open pipeline",
    stageTranscribe: "Transcribe",
    stageScript: "Script",
    stageVoice: "Voice",
    stageDone: "Done",
    stageLocked: "Finish the previous step to unlock",
    productConfigTitle: "Product config",
    productConfigHint: "Prefilled from product, editable for this video only",
    attributesLabel: "Attributes",
    targetAudienceLabel: "Audience",
    sellingPointsLabel: "Selling points / USP",
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (nếu translation dùng kiểu chung, vi và en phải khớp key — đảm bảo thêm đủ cả 2 file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/vi.ts src/lib/i18n/en.ts
git commit -m "feat(i18n): add pipeline + product marketing strings"
```

---

## Task 4: Product form — 3 textarea marketing

**Files:**
- Modify: `src/features/brand/components/ProductsTab.tsx:262-378` (component `ProductForm`)

**Interfaces:**
- Consumes: i18n key từ Task 3; payload hook từ Task 2.
- Produces: form thêm/sửa sản phẩm có 3 textarea; lưu kèm `attributes`, `target_audience`, `selling_points`.

- [ ] **Step 1: Thêm state**

Trong `ProductForm`, sau dòng `const [productUrl, setProductUrl] = useState(...)`:

```ts
  const [attributes, setAttributes] = useState(product?.attributes ?? "");
  const [targetAudience, setTargetAudience] = useState(product?.target_audience ?? "");
  const [sellingPoints, setSellingPoints] = useState(product?.selling_points ?? "");
```

- [ ] **Step 2: Gửi field khi submit**

Trong `handleSubmit`, thêm vào cả nhánh `updateProduct.mutateAsync` và `createProduct.mutateAsync` (cạnh `...colorFields`):

```ts
        attributes: attributes.trim() || null,
        target_audience: targetAudience.trim() || null,
        selling_points: sellingPoints.trim() || null,
```

- [ ] **Step 3: Render 3 textarea**

Trong JSX của form, ngay sau block Product URL (kết thúc ở `</div>` dòng ~428, trước block Product Colors), chèn:

```tsx
      <div className="mb-4 space-y-4 rounded-lg border border-border-subtle bg-background-elevated p-3">
        <p className="text-sm font-semibold text-foreground-muted">{t.brand.marketingConfig}</p>
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">{t.brand.productAttributes}</label>
          <textarea
            value={attributes}
            onChange={(e) => setAttributes(e.target.value)}
            placeholder={t.brand.productAttributesPlaceholder}
            rows={2}
            className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">{t.brand.targetAudience}</label>
          <textarea
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder={t.brand.targetAudiencePlaceholder}
            rows={2}
            className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">{t.brand.sellingPoints}</label>
          <textarea
            value={sellingPoints}
            onChange={(e) => setSellingPoints(e.target.value)}
            placeholder={t.brand.sellingPointsPlaceholder}
            rows={2}
            className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
          />
        </div>
      </div>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Manual verify**

Run `npm run dev`. Vào tab Sản phẩm → Sửa 1 sản phẩm → nhập 3 field → Lưu → mở lại form thấy giá trị đã lưu. (Có thể xác minh DB bằng `mcp__supabase__execute_sql`: `select attributes, target_audience, selling_points from brand_products limit 5;`.)
Expected: 3 field persist.

- [ ] **Step 6: Commit**

```bash
git add src/features/brand/components/ProductsTab.tsx
git commit -m "feat(brand): add marketing fields to product form"
```

---

## Task 5: Hàm thuần `buildScriptSystemPrompt` + unit test

**Files:**
- Create: `src/services/scriptPrompt.ts`
- Create: `src/services/__tests__/scriptPrompt.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const TONE_MAP: Record<string, string>
  export const MAX_SCRIPT_WORDS = 300
  export interface ScriptPromptInput {
    brandName: string
    brandDescription: string | null
    productName?: string | null
    productDescription?: string | null
    attributes?: string | null
    targetAudience?: string | null
    sellingPoints?: string | null
    tone: string
    notes?: string | null
  }
  export function buildScriptSystemPrompt(input: ScriptPromptInput): string
  ```

- [ ] **Step 1: Viết test trước**

Create `src/services/__tests__/scriptPrompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildScriptSystemPrompt, MAX_SCRIPT_WORDS } from "@/services/scriptPrompt";

describe("buildScriptSystemPrompt", () => {
  const base = {
    brandName: "Ladospice",
    brandDescription: "Đồ ăn cay",
    tone: "humor",
  };

  it("includes brand name, mapped tone label and word cap", () => {
    const p = buildScriptSystemPrompt(base);
    expect(p).toContain("Ladospice");
    expect(p).toContain("Hài hước");
    expect(p).toContain(String(MAX_SCRIPT_WORDS));
  });

  it("includes product + marketing lines only when provided", () => {
    const p = buildScriptSystemPrompt({
      ...base,
      productName: "Mì cay",
      productDescription: "Cay xé",
      attributes: "độ cay cấp 7",
      targetAudience: "GenZ",
      sellingPoints: "freeship",
    });
    expect(p).toContain("Mì cay");
    expect(p).toContain("độ cay cấp 7");
    expect(p).toContain("GenZ");
    expect(p).toContain("freeship");
  });

  it("omits marketing lines when fields are empty/null", () => {
    const p = buildScriptSystemPrompt({ ...base, attributes: "", targetAudience: null });
    expect(p).not.toContain("Đặc tính");
    expect(p).not.toContain("Đối tượng");
  });

  it("falls back to raw tone when not in TONE_MAP", () => {
    const p = buildScriptSystemPrompt({ ...base, tone: "weird" });
    expect(p).toContain("weird");
  });
});
```

- [ ] **Step 2: Chạy test để thấy FAIL**

Run: `npm test -- scriptPrompt`
Expected: FAIL — module `@/services/scriptPrompt` chưa tồn tại.

- [ ] **Step 3: Viết implementation**

Create `src/services/scriptPrompt.ts`:

```ts
export const MAX_SCRIPT_WORDS = 300;

export const TONE_MAP: Record<string, string> = {
  humor: "Hài hước, gần gũi, vui vẻ",
  authentic: "Chân thực, tự nhiên, tin cậy",
  dramatic: "Kịch tính, mạnh mẽ, ấn tượng",
};

export interface ScriptPromptInput {
  brandName: string;
  brandDescription: string | null;
  productName?: string | null;
  productDescription?: string | null;
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
  tone: string;
  notes?: string | null;
}

function line(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? `\n${label}: ${trimmed}` : "";
}

export function buildScriptSystemPrompt(input: ScriptPromptInput): string {
  const toneLabel = TONE_MAP[input.tone] ?? input.tone;
  const productLine = input.productName
    ? `\nProduct: ${input.productName}${input.productDescription ? ` — ${input.productDescription}` : ""}`
    : "";

  return (
    `You are a TikTok copywriter for brand ${input.brandName}.\n` +
    `Brand description: ${input.brandDescription ?? ""}` +
    productLine +
    line("Đặc tính sản phẩm", input.attributes) +
    line("Đối tượng khách hàng", input.targetAudience) +
    line("Điểm bán/USP", input.sellingPoints) +
    `\nTone: ${toneLabel}` +
    line("Notes", input.notes) +
    `\n\nTask: Convert the following TikTok transcript into a brand-adapted script.\n` +
    `- Keep the energy and structure of the original\n` +
    `- Replace with brand messaging for ${input.brandName}\n` +
    `- Natural Vietnamese language, appropriate for TikTok\n` +
    `- Max ${MAX_SCRIPT_WORDS} words\n` +
    `- Return only the script, no explanation`
  );
}
```

- [ ] **Step 4: Chạy test để thấy PASS**

Run: `npm test -- scriptPrompt`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/services/scriptPrompt.ts src/services/__tests__/scriptPrompt.test.ts
git commit -m "feat(video): extract testable script system-prompt builder"
```

---

## Task 6: Mở rộng type script + wire prompt builder vào route

**Files:**
- Modify: `src/features/video/types.ts:59-88`
- Modify: `src/app/api/video/scripts/route.ts:1-188`

**Interfaces:**
- Consumes: `buildScriptSystemPrompt`, `TONE_MAP`, `MAX_SCRIPT_WORDS` từ Task 5.
- Produces:
  ```ts
  interface PromptConfig {
    tone?: string; notes?: string; productId?: string | null;
    attributes?: string | null; targetAudience?: string | null; sellingPoints?: string | null;
  }
  interface CreateScriptRequest {
    transcriptId: string; brandId: string; productId: string | null;
    promptConfig: {
      tone: string; notes: string;
      attributes?: string | null; targetAudience?: string | null; sellingPoints?: string | null;
    };
  }
  ```

- [ ] **Step 1: Mở rộng types**

Trong `src/features/video/types.ts`, cập nhật `PromptConfig`:

```ts
export interface PromptConfig {
  tone?: string;
  notes?: string;
  productId?: string | null;
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
}
```

và `CreateScriptRequest.promptConfig`:

```ts
export interface CreateScriptRequest {
  transcriptId: string;
  brandId: string;
  productId: string | null;
  promptConfig: {
    tone: string;
    notes: string;
    attributes?: string | null;
    targetAudience?: string | null;
    sellingPoints?: string | null;
  };
}
```

- [ ] **Step 2: Route dùng builder**

Trong `src/app/api/video/scripts/route.ts`:
- Xóa các hằng `MAX_SCRIPT_WORDS` và `TONE_MAP` cục bộ (dòng 11-17).
- Thêm import: `import { buildScriptSystemPrompt } from "@/services/scriptPrompt";` (cạnh import claudeClient). Bỏ import `CLAUDE_SONNET_MODEL`? Không — vẫn dùng cho `scriptService.create`. Giữ nguyên import claudeClient.
- Khi fetch product, lấy thêm 3 cột:

```ts
        let productName: string | null = null;
        let productDescription: string | null = null;
        if (body.productId) {
          const { data: product } = await supabase
            .from("brand_products")
            .select("name, description, attributes, target_audience, selling_points")
            .eq("id", body.productId)
            .single();
          if (product) {
            productName = product.name;
            productDescription = product.description;
          }
        }
```

- Thay block "Build system prompt" (dòng ~129-145) bằng:

```ts
        const { tone, notes, attributes, targetAudience, sellingPoints } = body.promptConfig;
        const systemPrompt = buildScriptSystemPrompt({
          brandName: brand.name,
          brandDescription: brand.description,
          productName,
          productDescription,
          attributes: attributes ?? null,
          targetAudience: targetAudience ?? null,
          sellingPoints: sellingPoints ?? null,
          tone,
          notes,
        });
```

- Lưu config đầy đủ vào DB (block `promptConfig` trước `scriptService.create`):

```ts
        const promptConfig = {
          tone,
          notes,
          productId: body.productId,
          attributes: attributes ?? null,
          targetAudience: targetAudience ?? null,
          sellingPoints: sellingPoints ?? null,
        };
```

> Lưu ý: giá trị `attributes/targetAudience/sellingPoints` đến từ `promptConfig` (giá trị override mà client đã prefill từ product) — đây là nguồn sự thật cho lần generate, không đọc lại từ product.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Chạy lại unit test prompt (đảm bảo không vỡ)**

Run: `npm test -- scriptPrompt`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/video/types.ts src/app/api/video/scripts/route.ts
git commit -m "feat(video): feed product marketing fields into script prompt"
```

---

## Task 7: ScriptEditor — panel cấu hình sản phẩm + override

**Files:**
- Modify: `src/features/video/components/ScriptEditor.tsx`
- Modify: `src/app/app/video/[id]/page.tsx:26-29` (mở rộng `ProductOption`)

**Interfaces:**
- Consumes: i18n từ Task 3; `CreateScriptRequest` từ Task 6.
- Produces: form Stage 4 gửi `promptConfig` gồm `attributes/targetAudience/sellingPoints` (override). `ProductOption` mở rộng để mang field default.

- [ ] **Step 1: Mở rộng `ProductOption` ở page**

Trong `src/app/app/video/[id]/page.tsx`, đổi interface và select sang lấy đủ field:

```ts
interface ProductOption {
  id: string;
  name: string;
  attributes: string | null;
  target_audience: string | null;
  selling_points: string | null;
}
```

Và trong effect fetch products, đổi endpoint mapping: API `/api/brand-products` trả `products` đầy đủ `BrandProduct`, nên map:

```ts
    apiFetch<{ products: ProductOption[] }>(
      `/api/brand-products?brandId=${selectedBrandId}`,
    )
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]));
```

(Field thừa của `BrandProduct` được TypeScript chấp nhận khi gán vào `ProductOption[]` qua response generic — `BrandProduct` đã có sẵn các field này từ Task 1.)

- [ ] **Step 2: ScriptEditor — cập nhật `ProductOption` + state override**

Trong `src/features/video/components/ScriptEditor.tsx`, đổi interface `ProductOption` (dòng 10-13) cho khớp Step 1. Thêm state sau dòng `const [notes, setNotes] = useState("");`:

```ts
  const [attributes, setAttributes] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
```

- [ ] **Step 3: Prefill khi đổi sản phẩm**

Thêm handler thay cho `onChange` trực tiếp của select product:

```ts
  function handleSelectProduct(productId: string) {
    const id = productId || null;
    setSelectedProductId(id);
    const product = products.find((p) => p.id === id);
    setAttributes(product?.attributes ?? "");
    setTargetAudience(product?.target_audience ?? "");
    setSellingPoints(product?.selling_points ?? "");
  }
```

Đổi `onChange` của select product thành `onChange={(e) => handleSelectProduct(e.target.value)}`.

- [ ] **Step 4: Đưa override vào payload generate**

Trong `handleGenerate`, sửa `payload`:

```ts
    const payload: CreateScriptRequest = {
      transcriptId,
      brandId,
      productId: selectedProductId,
      promptConfig: {
        tone,
        notes,
        attributes: attributes.trim() || null,
        targetAudience: targetAudience.trim() || null,
        sellingPoints: sellingPoints.trim() || null,
      },
    };
```

- [ ] **Step 5: Render panel cấu hình (collapsible)**

Sau grid `tone/product/notes` (sau `</div>` đóng grid, trước nút Generate), chèn panel hiển thị khi đã chọn product:

```tsx
      {selectedProductId && (
        <details className="rounded-xl border border-border/40 bg-background-subtle p-3" open>
          <summary className="cursor-pointer text-sm font-medium text-foreground-muted">
            {t.video.productConfigTitle}
          </summary>
          <p className="mt-1 mb-3 text-xs text-foreground-subtle">{t.video.productConfigHint}</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">{t.video.attributesLabel}</label>
              <textarea value={attributes} onChange={(e) => setAttributes(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">{t.video.targetAudienceLabel}</label>
              <textarea value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">{t.video.sellingPointsLabel}</label>
              <textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
        </details>
      )}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Manual verify**

`npm run dev` → trang pipeline 1 video đã có transcript `done` → Stage 4 chọn product → panel tự nạp default → sửa override → Generate → kịch bản phản ánh nội dung override.
Expected: prompt dùng giá trị override; default sản phẩm trong tab Sản phẩm không đổi.

- [ ] **Step 8: Commit**

```bash
git add src/features/video/components/ScriptEditor.tsx src/app/app/video/[id]/page.tsx
git commit -m "feat(video): product config panel with prefill + per-video override"
```

---

## Task 8: Hàm thuần `derivePipelineStages` + unit test

**Files:**
- Create: `src/features/video/utils/pipelineStages.ts`
- Create: `src/features/video/utils/__tests__/pipelineStages.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type StageState = "idle" | "running" | "done"
  export type StageKey = "transcribe" | "script" | "voice" | "done"
  export interface PipelineStageInput {
    whisperStatus: "pending" | "processing" | "done" | "failed" | null
    hasSavedScript: boolean
    hasAudio: boolean
  }
  export interface PipelineStage { key: StageKey; state: StageState }
  export function derivePipelineStages(input: PipelineStageInput): PipelineStage[]
  ```

- [ ] **Step 1: Viết test trước**

Create `src/features/video/utils/__tests__/pipelineStages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { derivePipelineStages } from "@/features/video/utils/pipelineStages";

describe("derivePipelineStages", () => {
  it("all idle when nothing started", () => {
    const s = derivePipelineStages({ whisperStatus: null, hasSavedScript: false, hasAudio: false });
    expect(s.map((x) => x.state)).toEqual(["idle", "idle", "idle", "idle"]);
  });

  it("transcribe running while processing", () => {
    const s = derivePipelineStages({ whisperStatus: "processing", hasSavedScript: false, hasAudio: false });
    expect(s[0].state).toBe("running");
  });

  it("script idle until transcript done", () => {
    const s = derivePipelineStages({ whisperStatus: "done", hasSavedScript: false, hasAudio: false });
    expect(s[0].state).toBe("done");
    expect(s[1].state).toBe("idle");
  });

  it("voice + done complete when audio exists", () => {
    const s = derivePipelineStages({ whisperStatus: "done", hasSavedScript: true, hasAudio: true });
    expect(s.map((x) => x.state)).toEqual(["done", "done", "done", "done"]);
  });
});
```

- [ ] **Step 2: Chạy test thấy FAIL**

Run: `npm test -- pipelineStages`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implementation**

Create `src/features/video/utils/pipelineStages.ts`:

```ts
export type StageState = "idle" | "running" | "done";
export type StageKey = "transcribe" | "script" | "voice" | "done";

export interface PipelineStageInput {
  whisperStatus: "pending" | "processing" | "done" | "failed" | null;
  hasSavedScript: boolean;
  hasAudio: boolean;
}

export interface PipelineStage {
  key: StageKey;
  state: StageState;
}

export function derivePipelineStages(input: PipelineStageInput): PipelineStage[] {
  const transcribe: StageState =
    input.whisperStatus === "done"
      ? "done"
      : input.whisperStatus === "processing"
        ? "running"
        : "idle";

  const script: StageState = input.hasSavedScript
    ? "done"
    : transcribe === "done"
      ? "idle"
      : "idle";

  const voice: StageState = input.hasAudio ? "done" : "idle";
  const done: StageState = input.hasAudio ? "done" : "idle";

  return [
    { key: "transcribe", state: transcribe },
    { key: "script", state: script },
    { key: "voice", state: voice },
    { key: "done", state: done },
  ];
}
```

- [ ] **Step 4: Chạy test thấy PASS**

Run: `npm test -- pipelineStages`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/video/utils/pipelineStages.ts src/features/video/utils/__tests__/pipelineStages.test.ts
git commit -m "feat(video): pipeline stage-state derivation helper"
```

---

## Task 9: Component `PipelineStageBar`

**Files:**
- Create: `src/features/video/components/PipelineStageBar.tsx`

**Interfaces:**
- Consumes: `derivePipelineStages`, `PipelineStage`, `StageKey` từ Task 8; i18n từ Task 3.
- Produces:
  ```ts
  interface PipelineStageBarProps {
    whisperStatus: "pending" | "processing" | "done" | "failed" | null;
    hasSavedScript: boolean;
    hasAudio: boolean;
    onStageClick: (key: StageKey) => void;
  }
  export function PipelineStageBar(props: PipelineStageBarProps): JSX.Element
  ```

- [ ] **Step 1: Viết component**

Create `src/features/video/components/PipelineStageBar.tsx`:

```tsx
// Client Component: clickable stage progress bar with derived states
"use client";

import { Check, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import {
  derivePipelineStages,
  type StageKey,
} from "@/features/video/utils/pipelineStages";

interface PipelineStageBarProps {
  whisperStatus: "pending" | "processing" | "done" | "failed" | null;
  hasSavedScript: boolean;
  hasAudio: boolean;
  onStageClick: (key: StageKey) => void;
}

export function PipelineStageBar({
  whisperStatus,
  hasSavedScript,
  hasAudio,
  onStageClick,
}: PipelineStageBarProps) {
  const { t } = useT();
  const stages = derivePipelineStages({ whisperStatus, hasSavedScript, hasAudio });

  const labels: Record<StageKey, string> = {
    transcribe: t.video.stageTranscribe,
    script: t.video.stageScript,
    voice: t.video.stageVoice,
    done: t.video.stageDone,
  };

  return (
    <div className="sticky top-0 z-10 mb-6 flex items-center gap-2 rounded-2xl border border-border/20 bg-background-elevated/80 px-4 py-3 backdrop-blur">
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => onStageClick(stage.key)}
            className="flex items-center gap-2 text-left"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                stage.state === "done"
                  ? "bg-green-500/15 text-green-600"
                  : stage.state === "running"
                    ? "bg-blue-500/15 text-blue-500"
                    : "bg-black/[0.04] text-foreground-subtle"
              }`}
            >
              {stage.state === "done" ? (
                <Check className="h-4 w-4" />
              ) : stage.state === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={`text-sm font-medium ${
                stage.state === "idle" ? "text-foreground-subtle" : "text-foreground"
              }`}
            >
              {labels[stage.key]}
            </span>
          </button>
          {index < stages.length - 1 && (
            <span className="h-px flex-1 bg-border/30" />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/video/components/PipelineStageBar.tsx
git commit -m "feat(video): pipeline stage progress bar component"
```

---

## Task 10: Pipeline page — stage bar, gating trực quan, gộp create+run

**Files:**
- Modify: `src/app/app/video/[id]/page.tsx`

**Interfaces:**
- Consumes: `PipelineStageBar` (Task 9); `useRunTranscription` (đã có trong `@/hooks/api/useTranscripts`); `useGeneratedAudiosByScript` (đã có trong `@/hooks/api/useGeneratedAudios`); `StageKey` (Task 8).
- Produces: trang gắn stage bar trên cùng; section khóa khi chưa đủ điều kiện; "Bắt đầu bóc băng" tạo + chạy Whisper liền mạch.

- [ ] **Step 1: Import bổ sung + ref các section**

Thêm import:

```ts
import { PipelineStageBar } from "@/features/video/components/PipelineStageBar";
import { useRunTranscription } from "@/hooks/api/useTranscripts";
import { useGeneratedAudiosByScript } from "@/hooks/api/useGeneratedAudios";
import type { StageKey } from "@/features/video/utils/pipelineStages";
import { useRef } from "react";
```

Thêm refs trong component (cạnh các useState):

```ts
  const transcribeRef = useRef<HTMLElement | null>(null);
  const scriptRef = useRef<HTMLElement | null>(null);
  const voiceRef = useRef<HTMLElement | null>(null);
  const runTranscription = useRunTranscription();
  const { data: audios = [] } = useGeneratedAudiosByScript(savedScriptId);
```

- [ ] **Step 2: Gộp create + run**

Đổi `handleCreateTranscript` để tạo xong chạy luôn Whisper:

```ts
  async function handleCreateTranscript() {
    const data = await createTranscript.mutateAsync(id);
    setTranscriptId(data.transcript.id);
    await runTranscription.mutateAsync(data.transcript.id);
  }
```

> `useTranscriptStatus(transcriptId)` đã poll trạng thái nên UI tự cập nhật `processing → done`.

- [ ] **Step 3: Handler click stage**

```ts
  function handleStageClick(key: StageKey) {
    const target =
      key === "transcribe" ? transcribeRef.current
      : key === "script" ? scriptRef.current
      : voiceRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
```

- [ ] **Step 4: Render stage bar + gán ref + gating**

Ngay sau `<div className="mx-auto max-w-3xl px-6 py-8">` (sau VideoPlayer + metadata, hoặc trước Stage 3) thêm:

```tsx
        <PipelineStageBar
          whisperStatus={transcript?.whisper_status ?? null}
          hasSavedScript={Boolean(savedScriptId ?? latestScript)}
          hasAudio={audios.length > 0}
          onStageClick={handleStageClick}
        />
```

Gán `ref` cho 3 `<section>`: thêm `ref={transcribeRef}` cho Stage 3, `ref={scriptRef}` cho Stage 4, `ref={voiceRef}` cho Stage 5.

Thêm gating trực quan cho Stage 4 và Stage 5 — bọc nội dung và làm mờ khi chưa đủ điều kiện. Với Stage 4, thêm class điều kiện vào section:

```tsx
        <section
          ref={scriptRef}
          className={`mb-8 rounded-2xl border border-border-strong/20 bg-background-subtle p-6 transition-opacity ${
            transcript?.whisper_status === "done" ? "" : "pointer-events-none opacity-50"
          }`}
        >
```

Tương tự Stage 5:

```tsx
        <section
          ref={voiceRef}
          className={`rounded-2xl border border-border-strong/20 bg-background-subtle p-6 transition-opacity ${
            savedScriptId ? "" : "pointer-events-none opacity-50"
          }`}
        >
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Manual verify**

`npm run dev` → mở `/app/video/{id}` của 1 video chưa có transcript:
- Thanh stage hiển thị 4 node, node 1 idle.
- Bấm "Bắt đầu bóc băng" → node 1 chuyển spinner → khi xong chuyển ✓, Stage 4 hết mờ.
- Click node trên thanh → cuộn tới đúng section.
Expected: đúng như trên.

- [ ] **Step 7: Commit**

```bash
git add src/app/app/video/[id]/page.tsx
git commit -m "feat(video): wire stage bar, visual gating, one-click transcribe"
```

---

## Task 11: CompetitorVideoCard — nút "Mở pipeline"

**Files:**
- Modify: `src/features/video/components/CompetitorVideoCard.tsx`

**Interfaces:**
- Consumes: i18n `openPipeline` (Task 3).
- Produces: mỗi hàng có link điều hướng `/app/video/{video.id}`; nổi bật khi `status === "winner"`.

- [ ] **Step 1: Import Link + icon**

Thêm vào đầu file:

```ts
import Link from "next/link";
import { ArrowRight } from "lucide-react";
```

(thêm `ArrowRight` vào import `lucide-react` hiện có thay vì import trùng).

- [ ] **Step 2: Thêm link vào cột Actions**

Trong `<td>` Actions (block `<div className="flex items-center gap-1.5">`), thêm phần tử đầu tiên:

```tsx
            <Link
              href={`/app/video/${video.id}`}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                video.status === "winner"
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-foreground-subtle hover:bg-black/[0.04]"
              }`}
            >
              {t.video.openPipeline}
              <ArrowRight className="h-3 w-3" />
            </Link>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verify**

`npm run dev` → trang danh sách video: mỗi hàng có "Mở pipeline →"; hàng Winner nổi bật màu primary; bấm điều hướng đúng `/app/video/{id}`.

- [ ] **Step 5: Commit**

```bash
git add src/features/video/components/CompetitorVideoCard.tsx
git commit -m "feat(video): add Open pipeline link to video row"
```

---

## Task 12: Verification cuối — build + smoke toàn luồng

**Files:** (không sửa code; chỉ kiểm tra)

- [ ] **Step 1: Toàn bộ unit test**

Run: `npm test`
Expected: PASS (gồm `scriptPrompt`, `pipelineStages`).

- [ ] **Step 2: Type-check + build production**

Run: `npx tsc --noEmit && npm run build`
Expected: build thành công, không lỗi type.

- [ ] **Step 3: Smoke test thủ công đầu-cuối**

`npm run dev`, đăng nhập, chọn brand:
1. Tab Sản phẩm → sửa product → nhập 3 field marketing → Lưu.
2. Trang Video → bấm "Mở pipeline" trên 1 video.
3. Stage 3: "Bắt đầu bóc băng" → chờ `done` → sửa transcript → Lưu.
4. Stage 4: chọn product (panel tự nạp default) → override → Generate → kịch bản phản ánh override → Lưu.
5. Stage 5: chọn voice preset → Generate audio → node ④ "Hoàn tất" sáng.
6. Thanh stage cập nhật đúng trạng thái xuyên suốt.

Expected: toàn luồng chạy mượt, gating + stage bar chính xác.

- [ ] **Step 4: Commit (nếu có chỉnh nhỏ phát sinh)**

```bash
git add -A
git commit -m "chore(video): final verification fixes for pipeline workflow"
```

---

## Self-Review Notes

- **Spec coverage:** A (lối vào)→Task 11; B (stage bar + gating)→Task 8/9/10; C (gộp create+run)→Task 10; D1 (schema)→Task 1; D2 (config tab)→Task 4; D3 (Stage 4 override)→Task 7; D4 (API prompt)→Task 5/6; E (Stage 5 gating)→Task 10; F (1 migration)→Task 1. Đủ.
- **Placeholder scan:** không còn TBD/TODO; mọi step code có code thật.
- **Type consistency:** `attributes/target_audience/selling_points` (snake_case ở DB/BrandProduct/API) vs `attributes/targetAudience/sellingPoints` (camelCase trong `promptConfig`/`ScriptPromptInput`) — đã nhất quán theo từng ranh giới; ScriptEditor map snake→camel khi build payload.
```

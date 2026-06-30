# Script Prompt v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the script generation prompt to a structured 2-step system with provider-aware TTS formatting (Vbee punctuation vs. ElevenLabs expression tags), add a `price` field to products, and remove the incorrect fixed 300-word cap in favour of transcript-length mirroring.

**Architecture:** `buildScriptSystemPrompt()` is a pure function in `src/services/scriptPrompt.ts` — rebuilt with a 2-step structure (silent analysis + write), `[HOOK]/[THÂN BÀI]/[CTA]` markers, provider-specific phrasing, and no word-count limit. Two new DB columns (`tts_provider`, `elevenlabs_model`) on `brand_scripts` capture which format was used. One new DB column (`price`) on `brand_products` adds pricing context. All type changes flow through `src/features/video/types.ts` and `src/features/brand/types.ts`.

**Tech Stack:** Next.js App Router, Anthropic Claude (streaming), Supabase, TypeScript

## Global Constraints

- TypeScript: no `any`, no type assertions without explanation comment.
- `TtsProvider = 'vbee' | 'elevenlabs'` and `ElevenLabsModel = 'eleven_v3' | 'eleven_flash_v2_5'` are the canonical string literal unions — defined in `src/services/scriptPrompt.ts` and re-exported for use elsewhere.
- `MAX_SCRIPT_WORDS` constant must be **deleted** — length is dictated by the transcript, not a cap.
- Output format: `[HOOK]` / `[THÂN BÀI]` / `[CTA]` on their own lines; no blank lines between sentences within a section.
- ElevenLabs v3 (`eleven_v3`): expression tags `[amused]` `[chuckles]` `[surprised]` `[excited]` `[enthusiastic]` `[mischievously]` `[sighs]` `[laughs]` are supported in text.
- ElevenLabs v2.5 (`eleven_flash_v2_5`): expression tags are NOT supported — use CAPS, `...`, short sentences, repetition instead.
- Vbee: use only `,` `.` `...` for pauses; CAPS for emphasis. No tags.
- DB migration uses Supabase MCP (`mcp__supabase__execute_sql` or `mcp__supabase__apply_migration`) — do NOT use Supabase CLI.
- After migration, regenerate `src/types/database.types.ts` via Supabase MCP `generate_typescript_types`.

---

### Task 1: DB migration — `price` on `brand_products`, `tts_provider` + `elevenlabs_model` on `brand_scripts`

**Files:**
- Create: `supabase/migrations/14_script_prompt_v2.sql`
- Apply via Supabase MCP

**Interfaces:**
- Produces: `brand_products.price TEXT` (nullable), `brand_scripts.tts_provider TEXT DEFAULT 'vbee'`, `brand_scripts.elevenlabs_model TEXT` (nullable)

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/14_script_prompt_v2.sql
BEGIN;

ALTER TABLE public.brand_products
  ADD COLUMN IF NOT EXISTS price TEXT;

ALTER TABLE public.brand_scripts
  ADD COLUMN IF NOT EXISTS tts_provider TEXT NOT NULL DEFAULT 'vbee'
    CHECK (tts_provider IN ('vbee', 'elevenlabs')),
  ADD COLUMN IF NOT EXISTS elevenlabs_model TEXT
    CHECK (elevenlabs_model IN ('eleven_v3', 'eleven_flash_v2_5'));

COMMIT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__execute_sql` (or `apply_migration`) with the SQL above. Confirm no error response.

- [ ] **Step 3: Regenerate TypeScript types**

Use `mcp__supabase__generate_typescript_types` and overwrite `src/types/database.types.ts`. Confirm `brand_products` row now includes `price: string | null` and `brand_scripts` row includes `tts_provider: string` and `elevenlabs_model: string | null`.

---

### Task 2: Update `BrandProduct` type + `ProductForm` — add price field

**Files:**
- Modify: `src/features/brand/types.ts` (add `price` to `BrandProduct`)
- Modify: `src/features/brand/components/ProductsTab.tsx` (add `price` state + input + submit)

**Interfaces:**
- Consumes: `brand_products.price` column from Task 1
- Produces: `BrandProduct.price: string | null` available for downstream consumers (script prompt in Task 4)

- [ ] **Step 1: Add `price` to `BrandProduct` interface**

In `src/features/brand/types.ts`, in the `BrandProduct` interface, add after `selling_points`:

```typescript
  price: string | null;
```

Full interface becomes:
```typescript
export interface BrandProduct {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  images: string[];
  product_url: string | null;
  cached_product_context: Record<string, unknown> | null;
  context_cached_at: string | null;
  primary_color_1: string | null;
  primary_color_2: string | null;
  secondary_color_1: string | null;
  secondary_color_2: string | null;
  accent_color_1: string | null;
  accent_color_2: string | null;
  attributes: string | null;
  target_audience: string | null;
  selling_points: string | null;
  price: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Add `price` state to `ProductForm` in `ProductsTab.tsx`**

In `src/features/brand/components/ProductsTab.tsx`, inside `function ProductForm(...)`, find:

```typescript
  const [sellingPoints, setSellingPoints] = useState(product?.selling_points ?? "");
```

Add directly after it:

```typescript
  const [price, setPrice] = useState(product?.price ?? "");
```

- [ ] **Step 3: Add `price` input to `ProductForm` JSX**

In the Marketing Config section of `ProductForm` (find the closing `</div>` of the `sellingPoints` textarea block, around line 470), after the `sellingPoints` `<div>` block, add:

```tsx
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
            Giá / Sale
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ví dụ: 49k, 27 cành, mua 2 tặng 1..."
            className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
```

- [ ] **Step 4: Include `price` in `handleSubmit`**

In `handleSubmit` inside `ProductForm`, find the `updateProduct.mutateAsync({...})` and `createProduct.mutateAsync({...})` calls. Add `price: price.trim() || null` to both objects:

```typescript
      if (product) {
        await updateProduct.mutateAsync({
          productId: product.id,
          name: name.trim(),
          description: description.trim() || null,
          images,
          product_url: urlValue,
          attributes: attributes.trim() || null,
          target_audience: targetAudience.trim() || null,
          selling_points: sellingPoints.trim() || null,
          price: price.trim() || null,     // ADD THIS LINE
          ...colorFields,
        });
      } else {
        await createProduct.mutateAsync({
          brand_id: brandId,
          name: name.trim(),
          description: description.trim() || null,
          images,
          product_url: urlValue,
          attributes: attributes.trim() || null,
          target_audience: targetAudience.trim() || null,
          selling_points: sellingPoints.trim() || null,
          price: price.trim() || null,     // ADD THIS LINE
          ...colorFields,
        });
      }
```

- [ ] **Step 5: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

If the product mutation hooks or API routes reject the new `price` field, also update those (add `price?: string | null` to their payload types and pass it through to the Supabase upsert). Search for `useCreateProduct` and `useUpdateProduct` in `src/hooks/api/useProducts.ts` and trace through to `src/app/api/brands/[id]/products/` routes.

---

### Task 3: Rebuild `src/services/scriptPrompt.ts`

**Files:**
- Modify: `src/services/scriptPrompt.ts` (full rewrite)
- Create: `src/__tests__/scriptPrompt.test.ts`

**Interfaces:**
- Produces:
  - `export type TtsProvider = 'vbee' | 'elevenlabs'`
  - `export type ElevenLabsModel = 'eleven_v3' | 'eleven_flash_v2_5'`
  - `export interface ScriptPromptInput { ... }` — see below
  - `export function buildScriptSystemPrompt(input: ScriptPromptInput): string`
  - `export const TONE_MAP: Record<string, string>` — unchanged

- [ ] **Step 1: Write tests for `buildScriptSystemPrompt`**

```typescript
// src/__tests__/scriptPrompt.test.ts
import { buildScriptSystemPrompt } from "@/services/scriptPrompt";
import type { ScriptPromptInput } from "@/services/scriptPrompt";

const base: ScriptPromptInput = {
  brandName: "Thích Cay",
  brandDescription: "Gia vị cay chất lượng cao",
  productName: "Sa Tế Sò Điệp 250g",
  productDescription: "Sốt sa tế sò điệp vùng biển sạch",
  price: "49k",
  attributes: "Ít dầu, tự nhiên, không bột ngọt",
  targetAudience: "Người trẻ 18-30 thích ăn cay",
  sellingPoints: "Vị đậm, ít béo, dễ dùng",
  tone: "humor",
  notes: null,
  ttsProvider: "vbee",
  elevenLabsModel: null,
};

it("includes product name and price in the prompt", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("Sa Tế Sò Điệp 250g");
  expect(prompt).toContain("Giá/Sale: 49k");
});

it("includes [HOOK] [THÂN BÀI] [CTA] instruction", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("[HOOK]");
  expect(prompt).toContain("[THÂN BÀI]");
  expect(prompt).toContain("[CTA]");
});

it("instructs to mirror transcript length (no word cap)", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("Giữ NGUYÊN số câu");
  expect(prompt).not.toContain("Max ");
  expect(prompt).not.toContain("300");
});

it("vbee prompt contains comma/period instruction and NOT expression tags", () => {
  const prompt = buildScriptSystemPrompt({ ...base, ttsProvider: "vbee" });
  expect(prompt).toContain("dấu phẩy");
  expect(prompt).not.toContain("[chuckles]");
});

it("elevenlabs v3 prompt contains expression tags", () => {
  const prompt = buildScriptSystemPrompt({
    ...base,
    ttsProvider: "elevenlabs",
    elevenLabsModel: "eleven_v3",
  });
  expect(prompt).toContain("[chuckles]");
  expect(prompt).toContain("[amused]");
  expect(prompt).not.toContain("dấu phẩy");
});

it("elevenlabs v2.5 prompt does NOT contain expression tags", () => {
  const prompt = buildScriptSystemPrompt({
    ...base,
    ttsProvider: "elevenlabs",
    elevenLabsModel: "eleven_flash_v2_5",
  });
  expect(prompt).not.toContain("[chuckles]");
  expect(prompt).toContain("CHỮ HOA");
});

it("skips product section when productName is not provided", () => {
  const prompt = buildScriptSystemPrompt({
    ...base,
    productName: null,
    productDescription: null,
    price: null,
  });
  expect(prompt).not.toContain("Sản phẩm:");
  expect(prompt).not.toContain("Giá/Sale:");
});

it("analysis step is silent (KHÔNG viết ra)", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("KHÔNG viết ra");
});

it("output contains no blank line between sentences instruction", () => {
  const prompt = buildScriptSystemPrompt(base);
  expect(prompt).toContain("KHÔNG xuống dòng trắng");
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest src/__tests__/scriptPrompt.test.ts --no-coverage
```
Expected: FAIL (module loads but assertions fail against old function)

- [ ] **Step 3: Rewrite `scriptPrompt.ts`**

```typescript
// src/services/scriptPrompt.ts

export type TtsProvider = "vbee" | "elevenlabs";
export type ElevenLabsModel = "eleven_v3" | "eleven_flash_v2_5";

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
  price?: string | null;
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
  tone: string;
  notes?: string | null;
  ttsProvider: TtsProvider;
  elevenLabsModel?: ElevenLabsModel | null;
}

function providerFormattingInstructions(
  ttsProvider: TtsProvider,
  elevenLabsModel?: ElevenLabsModel | null,
): string {
  if (ttsProvider === "elevenlabs" && elevenLabsModel === "eleven_v3") {
    return [
      "KỸ THUẬT NHẤN NHÁ (ElevenLabs v3 — dùng expression tags):",
      "- Đặt tag TRƯỚC câu/cụm cần cảm xúc: [amused], [chuckles], [surprised], [excited], [enthusiastic], [mischievously], [sighs], [laughs]",
      "- Dùng ... để nghỉ kịch tính, — để ngắt nhịp đột ngột",
      "- Câu ngắn ngay sau tag tạo impact mạnh hơn",
    ].join("\n");
  }
  if (ttsProvider === "elevenlabs") {
    // eleven_flash_v2_5 — expression tags NOT supported
    return [
      "KỸ THUẬT NHẤN NHÁ (ElevenLabs v2.5 — KHÔNG dùng expression tags):",
      "- Thay bằng: CHỮ HOA để nhấn từ quan trọng, ... để nghỉ kịch tính",
      "- Câu ngắn tạo urgency, lặp từ để nhấn mạnh: \"ngon, ngon thật luôn\"",
      "- Dấu ! cho hứng khởi, ? cho tò mò/câu hỏi tu từ",
    ].join("\n");
  }
  // vbee
  return [
    "KỸ THUẬT NHẤN NHÁ (Vbee TTS):",
    "- Dùng dấu phẩy (,) để nghỉ ngắn, chấm (.) để nghỉ dài, ba chấm (...) để nghỉ kịch tính",
    "- Dùng CHỮ HOA để nhấn từ quan trọng",
    "- Câu ngắn tạo urgency, lặp từ để nhấn mạnh: \"ngon, ngon thật luôn\"",
  ].join("\n");
}

export function buildScriptSystemPrompt(input: ScriptPromptInput): string {
  const toneLabel = TONE_MAP[input.tone] ?? input.tone;

  const productLines: string[] = [];
  if (input.productName) {
    productLines.push(
      `Sản phẩm: ${input.productName}${input.productDescription ? ` — ${input.productDescription}` : ""}`,
    );
    if (input.price?.trim()) productLines.push(`Giá/Sale: ${input.price.trim()}`);
    if (input.attributes?.trim()) productLines.push(`Đặc điểm: ${input.attributes.trim()}`);
    if (input.targetAudience?.trim()) productLines.push(`Đối tượng: ${input.targetAudience.trim()}`);
    if (input.sellingPoints?.trim()) productLines.push(`Điểm bán/USP: ${input.sellingPoints.trim()}`);
  }

  const brandSection = [
    `Brand: ${input.brandName}`,
    input.brandDescription?.trim() ? `Mô tả brand: ${input.brandDescription.trim()}` : "",
    ...productLines,
    `Tone: ${toneLabel}`,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const sections = [
    "Bạn là copywriter chuyên viết script video TikTok bán hàng bằng tiếng Việt.",

    'NHIỆM VỤ: Phân tích cấu trúc transcript gốc, sau đó viết lại thành kịch bản mới — giữ NGUYÊN cấu trúc/nhịp điệu, "thay máu" hoàn toàn nội dung.',

    "=== BƯỚC 1: PHÂN TÍCH (làm trong đầu, KHÔNG viết ra) ===\nXác định: loại Hook (câu hỏi/tuyên bố/hành động/cảm thán?), số đoạn + vị trí cao trào, cách xưng hô + tone, vị trí CTA.",

    `=== BƯỚC 2: VIẾT KỊCH BẢN MỚI ===\n${brandSection}`,

    [
      "YÊU CẦU BẮT BUỘC:",
      "- Giữ NGUYÊN số câu, số đoạn, nhịp điệu của transcript gốc — không dài hơn, không ngắn hơn",
      "- Cảm giác người thật chia sẻ trải nghiệm, KHÔNG đọc như quảng cáo",
      '- Không ép từ ngữ "sale gắt" (mua ngay, giá sốc) trừ khi transcript gốc có CTA dạng đó',
      '- Nếu transcript dùng từ lóng tiền ("cành" = nghìn đồng), áp dụng tương tự cho giá sản phẩm',
      "- Đánh dấu [HOOK] / [THÂN BÀI] / [CTA] trên dòng riêng để phân đoạn",
      "- KHÔNG xuống dòng trắng giữa các câu trong cùng đoạn — viết liên tục",
    ].join("\n"),

    providerFormattingInstructions(input.ttsProvider, input.elevenLabsModel),

    "OUTPUT: Chỉ trả về script cuối cùng với markers. Không giải thích, không phân tích.",
  ];

  return sections.join("\n\n");
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest src/__tests__/scriptPrompt.test.ts --no-coverage
```
Expected: PASS (9 tests)

---

### Task 4: Update types, `ScriptService`, and scripts API route

**Files:**
- Modify: `src/features/video/types.ts`
- Modify: `src/services/scriptService.ts`
- Modify: `src/app/api/video/scripts/route.ts`

**Interfaces:**
- Consumes: `TtsProvider`, `ElevenLabsModel` from `src/services/scriptPrompt.ts`
- Produces:
  - `CreateScriptRequest.promptConfig` gains `ttsProvider: TtsProvider` and `elevenLabsModel?: ElevenLabsModel | null`
  - `PromptConfig` gains same optional fields
  - `BrandScript` gains `tts_provider: string | null` and `elevenlabs_model: string | null`
  - `ScriptService.create()` gains `ttsProvider: TtsProvider` and `elevenLabsModel: ElevenLabsModel | null` params

- [ ] **Step 1: Update `src/features/video/types.ts`**

Add the import at the top of the file:

```typescript
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
```

Update `PromptConfig`:

```typescript
export interface PromptConfig {
  tone?: string;
  notes?: string;
  productId?: string | null;
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
  ttsProvider?: TtsProvider;
  elevenLabsModel?: ElevenLabsModel | null;
}
```

Update `BrandScript`:

```typescript
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

Update `CreateScriptRequest`:

```typescript
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
    ttsProvider: TtsProvider;
    elevenLabsModel?: ElevenLabsModel | null;
  };
}
```

- [ ] **Step 2: Update `ScriptService.create()`**

In `src/services/scriptService.ts`, update the `create` method signature and insert:

```typescript
  async create(
    transcriptId: string,
    brandId: string,
    rawText: string,
    promptConfig: PromptConfig,
    llmModel: string,
    ttsProvider: TtsProvider,
    elevenLabsModel: ElevenLabsModel | null,
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
        elevenlabs_model: elevenLabsModel ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as BrandScript;
  }
```

Add the import at the top of `scriptService.ts`:

```typescript
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
```

- [ ] **Step 3: Update `src/app/api/video/scripts/route.ts`**

In the POST handler, find where `buildScriptSystemPrompt` is called. Update to pass `ttsProvider` and `elevenLabsModel` from the request body:

```typescript
        // Build system prompt
        const { tone, notes, attributes, targetAudience, sellingPoints, ttsProvider, elevenLabsModel } = body.promptConfig;
        const systemPrompt = buildScriptSystemPrompt({
          brandName: brand.name,
          brandDescription: brand.description,
          productName,
          productDescription,
          price: productPrice ?? null,     // see note below
          attributes: attributes ?? productAttributes ?? null,
          targetAudience: targetAudience ?? productTargetAudience ?? null,
          sellingPoints: sellingPoints ?? productSellingPoints ?? null,
          tone,
          notes,
          ttsProvider: ttsProvider ?? "vbee",
          elevenLabsModel: elevenLabsModel ?? null,
        });
```

Also update the product fetch to include `price`:

```typescript
          const { data: product } = await supabase
            .from("brand_products")
            .select("name, description, attributes, target_audience, selling_points, price")
            .eq("id", body.productId)
            .single();

          if (product) {
            productName = product.name;
            productDescription = product.description;
            productAttributes = product.attributes;
            productTargetAudience = product.target_audience;
            productSellingPoints = product.selling_points;
            productPrice = product.price;   // add this variable at the top of the if block
          }
```

Declare `let productPrice: string | null = null;` alongside the other `let product...` variables.

Update the `scriptService.create()` call to pass the new params:

```typescript
        const script = await scriptService.create(
          body.transcriptId,
          body.brandId,
          rawText,
          promptConfig,
          CLAUDE_SONNET_MODEL,
          ttsProvider ?? "vbee",
          elevenLabsModel ?? null,
        );
```

Also update `promptConfig` object stored to DB:

```typescript
        const promptConfig = {
          tone,
          notes,
          productId: body.productId,
          attributes: attributes ?? null,
          targetAudience: targetAudience ?? null,
          sellingPoints: sellingPoints ?? null,
          ttsProvider: ttsProvider ?? "vbee",
          elevenLabsModel: elevenLabsModel ?? null,
        };
```

- [ ] **Step 4: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. If `CreateScriptRequest` consumers in UI components complain about `ttsProvider` being required, set it to default `"vbee"` where missing in those call sites.

---

### Task 5: Script generation UI — add `ttsProvider` and `elevenLabsModel` selectors

**Files:**
- Modify: whichever component renders the script generation form (search the codebase for `CreateScriptRequest` or `promptConfig.tone` to find it — likely in `src/features/video/` or `src/app/app/video/`)

**Interfaces:**
- Consumes: `TtsProvider`, `ElevenLabsModel` from `@/services/scriptPrompt`
- Produces: the form now sends `ttsProvider` and `elevenLabsModel` in `promptConfig`

- [ ] **Step 1: Find the script generation form component**

```bash
# In a terminal / using Grep tool:
grep -r "promptConfig" src/features/video --include="*.tsx" -l
grep -r "CreateScriptRequest" src --include="*.tsx" -l
```

Open the file that contains the UI form calling `POST /api/video/scripts`.

- [ ] **Step 2: Add `ttsProvider` state (default `'vbee'`)**

In the component, add state near the `tone` selector:

```typescript
const [ttsProvider, setTtsProvider] = useState<TtsProvider>("vbee");
const [elevenLabsModel, setElevenLabsModel] = useState<ElevenLabsModel>("eleven_flash_v2_5");
```

Import at top:
```typescript
import type { TtsProvider, ElevenLabsModel } from "@/services/scriptPrompt";
```

- [ ] **Step 3: Add provider selector to the form JSX**

After the tone selector, add:

```tsx
{/* TTS Provider */}
<div className="mb-3">
  <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
    Định dạng giọng đọc
  </label>
  <div className="flex rounded-lg border border-border overflow-hidden text-sm">
    {(["vbee", "elevenlabs"] as TtsProvider[]).map((p) => (
      <button
        key={p}
        type="button"
        onClick={() => setTtsProvider(p)}
        className={`flex-1 py-1.5 font-medium transition-colors ${
          ttsProvider === p
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground-muted hover:bg-background-elevated"
        }`}
      >
        {p === "vbee" ? "Vbee" : "ElevenLabs"}
      </button>
    ))}
  </div>
</div>

{/* ElevenLabs model — only shown when elevenlabs is selected */}
{ttsProvider === "elevenlabs" && (
  <div className="mb-3">
    <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
      Model ElevenLabs
    </label>
    <div className="flex rounded-lg border border-border overflow-hidden text-sm">
      {(["eleven_v3", "eleven_flash_v2_5"] as ElevenLabsModel[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setElevenLabsModel(m)}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            elevenLabsModel === m
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground-muted hover:bg-background-elevated"
          }`}
        >
          {m === "eleven_v3" ? "v3 (Expression tags)" : "v2.5 (Flash)"}
        </button>
      ))}
    </div>
    <p className="text-[10px] text-foreground-subtle mt-1">
      v3 hỗ trợ [chuckles], [amused]… — v2.5 dùng CAPS và dấu câu
    </p>
  </div>
)}
```

- [ ] **Step 4: Include in the submit payload**

Find where the component calls `POST /api/video/scripts` (or where it constructs the body). Add `ttsProvider` and `elevenLabsModel` to `promptConfig`:

```typescript
promptConfig: {
  tone,
  notes,
  attributes: ...,
  targetAudience: ...,
  sellingPoints: ...,
  ttsProvider,
  elevenLabsModel: ttsProvider === "elevenlabs" ? elevenLabsModel : null,
},
```

- [ ] **Step 5: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**

1. `npm run dev`
2. Go to a transcript's script generation panel
3. Confirm "Định dạng giọng đọc" toggle appears (Vbee / ElevenLabs)
4. Select ElevenLabs → confirm model selector appears
5. Generate a script with Vbee — confirm output uses commas/dots, no expression tags
6. Generate a script with ElevenLabs v3 — confirm output uses `[amused]`, `[chuckles]` etc.
7. Generate with ElevenLabs v2.5 — confirm output uses CAPS but no expression tags

- [ ] **Step 7: Commit**

```bash
git add \
  supabase/migrations/14_script_prompt_v2.sql \
  src/types/database.types.ts \
  src/features/brand/types.ts \
  src/features/brand/components/ProductsTab.tsx \
  src/services/scriptPrompt.ts \
  src/__tests__/scriptPrompt.test.ts \
  src/features/video/types.ts \
  src/services/scriptService.ts \
  src/app/api/video/scripts/route.ts \
  <script-generation-ui-file>
git commit -m "feat(script): 2-step prompt v2 — price field, TTS-aware formatting, transcript-length mirroring"
```

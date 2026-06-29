# Generation Pipeline — Luồng tạo quảng cáo

Đây là tài liệu mô tả chi tiết luồng tạo ảnh quảng cáo — phần core của ứng dụng.

## Tổng quan

Có 2 chế độ tạo quảng cáo:

| Mode | Mô tả | Khi nào dùng |
|------|-------|-------------|
| **concept** | Tạo dựa trên chiến lược sáng tạo (concept) + phân tích đối thủ | Tạo quảng cáo mới từ đầu |
| **competitor_ref** | Tạo dựa trên ảnh quảng cáo đối thủ (copy layout, thay nội dung) | "Beat" một quảng cáo cụ thể |

## Pipeline — Concept Mode

```
┌─────────────────────────────────────────────────────────────┐
│ POST /api/generate-ads (SSE Stream)                         │
│                                                             │
│  Step 1: Read Product Page                                  │
│  ├── Fetch HTML từ landingPageUrl                           │
│  ├── Extract: brand, product, claims, ingredients, benefits │
│  └── Output: ProductContext                                 │
│                                                             │
│  Step 2: Analyze Competitors (parallel với Step 3)          │
│  ├── Nếu có marketId → load từ product_markets DB          │
│  │   ├── Try Google Sheets API (hyperlinks)                 │
│  │   ├── Fallback: CSV export (no hyperlinks)               │
│  │   └── Fallback: cached CSV từ DB                         │
│  ├── Nếu deepAnalysis → analyze images + landing pages      │
│  └── Output: CompetitorContext                              │
│                                                             │
│  Step 3: Load Concepts (parallel với Step 2)                │
│  ├── Load concept prompt + reference images từ DB           │
│  └── Output: ConceptWithPrompt[]                            │
│                                                             │
│  Step 4: Apply Concept Skill (Gemini structured output)     │
│  ├── Với mỗi concept, gọi Gemini tạo N variants            │
│  ├── Mỗi variant có: headline, bodyText, visualDirection,   │
│  │   emotionalHook, differentiator                          │
│  └── Output: ConceptDirective[] (unique per variant)        │
│                                                             │
│  Step 5: Assemble Prompts + Prepare Images                  │
│  ├── Resize product images (1024px) → upload Supabase       │
│  ├── Resize concept ref images → upload Supabase            │
│  ├── Resize brand logo (512px) → upload Supabase            │
│  ├── Ghép prompt: brand + product + concept + audience      │
│  │   + colors + typography + layout + language               │
│  └── Output: PromptEntry[] (prompt string + image URLs)     │
│                                                             │
│  Step 6: Generate Images (KIE AI, parallel)                 │
│  ├── Condense prompt nếu > 20,000 chars                     │
│  ├── Gọi KIE API với prompt + image inputs                  │
│  ├── KIE polling: DB callback → API fallback                │
│  └── Stream kết quả qua SSE events                          │
└─────────────────────────────────────────────────────────────┘
```

## Pipeline — Competitor Reference Mode

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Read Product Page (giống concept mode)             │
│                                                             │
│  Step 2: Analyze Competitor Ad Image (Claude Haiku Vision)   │
│  ├── Gửi ảnh competitor tới Claude Haiku                    │
│  ├── Extract: layout, colors, typography, hierarchy,         │
│  │   composition, text, props, mood, strengths, weaknesses  │
│  └── Output: CompetitorAdAnalysis                           │
│                                                             │
│  Step 3: Assemble Competitor Ref Prompt                     │
│  ├── Prompt chứa: competitor analysis + brand identity      │
│  ├── Mỗi variant có twist khác nhau:                        │
│  │   #0: Closest to reference                               │
│  │   #1: Elevate storytelling                               │
│  │   #2: Authenticity over polish                           │
│  │   #3: Bold contrast                                      │
│  │   #4: Benefit-focused                                    │
│  └── Output: PromptEntry[] + combined images                │
│                                                             │
│  Step 4: Generate Images (giống concept mode)               │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Vai trò |
|------|---------|
| `src/app/api/generate-ads/route.ts` | Entry point, orchestrator, SSE stream |
| `src/lib/gemini-reader.ts` | Đọc product page (Gemini), phân tích competitor ad (Claude Haiku) |
| `src/lib/sheets-reader.ts` | Fetch dữ liệu từ Google Sheets |
| `src/lib/competitor-analyzer.ts` | Deep analysis — image (Claude Haiku Vision) + landing page (Claude Haiku) + synthesis (Gemini) |
| `src/lib/concept-skills.ts` | Sheet analysis (Claude Haiku), creative variants (Gemini structured output) |
| `src/lib/concept-prompt-loader.ts` | Load concept data từ DB |
| `src/lib/prompt-assembler.ts` | Ghép prompt cuối cùng |
| `src/lib/image-utils.ts` | Resize + upload ảnh |
| `src/services/kieClient.ts` | Gọi KIE API + polling |
| `src/services/geminiClient.ts` | Wrapper Gemini API |

## Image Pipeline

```
Product Images (user upload)
    ↓ resize to 1024px (sharp)
    ↓ upload to Supabase Storage (temp-resized/)
    ↓ public URL
    ↓
KIE API (max 14 images per call)
    ├── Product images (front, back, sides)
    ├── Brand logo (512px)
    ├── Concept reference images (max 2)
    └── Competitor reference (1, chỉ competitor_ref mode)
```

## Prompt Structure

Prompt cuối cùng (~15,000-20,000 chars) bao gồm:

1. **Ad Copy Override** (nếu user cung cấp headline/body thủ công)
2. **Language Override** (nếu không phải English)
3. **Task** (aspect ratio, resolution, funnel stage)
4. **Brand Identity** (brand name, logo rules)
5. **Product** (description, claims, ingredients, benefits)
6. **Image Map** (vai trò từng ảnh: front, back, logo, ref...)
7. **Product Fidelity** (rules chống biến dạng sản phẩm)
8. **Concept Design Section** (visual direction + layout variant)
9. **Text** (headline, body — exact reproduction + capitalization rules)
10. **Colors** (6 brand colors, strict enforcement)
11. **Typography** (font, sizes, weights)
12. **Visual Style** (tone, composition, lighting)
13. **Emotion** (emotional hook)
14. **Audience** (persona)
15. **Output Rules** (final checklist)

### Quy tắc chất lượng text & logo (enforced trong prompt)

**Text Capitalization:**
- Mọi text hiển thị trên ad phải dùng capitalization nhất quán: Title Case (Viết Hoa Chữ Cái Đầu Mỗi Từ) hoặc ALL CAPS
- Tuyệt đối KHÔNG viết hoa viết thường ngẫu nhiên (ví dụ: "bOoSt yOuR eNeRgY" ❌)
- Quy tắc áp dụng cho headline, body text, caption, và mọi text overlay

**Brand Logo:**
- KHÔNG BAO GIỜ tự generate/sáng tạo/vẽ logo mới
- Nếu có brand logo image đính kèm → phải sử dụng ĐÚNG NGUYÊN BẢN, không chỉnh sửa, không redesign
- Nếu không có logo image đính kèm → chỉ logo đã in sẵn trên bao bì sản phẩm được phép xuất hiện

Nếu prompt > 20,000 chars → `condensePromptForKie()` cắt bớt nhưng giữ language + brand color sections.

## KIE Polling Flow

```
generateImage(prompt, options)
    ↓
POST /api/v1/jobs/createTask → taskId
    ↓
Poll loop (max ~5 minutes):
    1. Check Supabase DB (kie-callback edge function ghi kết quả)
    2. Nếu không có → Check KIE API GET /api/v1/tasks/query
    3. Exponential backoff: 3s → 5s → 7s → ...
    ↓
Return { imageUrl, taskId }
```

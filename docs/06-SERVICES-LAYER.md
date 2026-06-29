# Services Layer — Tầng xử lý dữ liệu

Tất cả service files nằm trong `src/services/`. Mỗi service nhận Supabase client qua constructor và thực hiện CRUD operations.

## Pattern chung

```typescript
// Tạo instance trong API route:
const supabase = await createClient();          // Server-side Supabase client
const service = new SomeService(supabase);       // Inject client
const result = await service.someMethod(args);   // Call method
```

## Chi tiết các Service

### ClientService (`clientService.ts`)

| Method | Mô tả |
|--------|-------|
| `getClients()` | Lấy tất cả clients (trừ soft-deleted) |
| `createClient(name)` | Tạo client mới |
| `renameClient(id, name)` | Đổi tên |
| `softDeleteClient(id)` | Soft delete (set deleted_at) |

### BrandService (`brandService.ts`)

| Method | Mô tả |
|--------|-------|
| `getBrandsByClient(clientId)` | Lấy brands theo client |
| `getBrandById(id)` | Lấy 1 brand |
| `createBrand(clientId, name, description?)` | Tạo brand |
| `updateBrand(id, updates)` | Cập nhật |
| `deleteBrand(id)` | Xóa |

### BrandProductService (`brandProductService.ts`)

| Method | Mô tả |
|--------|-------|
| `getByBrandId(brandId)` | Lấy products theo brand |
| `getById(id)` | Lấy 1 product |
| `create(product)` | Tạo product (name, brand_id, images[], description?) |
| `update(id, updates)` | Cập nhật |
| `delete(id)` | Xóa |

### ProductMarketService (`productMarketService.ts`)

| Method | Mô tả |
|--------|-------|
| `getByProductId(productId)` | Lấy markets theo product |
| `getById(id)` | Lấy 1 market |
| `create(input)` | Tạo market (product_id, market_code, market_label, language, sheet_url?, sheet_name?) |
| `update(id, updates)` | Cập nhật |
| `delete(id)` | Xóa |
| `updateCache(id, cachedCsv)` | Cập nhật CSV cache + timestamp |

### BrandKitService (`brandKitService.ts`)

| Method | Mô tả |
|--------|-------|
| `getBrandKit(brandId)` | Lấy brand kit (colors, fonts, logos) |
| `saveBrandKit(brandId, fields)` | Upsert brand kit |
| `uploadLogo(brandId, type, file, filename)` | Upload logo light/dark |
| `uploadFontFiles(brandId, fontName, files, specimen?)` | Upload font files |
| `getLogoUrls(kit)` | Tạo public URLs từ paths |
| `getFontSpecimenUrl(kit)` | Tạo public URL cho font specimen |

### ConceptPromptService (`conceptPromptService.ts`)

| Method | Mô tả |
|--------|-------|
| `getAll()` | Lấy tất cả concepts |
| `getByConceptId(id)` | Lấy concept theo concept_id |
| `getByConceptIds(ids[])` | Lấy nhiều concepts |
| `create(input)` | Tạo concept mới |
| `update(conceptId, input)` | Cập nhật concept |
| `delete(conceptId)` | Xóa concept |

### PersonaService (`personaService.ts`)

| Method | Mô tả |
|--------|-------|
| `getPersonasByBrand(brandId)` | Lấy personas theo brand |
| `getPersonaById(id)` | Lấy 1 persona |
| `createPersona(brandId, fields)` | Tạo persona |
| `updatePersona(id, fields)` | Cập nhật |
| `deletePersona(id)` | Soft delete |

### BrandIntelligenceService (`brandIntelligenceService.ts`)

| Method | Mô tả |
|--------|-------|
| `getResearchSummary(brandId)` | Lấy brand research summary |
| `saveResearchSummary(brandId, content)` | Upsert research summary |
| `generatePersonas(brandId, summaryId, content)` | Claude Haiku tạo 10 personas từ summary |

### SavedAdService (`savedAdService.ts`)

| Method | Mô tả |
|--------|-------|
| `getByBrandId(brandId, productId?)` | Lấy saved ads theo brand, optional filter theo product |
| `create(ad)` | Tạo record (brand_id, product_id, storage_path, image_url, headline, concept, prompt, source) |
| `deleteByStoragePath(path)` | Xóa 1 record theo storage_path |
| `bulkDeleteByStoragePaths(paths[])` | Xóa nhiều records |

### StorageService (`storageService.ts`)

| Method | Mô tả |
|--------|-------|
| `upload(bucket, path, file, contentType)` | Upload file lên Supabase Storage |
| `getPublicUrl(bucket, path)` | Lấy public URL |
| `remove(bucket, paths[])` | Xóa files |
| `buildPath(namespace, entityId, filename)` | Tạo path chuẩn |

## AI Services (Module-level functions)

### geminiClient.ts

```typescript
// Gọi Gemini API
geminiGenerate(model, parts[], maxTokens, structuredOutput?, systemInstruction?)
// → string (raw response text)

// Resize ảnh cho Gemini (inline_data base64)
resizeImageForApi(buffer, maxWidth?)
// → { data: string (base64), mimeType: string }

resizeImageFromUrl(url, maxWidth?)
// → { data: string (base64), mimeType: string }
```

**Model:** `GEMINI_TEXT_MODEL` = Gemini 2.5 Flash

### kieClient.ts

```typescript
// Tạo ảnh bằng KIE AI
generateImage(prompt, options?)
// → { imageUrl: string, taskId: string }

// Options:
{
  aspectRatio?: "1:1" | "4:5" | "9:16" | "16:9",
  resolution?: "1K" | "2K" | "4K",
  imageInput?: string[],    // Max 14 image URLs
}
```

**Model:** `nano-banana-2`
**Flow:** Create task → Poll (DB callback → API fallback) → Return image URL
**Timeout:** ~7 minutes max polling (84 attempts × 5s)

### claudeClient.ts

```typescript
// Phân tích ảnh bằng Claude Vision
claudeVisionAnalyze(base64, mimeType, prompt, maxTokens?)
// → string (raw response text)

// Gọi Claude text-only
claudeTextGenerate(systemPrompt, userMessage, maxTokens?)
// → string (raw response text)
```

**Model:** `claude-haiku-4-5-20251001`
**Dùng cho:** Competitor ad image analysis (vision), competitor sheet analysis, landing page analysis, persona generation, content adaptation

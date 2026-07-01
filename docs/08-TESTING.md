# Testing Guide

## Framework

- **Vitest 4** — test runner (tương thích Vite, nhanh, TypeScript-native)
- **@vitest/coverage-v8** — code coverage
- Config: `vitest.config.ts`

## Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy với watch mode (re-run khi file thay đổi)
npm run test:watch

# Chạy với coverage report
npm run test:coverage

# Chạy 1 file cụ thể
npx vitest run src/lib/__tests__/json-utils.test.ts

# Chạy tests matching pattern
npx vitest run -t "parseGoogleSheetUrl"
```

## Cấu trúc test files

```
src/
├── lib/__tests__/
│   ├── sheet-url-parser.test.ts   # 16 tests — URL parsing
│   ├── json-utils.test.ts         # 18 tests — JSON parse/repair
│   ├── concepts.test.ts           #  5 tests — DB row converters
│   ├── utils.test.ts              #  7 tests — cn() class merge
│   ├── prompt-assembler.test.ts   # 15 tests — prompt assembly
│   ├── sheets-reader.test.ts      # 11 tests — CSV parsing
│   ├── env.test.ts                #  8 tests — env validation
│   ├── crypto.test.ts             #  5 tests — ⚠️ STALE (xem "Test lỗi/lạc hậu")
│   ├── key-provider.test.ts       #  6 tests — ⚠️ STALE (xem "Test lỗi/lạc hậu")
│   └── user-context.test.ts       #  6 tests — ⚠️ STALE (xem "Test lỗi/lạc hậu")
├── app/api/__tests__/
│   ├── brands.test.ts             #  9 tests — GET/POST brands (4 fail, xem ghi chú)
│   ├── brand-admin-guard.test.ts  #  1 test  — guard chặn non-admin tạo brand
│   ├── concepts.test.ts           #  5 tests — GET/POST concepts
│   ├── user-concepts.test.ts      #  4 tests — GET/POST concepts theo user
│   ├── brand-kit.test.ts          #  7 tests — GET/PUT brand-kit
│   ├── save-ad.test.ts            #  8 tests — save + SSRF protection
│   ├── generate-ads-validation.test.ts # 7 tests — input validation
│   ├── apify-config-sync.test.ts  #  4 tests — sync config nguồn Apify
│   ├── elevenlabs-voices.test.ts  #  2 tests — list giọng đọc ElevenLabs
│   └── user-api-keys.test.ts      #  5 tests — ⚠️ STALE (xem "Test lỗi/lạc hậu")
├── features/video/utils/__tests__/
│   └── pipelineStages.test.ts     #  6 tests — trạng thái pipeline xử lý video
└── __tests__/
    ├── scriptPrompt.test.ts       # 10 tests — prompt tạo kịch bản video
    └── user-isolation.test.ts     #  5 tests — cách ly dữ liệu giữa user
```

**Tổng: 162 tests, 23 files** (chạy `npx vitest run` để xem số liệu mới nhất — 5 file trong số này hiện đang fail, xem mục dưới)

> Route `/api/clients` và `/api/product-markets` đã bị xoá khỏi codebase (không còn khái niệm "client" đa cấp) — các test file tương ứng (`clients.test.ts`, `product-markets.test.ts`) đã được xoá theo. Không còn tồn tại trong repo.

## Test lỗi/lạc hậu (cần dọn dẹp)

Chạy `npx tsc --noEmit` hiện báo lỗi type ở 4 file test sau, vì chúng còn tham chiếu tới hệ thống BYOK (per-user API key) đã bị gỡ bỏ (`../crypto`, `MissingApiKeyError` trong `user-context.ts` không còn tồn tại):

| File | Lỗi |
|------|-----|
| `src/app/api/__tests__/user-api-keys.test.ts` | Import route `@/app/api/user-api-keys/route` đã bị xoá |
| `src/lib/__tests__/crypto.test.ts` | Import `../crypto` đã bị xoá (mã hoá key theo user không còn cần thiết) |
| `src/lib/__tests__/key-provider.test.ts` | Import `../crypto` và `MissingApiKeyError` đã bị xoá |
| `src/lib/__tests__/user-context.test.ts` | Import `MissingApiKeyError` đã bị xoá |

Đây là tàn dư của việc gỡ bỏ BYOK (mỗi user tự nhập API key riêng) — nay toàn bộ API key đọc thẳng từ env server-only dùng chung cho cả app (xem `docs/09-ENVIRONMENT-VARIABLES.md`). 4 file này **nên được xoá hoặc viết lại** để khớp với `key-provider.ts` hiện tại — không nằm trong phạm vi tài liệu này để sửa.

Ngoài ra, `src/app/api/__tests__/brands.test.ts` có 4/9 test đang fail (chạy `npx vitest run`) do mock không khớp với `verifyAdmin` guard và schema hiện tại của route `POST /api/brands` (route không còn nhận `clientId`). Đây là lỗi test khác, không liên quan BYOK — cũng cần được sửa riêng.

## Viết test mới

### Unit test cho utility function

```typescript
// src/lib/__tests__/my-util.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "../my-util";

describe("myFunction", () => {
  it("handles normal input", () => {
    expect(myFunction("input")).toBe("expected");
  });

  it("handles edge case", () => {
    expect(myFunction("")).toBeNull();
  });
});
```

### API route test (với mock Supabase)

```typescript
// src/app/api/__tests__/my-route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 1. Hoisted mocks (phải khai báo trước vi.mock)
const { mockMethod } = vi.hoisted(() => ({
  mockMethod: vi.fn(),
}));

// 2. Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({})),
}));

// 3. Mock service class (dùng class syntax, không arrow function)
vi.mock("@/services/myService", () => ({
  MyService: class {
    myMethod = mockMethod;
  },
}));

// 4. Import route SAU khi khai báo mocks
import { GET, POST } from "../my-route/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/my-route", () => {
  it("returns data", async () => {
    mockMethod.mockResolvedValue([{ id: "1" }]);
    const response = await GET();
    expect(response.status).toBe(200);
  });
});
```

### Lưu ý quan trọng khi mock

1. **`vi.hoisted()`** — mock functions phải khai báo bằng `vi.hoisted()` để hoạt động trong `vi.mock()` factory
2. **Class syntax** — Service classes phải mock bằng `class { method = mockFn }`, không dùng arrow function (vì `new` không hoạt động với arrow)
3. **Import sau mock** — Route module phải import SAU khi khai báo tất cả `vi.mock()`
4. **Mock path** — Dùng `@/` alias (không dùng relative path) cho modules import bằng alias

## Coverage

Chạy `npm run test:coverage` → report HTML trong `coverage/`

### Files đã có coverage cao (>80%)

| File | Statements |
|------|-----------|
| `sheet-url-parser.ts` | 100% |
| `concepts.ts` | 100% |
| `utils.ts` | 100% |
| `json-utils.ts` | 97% |
| `prompt-assembler.ts` | 85% |
| `brands/route.ts` | ~cao (4 test đang fail — xem "Test lỗi/lạc hậu") |
| `concepts/route.ts` | 100% |
| `user-concepts/route.ts` | 100% |
| `brand-kit/route.ts` | 100% |
| `save-ad/route.ts` | 92% |
| `apify-config-sync` route | Cao |
| `elevenlabs/voices/route.ts` | Cao |
| `pipelineStages.ts` (video feature) | Cao |

Chạy `npm run test:coverage` để xem số liệu chính xác theo commit hiện tại — bảng trên chỉ mang tính tham khảo.

### Files chưa test (cần thêm)

| File | Lý do chưa test |
|------|-----------------|
| `gemini-reader.ts` | Phụ thuộc Gemini API (cần mock) |
| `concept-skills.ts` | Phụ thuộc Gemini API |
| `competitor-analyzer.ts` | Phụ thuộc Gemini Vision API |
| `prompt-scorer.ts` | Phụ thuộc Gemini API |
| `image-utils.ts` | Phụ thuộc sharp + Supabase Storage |
| `kieClient.ts` | Phụ thuộc KIE API + polling logic |
| Video pipeline services (transcription, script generation, TTS) | Phụ thuộc Gemini/ElevenLabs/Vbee API — chỉ `pipelineStages.ts` (state machine thuần) có test |
| `apify` sync service (ngoài phần config đã test) | Phụ thuộc Apify API |
| 11 service files | Thin wrappers — best tested with DB integration tests |
| Các API route CRUD còn lại | Follow same CRUD pattern as tested routes |

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
│   ├── sheet-url-parser.test.ts   # 14 tests — URL parsing
│   ├── json-utils.test.ts         # 14 tests — JSON parse/repair
│   ├── concepts.test.ts           #  6 tests — DB row converters
│   ├── utils.test.ts              #  7 tests — cn() class merge
│   ├── prompt-assembler.test.ts   # 13 tests — prompt assembly
│   ├── sheets-reader.test.ts      # 10 tests — CSV parsing
│   └── env.test.ts                #  8 tests — env validation
├── app/api/__tests__/
│   ├── clients.test.ts            #  8 tests — GET/POST clients
│   ├── brands.test.ts             #  9 tests — GET/POST brands
│   ├── concepts.test.ts           #  9 tests — GET/POST concepts
│   ├── product-markets.test.ts    #  9 tests — GET/POST markets
│   ├── brand-kit.test.ts          #  7 tests — GET/PUT brand-kit
│   ├── save-ad.test.ts            # 14 tests — save + SSRF protection
│   └── generate-ads-validation.test.ts # 7 tests — input validation
```

**Tổng: 144 tests, 14 files**

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
| `clients/route.ts` | 100% |
| `brands/route.ts` | 100% |
| `concepts/route.ts` | 100% |
| `product-markets/route.ts` | 100% |
| `brand-kit/route.ts` | 100% |
| `save-ad/route.ts` | 92% |

### Files chưa test (cần thêm)

| File | Lý do chưa test |
|------|-----------------|
| `gemini-reader.ts` | Phụ thuộc Gemini API (cần mock) |
| `concept-skills.ts` | Phụ thuộc Gemini API |
| `competitor-analyzer.ts` | Phụ thuộc Gemini Vision API |
| `prompt-scorer.ts` | Phụ thuộc Gemini API |
| `image-utils.ts` | Phụ thuộc sharp + Supabase Storage |
| `kieClient.ts` | Phụ thuộc KIE API + polling logic |
| 11 service files | Thin wrappers — best tested with DB integration tests |
| 14 remaining API routes | Follow same CRUD pattern as tested routes |

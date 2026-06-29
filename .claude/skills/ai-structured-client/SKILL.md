---
name: ai-structured-client
description: Generate a type-safe AI client (Gemini/OpenAI) with structured JSON output, automatic retry with exponential backoff, quota detection, and robust JSON parsing. Use when creating a new AI integration, adding Gemini/OpenAI calls to a project, or when user asks for AI client setup.
argument-hint: "[provider] [model-name]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# AI Structured Client Generator

Generate a production-ready AI client with structured JSON output, retry logic, and robust parsing for a Next.js + TypeScript project.

## Arguments

- `$0` = AI provider: `gemini` (default) or `openai`
- `$1` = Model name (optional, e.g. `gemini-2.5-flash`, `gpt-4o`)
- If no arguments: defaults to Gemini with `gemini-2.5-flash`

## What to Generate

Generate **3 files** that work together as a complete AI integration:

### File 1: `src/services/aiClient.ts` — Core AI Client

```typescript
// TEMPLATE — adapt to the user's provider ($0) and model ($1)

import { GoogleGenAI, Type } from "@google/genai";
// OR for OpenAI:
// import OpenAI from "openai";

export { Type }; // Re-export for schema building

export const AI_MODEL = "$1 or default";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 4000;

// --- Content Part Types ---
export type ContentPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

// --- Structured Output Config ---
export interface StructuredOutputConfig {
  responseMimeType: "application/json";
  responseSchema: any; // Provider-specific schema object
}

// --- Main Generate Function ---
export async function aiGenerate(
  model: string,
  parts: ContentPart[],
  maxOutputTokens?: number,
  structuredOutput?: StructuredOutputConfig,
  systemInstruction?: string,
): Promise<string> {
  // Implementation with:
  // 1. Client initialization (lazy, with API key from key-provider or env)
  // 2. Retry loop (MAX_RETRIES attempts)
  // 3. Per-attempt: call provider API with structured output config
  // 4. Error classification:
  //    - isRetryableError(): 429, 503, quota, rate limit, unavailable, overloaded
  //    - isDailyQuota(): PerDay, daily, billing — fail immediately, no retry
  //    - parseRetryDelay(): extract server-suggested delay from error message
  // 5. Backoff: server-suggested delay OR exponential with ±25% jitter
  // 6. Logging: attempt number, delay, error messages
}

// --- Helper Functions (MUST include all) ---
function isRetryableError(message: string): boolean { /* 429, 503, quota, rate limit, unavailable, overloaded */ }
function isDailyQuota(message: string): boolean { /* PerDay, daily, billing — but NOT if parseRetryDelay found */ }
function parseRetryDelay(message: string): number | null { /* "retryDelay":"22s" or "retry in 22.9s" → ms */ }
function sleep(ms: number): Promise<void> { /* setTimeout promise */ }
function backoffWithJitter(baseMs: number, attempt: number): number { /* 2^attempt * base ± 25% */ }
```

**Key patterns to preserve:**
- `parseRetryDelay` checks BEFORE `isDailyQuota` — if server says retry, it's recoverable
- Jitter prevents thundering herd on rate limit recovery
- `structuredOutput` with `responseMimeType: "application/json"` eliminates manual JSON extraction
- `systemInstruction` is persistent context (brand identity, persona) — not repeated per prompt

### File 2: `src/lib/json-utils.ts` — Robust JSON Parser

```typescript
export function safeJsonParse<T>(raw: string): T {
  // Implementation with:
  // 1. Strip BOM (charCodeAt(0) === 0xFEFF)
  // 2. Strip markdown code fences (```json ... ```)
  // 3. Extract JSON: find first { or [ and last matching } or ]
  // 4. Remove trailing commas before } or ]
  // 5. Try JSON.parse
  // 6. On failure: repairTruncatedJson() then retry
  // 7. repairTruncatedJson: close open strings (unmatched quotes),
  //    close open brackets/braces (track stack), remove trailing commas
}
```

**Critical: This parser handles real Gemini/OpenAI edge cases:**
- Markdown fences wrapping JSON
- Text before/after the JSON object
- Trailing commas (common in AI output)
- Truncated output (closed mid-string or mid-object)
- BOM characters from certain API responses

### File 3: `src/lib/key-provider.ts` — API Key Management (Optional)

Only generate if project uses Supabase. Otherwise use simple env-based pattern.

```typescript
// Resolution: in-memory cache (60s TTL) → DB app_settings → process.env fallback
export async function getApiKey(key: string): Promise<string | null> { /* ... */ }
export async function requireApiKey(key: string, displayName?: string): Promise<string> { /* ... */ }
export function clearKeyCache(): void { /* ... */ }
```

## Adaptation Rules

1. **For Gemini**: Use `@google/genai` SDK, `Type` enum for schema, `responseMimeType + responseSchema` for structured output
2. **For OpenAI**: Use `openai` SDK, `response_format: { type: "json_schema", json_schema: {...} }` for structured output
3. **For other providers**: Adapt the retry/parsing pattern to the provider's error format
4. **API key**: If project has Supabase → generate `key-provider.ts`. Otherwise → `process.env` directly
5. **Image support**: Include `resizeImageForApi()` and `resizeImageFromUrl()` helpers if project processes images (requires `sharp`)
6. **Model name**: Use `$1` if provided, otherwise use sensible default for the provider

## Usage Example (show to user after generating)

```typescript
import { aiGenerate, Type } from "@/services/aiClient";
import { safeJsonParse } from "@/lib/json-utils";

// Structured output — guaranteed JSON matching schema
const raw = await aiGenerate(
  "gemini-2.5-flash",
  [{ text: "Analyze this product: ..." }],
  4096,
  {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
        score: { type: Type.NUMBER },
      },
      required: ["name", "benefits", "score"],
    },
  },
  "You are a product analyst. Be concise and factual.",
);

const result = safeJsonParse<{ name: string; benefits: string[]; score: number }>(raw);
```

## Pre-generation Checklist

Before writing code:
1. Check `package.json` for existing AI SDK (`@google/genai`, `openai`)
2. Check if `src/services/` directory exists
3. Check if `src/lib/` directory exists
4. Check if there's an existing AI client to extend (not duplicate)
5. Check if project uses Supabase (for key-provider decision)
6. Use the project's existing TypeScript patterns (strict mode, path aliases, etc.)

## After Generation

1. Install missing dependencies: `npm install @google/genai` or `npm install openai`
2. Add API key to `.env.local`: `GOOGLE_API_KEY=xxx` or `OPENAI_API_KEY=xxx`
3. Run `npx tsc --noEmit` to verify types
4. Show the usage example to the user

# AI Structured Client — Reference Implementation

This file contains the exact production code from `static-ads-generator` that this skill is based on.
Use these as the source of truth when generating new clients.

---

## geminiClient.ts (Production Code)

```typescript
import { GoogleGenAI, Type } from "@google/genai";
import { resizeImageBuffer, fetchAndResizeImage } from "@/lib/image-utils";
import { requireApiKey } from "@/lib/key-provider";

export { Type };

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 4000;

async function getClient(): Promise<GoogleGenAI> {
  const apiKey = await requireApiKey("google_api_key", "GOOGLE_API_KEY");
  return new GoogleGenAI({ apiKey });
}

export type ContentPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export async function resizeImageForApi(
  imageBuffer: Buffer,
  maxWidth = 1024,
): Promise<{ data: string; mimeType: string }> {
  const resized = await resizeImageBuffer(imageBuffer, maxWidth);
  return {
    data: resized.toString("base64"),
    mimeType: "image/jpeg",
  };
}

export async function resizeImageFromUrl(
  url: string,
  maxWidth = 1024,
): Promise<{ data: string; mimeType: string }> {
  const resized = await fetchAndResizeImage(url, maxWidth);
  return {
    data: resized.toString("base64"),
    mimeType: "image/jpeg",
  };
}

export interface StructuredOutputConfig {
  responseMimeType: "application/json";
  responseSchema: any;
}

export async function geminiGenerate(
  model: string,
  parts: ContentPart[],
  maxOutputTokens = 2048,
  structuredOutput?: StructuredOutputConfig,
  systemInstruction?: string,
): Promise<string> {
  const ai = await getClient();

  const sdkParts = parts.map((p) =>
    "text" in p
      ? { text: p.text }
      : {
          inlineData: {
            mimeType: p.inline_data.mime_type,
            data: p.inline_data.data,
          },
        },
  );

  const config: any = { maxOutputTokens };
  if (structuredOutput) {
    config.responseMimeType = structuredOutput.responseMimeType;
    config.responseSchema = structuredOutput.responseSchema;
  }
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[aiClient] Generation attempt ${attempt + 1}/${MAX_RETRIES + 1} (model: ${model})`,
      );
      const response = await ai.models.generateContent({
        model,
        contents: { parts: sdkParts },
        config,
      });
      return response.text ?? "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[aiClient] Generation error: ${message}`);

      if (!isRetryableError(message)) throw err;
      if (isDailyQuota(message))
        throw new Error(
          "AI quota exhausted (hard limit). Enable billing or wait until quota resets.",
        );
      if (attempt === MAX_RETRIES)
        throw new Error(
          "AI rate limit exceeded after retries. Try again in a minute.",
        );

      const serverDelay = parseRetryDelay(message);
      const delay =
        serverDelay ?? backoffWithJitter(RETRY_BASE_DELAY_MS, attempt);
      console.warn(
        `[aiClient] Quota hit. Retrying in ${delay}ms${serverDelay ? " (server-suggested)" : ""}... (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await sleep(delay);
    }
  }

  throw new Error("AI request failed after all retries");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRetryableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("503") ||
    lower.includes("quota") ||
    lower.includes("resource exhausted") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  );
}

function isDailyQuota(message: string): boolean {
  if (parseRetryDelay(message) !== null) return false;
  const lower = message.toLowerCase();
  return (
    message.includes("PerDay") ||
    message.includes("per_day") ||
    lower.includes("daily") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("check your plan and billing") ||
    lower.includes("billing details")
  );
}

function parseRetryDelay(message: string): number | null {
  const jsonMatch = message.match(/"retryDelay"\s*:\s*"([\d.]+)s?"/i);
  if (jsonMatch) return Math.ceil(parseFloat(jsonMatch[1]) * 1000);
  const proseMatch = message.match(/retry in ([\d.]+)s/i);
  if (proseMatch) return Math.ceil(parseFloat(proseMatch[1]) * 1000);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffWithJitter(baseMs: number, attempt: number): number {
  const exponential = 2 ** attempt * baseMs;
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exponential + jitter);
}
```

---

## json-utils.ts (Production Code)

```typescript
const RE_CODE_FENCE_START = /^```(?:json)?\s*\n?/i;
const RE_CODE_FENCE_END = /\n?\s*```\s*$/i;
const RE_TRAILING_COMMA = /,\s*([}\]])/g;

export function safeJsonParse<T>(raw: string): T {
  let text = raw.trim();

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Strip markdown code fences
  text = text.replace(RE_CODE_FENCE_START, "").replace(RE_CODE_FENCE_END, "");

  // Extract JSON object or array
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");

  let start: number;
  let endChar: string;

  if (objStart === -1 && arrStart === -1) {
    start = 0;
    endChar = "";
  } else if (arrStart === -1 || (objStart !== -1 && objStart < arrStart)) {
    start = objStart;
    endChar = "}";
  } else {
    start = arrStart;
    endChar = "]";
  }

  if (endChar) {
    const end = text.lastIndexOf(endChar);
    if (end > start) {
      text = text.substring(start, end + 1);
    }
  }

  // Remove trailing commas
  text = text.replace(RE_TRAILING_COMMA, "$1");

  try {
    return JSON.parse(text) as T;
  } catch {
    const repaired = repairTruncatedJson(text);
    if (repaired !== text) {
      try {
        console.warn("[safeJsonParse] Repaired truncated JSON successfully");
        return JSON.parse(repaired) as T;
      } catch { /* fall through */ }
    }

    const preview = text.substring(0, 300);
    console.error(`[safeJsonParse] Failed. Preview: ${preview}`);
    throw new Error("Invalid JSON from AI: truncated or malformed response");
  }
}

function repairTruncatedJson(text: string): string {
  let repaired = text;

  // Close open strings
  let inString = false;
  let lastChar = "";
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (ch === '"' && lastChar !== "\\") inString = !inString;
    lastChar = ch;
  }
  if (inString) repaired += '"';

  // Remove trailing comma
  repaired = repaired.replace(/,\s*$/, "");

  // Close open brackets/braces
  const stack: string[] = [];
  let inStr = false;
  let prev = "";
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (ch === '"' && prev !== "\\") {
      inStr = !inStr;
    } else if (!inStr) {
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") stack.pop();
    }
    prev = ch;
  }

  while (stack.length > 0) {
    const open = stack.pop();
    repaired += open === "{" ? "}" : "]";
  }

  return repaired;
}
```

---

## key-provider.ts (Production Code — Supabase variant)

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

const KEY_ENV_MAP: Record<string, string> = {
  google_api_key: "GOOGLE_API_KEY",
  openai_api_key: "OPENAI_API_KEY",
  // Add more as needed
};

interface CachedKey {
  value: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CachedKey>();

export function clearKeyCache(): void {
  cache.clear();
}

export function clearKeyCacheEntry(key: string): void {
  cache.delete(key);
}

export async function getApiKey(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .single();

    if (data?.value) {
      cache.set(key, { value: data.value, cachedAt: Date.now() });
      return data.value;
    }
  } catch (err) {
    console.warn(
      `[key-provider] DB read failed for "${key}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const envName = KEY_ENV_MAP[key];
  if (envName) {
    const envValue = process.env[envName];
    if (envValue) {
      cache.set(key, { value: envValue, cachedAt: Date.now() });
      return envValue;
    }
  }

  return null;
}

export async function requireApiKey(
  key: string,
  displayName?: string,
): Promise<string> {
  const value = await getApiKey(key);
  if (!value) {
    const label = displayName ?? KEY_ENV_MAP[key] ?? key;
    throw new Error(
      `${label} is not configured. Set it in Admin settings or .env.local.`,
    );
  }
  return value;
}
```

---

## OpenAI Variant (Adaptation Guide)

When `$0 = openai`, adapt the client:

```typescript
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Structured output for OpenAI
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: systemInstruction },
    { role: "user", content: parts.map(p => "text" in p ? p.text : "[image]").join("\n") },
  ],
  max_tokens: maxOutputTokens,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "structured_output",
      schema: structuredOutput.responseSchema,
      strict: true,
    },
  },
});

// Error patterns for OpenAI retry:
// - 429 Rate limit
// - 503 Service unavailable
// - "insufficient_quota" → daily quota (fail immediately)
// - "rate_limit_exceeded" → retryable
// - response.headers["retry-after"] → server-suggested delay
```

---

## Schema Building Patterns

### Gemini (Type enum)
```typescript
import { Type } from "@/services/aiClient";

const schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Product name" },
    score: { type: Type.NUMBER },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    details: {
      type: Type.OBJECT,
      properties: {
        color: { type: Type.STRING },
        size: { type: Type.STRING },
      },
    },
  },
  required: ["name", "score"],
};
```

### OpenAI (JSON Schema)
```typescript
const schema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Product name" },
    score: { type: "number" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["name", "score"],
  additionalProperties: false,
};
```

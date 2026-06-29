import { GoogleGenAI, Type } from "@google/genai";
import { resizeImageBuffer, fetchAndResizeImage } from "@/lib/image-utils";
import { getUserApiKey } from "@/lib/key-provider";

// Re-export Type so callers can build responseSchema objects
export { Type };

// Text/vision model — gemini-2.5-flash has generous free-tier quota (1500 RPD).
export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 4000;

async function getClient(userId: string): Promise<GoogleGenAI> {
  const apiKey = await getUserApiKey(userId, "google");
  return new GoogleGenAI({ apiKey });
}

export type ContentPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

// ─── Image Resize (wrappers for Gemini base64 format) ───────────────────────

/**
 * Resize an image buffer and return as base64 for Gemini inline_data.
 */
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

/**
 * Fetch an image from a URL and resize it for Gemini inline_data.
 */
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

// ─── Text / Vision ────────────────────────────────────────────────────────────

/**
 * Optional structured-output config for guaranteed JSON responses.
 * When provided, Gemini returns machine-parseable JSON matching the schema —
 * no markdown fences, no extra text. This matches pati-image-ad-machine's
 * proven pattern of using responseMimeType + responseSchema.
 */
export interface StructuredOutputConfig {
  responseMimeType: "application/json";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema: any;
}

/**
 * Call Gemini for text/vision tasks with automatic retry on per-minute 429.
 * Daily quota exhaustion fails immediately with a clear message.
 *
 * When structuredOutput is provided, the response is guaranteed valid JSON
 * matching the schema — eliminating manual JSON extraction from free text.
 *
 * When systemInstruction is provided, it is set as the model's persistent
 * context (e.g. brand identity) so it does not need to be repeated in each
 * prompt — equivalent to Gemini's "system role" message.
 */
export async function geminiGenerate(
  userId: string,
  model: string,
  parts: ContentPart[],
  maxOutputTokens = 2048,
  structuredOutput?: StructuredOutputConfig,
  systemInstruction?: string,
): Promise<string> {
  const ai = await getClient(userId);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        `[geminiClient] Text generation attempt ${attempt + 1}/${MAX_RETRIES + 1} (model: ${model})`,
      );
      const response = await ai.models.generateContent({
        model,
        contents: { parts: sdkParts },
        config,
      });
      return response.text ?? "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[geminiClient] Text generation error: ${message}`);

      if (!isRetryableError(message)) throw err;
      if (isDailyQuota(message))
        throw new Error(
          "Google AI quota exhausted (hard limit). " +
            "Enable billing at https://console.cloud.google.com/billing or wait until your quota resets.",
        );
      if (attempt === MAX_RETRIES)
        throw new Error(
          "Gemini rate limit exceeded after retries. Try again in a minute.",
        );

      const serverDelay = parseRetryDelay(message);
      const delay =
        serverDelay ?? backoffWithJitter(RETRY_BASE_DELAY_MS, attempt);
      console.warn(
        `[geminiClient] Quota hit on text call. Retrying in ${delay}ms${serverDelay ? " (server-suggested)" : ""}... (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await sleep(delay);
    }
  }

  throw new Error("Gemini request failed after all retries");
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

/**
 * Returns true for hard quota exhaustion that cannot be resolved by retrying.
 *
 * CRITICAL: If the API includes a retryDelay / "Please retry in Xs" hint,
 * Google is telling us the limit is recoverable (per-minute RPM).
 * The error may still contain PerDay violations alongside PerMinute ones,
 * but the retry hint means we should wait and retry — not give up.
 */
function isDailyQuota(message: string): boolean {
  // If the API tells us to retry, it is recoverable — never treat as hard daily.
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

/**
 * Extract the server-suggested retry delay from a Gemini 429 error message.
 * Looks for patterns like `"retryDelay":"22s"` or `Please retry in 22.9s`.
 * Returns delay in milliseconds, or null if not found.
 */
function parseRetryDelay(message: string): number | null {
  // Match JSON retryDelay: "22s" or "22.5s"
  const jsonMatch = message.match(/"retryDelay"\s*:\s*"([\d.]+)s?"/i);
  if (jsonMatch) return Math.ceil(parseFloat(jsonMatch[1]) * 1000);

  // Match prose: "Please retry in 22.944400066s"
  const proseMatch = message.match(/retry in ([\d.]+)s/i);
  if (proseMatch) return Math.ceil(parseFloat(proseMatch[1]) * 1000);

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay with ±25% random jitter.
 * Jitter prevents multiple concurrent requests from retrying at the exact same
 * moment after a 429, which would immediately trigger another rate limit burst.
 */
function backoffWithJitter(baseMs: number, attempt: number): number {
  const exponential = 2 ** attempt * baseMs;
  const jitter = exponential * 0.25 * (Math.random() * 2 - 1); // ±25%
  return Math.round(exponential + jitter);
}

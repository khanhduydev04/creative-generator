// Server-only module — Anthropic Claude API client.
// Used for content adaptation (text + vision) and image analysis tasks.

import Anthropic from "@anthropic-ai/sdk";
import { getUserApiKey } from "@/lib/key-provider";

export const CLAUDE_HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const CLAUDE_SONNET_MODEL = "claude-sonnet-4-6";

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 3000;
const DEFAULT_STREAM_MAX_TOKENS = 2048;

async function getClient(userId: string): Promise<Anthropic> {
  const apiKey = await getUserApiKey(userId, "anthropic");
  return new Anthropic({ apiKey });
}

/**
 * Send a vision request to Claude with an image + text prompt.
 * Returns the text response (expected JSON).
 */
export async function claudeVisionAnalyze(
  userId: string,
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  prompt: string,
  maxTokens = 4096,
): Promise<string> {
  const client = await getClient(userId);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[claudeClient] Vision analysis attempt ${attempt + 1}/${MAX_RETRIES + 1}`,
      );

      const response = await client.messages.create({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[claudeClient] Vision error: ${message}`);

      const isRetryable =
        message.includes("429") ||
        message.includes("529") ||
        message.includes("overloaded") ||
        message.includes("rate_limit");

      if (!isRetryable || attempt === MAX_RETRIES) throw err;

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[claudeClient] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Claude request failed after all retries");
}

/**
 * Send a text-only request to Claude with a system prompt and user message.
 * Returns the text response.
 */
export async function claudeTextGenerate(
  userId: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096,
): Promise<string> {
  const client = await getClient(userId);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[claudeClient] Text generation attempt ${attempt + 1}/${MAX_RETRIES + 1}`,
      );

      const response = await client.messages.create({
        model: CLAUDE_HAIKU_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: "user", content: userMessage },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[claudeClient] Text generation error: ${message}`);

      const isRetryable =
        message.includes("429") ||
        message.includes("529") ||
        message.includes("overloaded") ||
        message.includes("rate_limit");

      if (!isRetryable || attempt === MAX_RETRIES) throw err;

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[claudeClient] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Claude text generation failed after all retries");
}

export async function claudeStreamGenerate(
  userId: string,
  systemPrompt: string,
  userMessage: string,
  onToken: (text: string) => void,
  maxTokens = DEFAULT_STREAM_MAX_TOKENS,
): Promise<string> {
  const client = await getClient(userId);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[claudeClient] Stream generation attempt ${attempt + 1}/${MAX_RETRIES + 1}`,
      );

      const stream = client.messages.stream({
        model: CLAUDE_SONNET_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      stream.on("text", onToken);

      const final = await stream.finalMessage();
      const textBlock = final.content.find((b) => b.type === "text");
      return textBlock && "text" in textBlock ? textBlock.text : "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[claudeClient] Stream generation error: ${message}`);

      const isRetryable =
        message.includes("429") ||
        message.includes("529") ||
        message.includes("overloaded") ||
        message.includes("rate_limit");

      if (!isRetryable || attempt === MAX_RETRIES) throw err;

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `[claudeClient] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Claude stream generation failed after all retries");
}

// Server-only module for KIE AI image generation API
//
// Flow: createTask (with callback URL pointing to Supabase Edge Function)
//       → KIE processes image → calls Edge Function → writes result to DB
//       → this code polls kie_task_results table until completed

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/key-provider";

const KIE_BASE_URL = "https://api.kie.ai/api/v1";
const KIE_CALLBACK_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kie-callback`;

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 84; // 84 × 5s = 7 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

export type KieAspectRatio =
  | "1:1"
  | "4:5"
  | "9:16"
  | "16:9"
  | "2:3"
  | "3:2"
  | "21:9"
  | "auto";

export type KieResolution = "1K" | "2K" | "4K";

export type KieOutputFormat = "jpg" | "png";

export interface KieGenerateOptions {
  aspectRatio?: KieAspectRatio;
  resolution?: KieResolution;
  outputFormat?: KieOutputFormat;
  imageInput?: string[];
}

interface KieCreateTaskResponse {
  code: number;
  data: {
    taskId: string;
  };
}

export interface KieGenerateResult {
  imageUrl: string;
  taskId: string;
}

/**
 * Outcome of interpreting a KIE `recordInfo` task-status payload.
 * `pending` means the task is not in a terminal state yet (keep polling).
 */
export type KieRecordOutcome =
  | { status: "completed"; imageUrl: string }
  | { status: "failed"; error: string }
  | { status: "pending" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the first generated image URL from a KIE `resultJson` value.
 * KIE returns `resultJson` as a JSON string (occasionally already parsed):
 *   {"resultUrls":["https://.../image.jpg"]}
 */
function extractImageUrl(resultJson: unknown): string | undefined {
  if (!resultJson) return undefined;
  try {
    const parsed =
      typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
    if (parsed && typeof parsed === "object") {
      const urls = (parsed as { resultUrls?: unknown }).resultUrls;
      if (Array.isArray(urls) && typeof urls[0] === "string") {
        return urls[0];
      }
    }
  } catch {
    // Malformed resultJson — treat as no image
  }
  return undefined;
}

/**
 * Interpret a KIE `GET /jobs/recordInfo` response into a terminal or pending
 * outcome. Pure function so the polling logic is unit-testable.
 *
 * KIE state values: "waiting" | "queuing" | "generating" | "success" | "fail".
 * NOTE: KIE uses `"fail"` (not "failed"/"error") — the previous code checked the
 * wrong strings, so failed tasks were never detected and polling ran until the
 * 7-minute timeout.
 */
export function interpretKieRecord(kieData: unknown): KieRecordOutcome {
  if (!kieData || typeof kieData !== "object") return { status: "pending" };
  const data = (kieData as { data?: unknown }).data;
  if (!data || typeof data !== "object") return { status: "pending" };

  const record = data as {
    state?: string;
    resultJson?: unknown;
    failCode?: string;
    failMsg?: string;
  };
  const state = record.state;

  if (state === "success") {
    const imageUrl = extractImageUrl(record.resultJson);
    if (imageUrl) return { status: "completed", imageUrl };
    // Succeeded but no image — usually a content-filtered result.
    return {
      status: "failed",
      error:
        record.failMsg ||
        "Task completed but no image was returned (it may have been filtered).",
    };
  }

  if (state === "fail") {
    const msg = (kieData as { msg?: string }).msg;
    return {
      status: "failed",
      error: record.failMsg || msg || "unknown error",
    };
  }

  // waiting | queuing | generating | undefined → keep polling
  return { status: "pending" };
}

async function getApiKey(userId: string): Promise<string> {
  return getUserApiKey(userId, "kie");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabaseAdmin() {
  return createAdminClient();
}

// ─── KIE AI Image Generation ─────────────────────────────────────────────────

/**
 * Generate an image via KIE AI REST API.
 *
 * 1. Creates a task via POST /jobs/createTask with callBackUrl → Supabase Edge Function
 * 2. KIE processes the image and POSTs result to the Edge Function
 * 3. Edge Function writes result to kie_task_results table
 * 4. This code polls the table until status is "completed" or "failed"
 *
 * IMPORTANT: KIE deletes generated files after 14 days — download and store
 * the image immediately after generation.
 */
export async function generateImage(
  userId: string,
  prompt: string,
  options: KieGenerateOptions = {},
): Promise<KieGenerateResult> {
  const apiKey = await getApiKey(userId);
  const {
    aspectRatio = "1:1",
    resolution = "1K",
    outputFormat = "jpg",
    imageInput = [],
  } = options;

  // ─── Step 1: Create task ──────────────────────────────────────────────
  const createBody = {
    model: "nano-banana-2",
    callBackUrl: KIE_CALLBACK_URL,
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      resolution: resolution,
      output_format: outputFormat,
      google_search: false,
      image_input: imageInput,
    },
  };

  console.log("[kieClient] Creating image generation task...");

  const createResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(
      `KIE createTask failed (${createResponse.status}): ${errorText}`,
    );
  }

  const createResult = (await createResponse.json()) as KieCreateTaskResponse;

  if (!createResult.data?.taskId) {
    throw new Error(
      `KIE createTask returned unexpected response: ${JSON.stringify(createResult)}`,
    );
  }

  const { taskId } = createResult.data;
  console.log(`[kieClient] Task created: ${taskId}, polling DB for result...`);

  // ─── Step 2: Insert pending row so we can track it ────────────────────
  const supabase = getSupabaseAdmin();

  await supabase.from("kie_task_results").upsert({
    task_id: taskId,
    status: "pending",
  });

  // ─── Step 3: Poll — DB first (callback path), then KIE recordInfo API ──
  async function cleanup(): Promise<void> {
    await supabase.from("kie_task_results").delete().eq("task_id", taskId);
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    // --- Try DB first (callback path — kie-callback edge function) ---
    const { data: row } = await supabase
      .from("kie_task_results")
      .select("status, image_url, error_message")
      .eq("task_id", taskId)
      .single();

    if (row?.status === "completed" && row.image_url) {
      console.log(`[kieClient] Image generated (via callback): ${taskId}`);
      await cleanup();
      return { imageUrl: row.image_url, taskId };
    }

    if (row?.status === "failed") {
      await cleanup();
      throw new Error(
        `KIE image generation failed (taskId: ${taskId}): ${row.error_message ?? "unknown"}`,
      );
    }

    // --- Fallback: poll KIE recordInfo directly ---
    let outcome: KieRecordOutcome = { status: "pending" };
    try {
      const kieStatus = await fetch(
        `${KIE_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (kieStatus.ok) {
        const kieData = (await kieStatus.json()) as unknown;
        outcome = interpretKieRecord(kieData);
        if (attempt % 6 === 0 || outcome.status !== "pending") {
          console.log(
            `[kieClient] Task ${taskId}: DB=${row?.status ?? "?"}, KIE=${outcome.status} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`,
          );
        }
      }
    } catch (err) {
      // Network hiccup — not terminal, keep polling. Log occasionally.
      if (attempt % 10 === 0) {
        console.warn(
          `[kieClient] recordInfo poll error (attempt ${attempt + 1}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (outcome.status === "completed") {
      console.log(`[kieClient] Image generated (via API poll): ${taskId}`);
      await cleanup();
      return { imageUrl: outcome.imageUrl, taskId };
    }

    if (outcome.status === "failed") {
      await cleanup();
      throw new Error(
        `KIE image generation failed (taskId: ${taskId}): ${outcome.error}`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // Timeout
  await cleanup();
  throw new Error(
    `KIE image generation timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s (taskId: ${taskId})`,
  );
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  // ─── Step 3: Poll — DB first, then fallback to KIE API ──────────────
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    // --- Try DB first (callback path) ---
    const { data: row } = await supabase
      .from("kie_task_results")
      .select("status, image_url, error_message")
      .eq("task_id", taskId)
      .single();

    if (row?.status === "completed" && row.image_url) {
      console.log(`[kieClient] Image generated (via callback): ${taskId}`);
      await supabase.from("kie_task_results").delete().eq("task_id", taskId);
      return { imageUrl: row.image_url, taskId };
    }

    if (row?.status === "failed") {
      await supabase.from("kie_task_results").delete().eq("task_id", taskId);
      throw new Error(
        `KIE image generation failed (taskId: ${taskId}): ${row.error_message ?? "unknown"}`,
      );
    }

    // --- Fallback: poll KIE API directly ---
    try {
      const kieStatus = await fetch(
        `${KIE_BASE_URL}/jobs/getTaskStatus?taskId=${taskId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
        },
      );

      if (kieStatus.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kieData = (await kieStatus.json()) as any;
        const kieState = kieData.data?.state ?? kieData.data?.status ?? kieData.status;

        console.log(
          `[kieClient] Task ${taskId}: DB=${row?.status ?? "?"}, KIE=${kieState} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`,
        );

        if (kieState === "completed" || kieState === "success") {
          let imageUrl =
            kieData.data?.output?.images?.[0]?.url ??
            kieData.data?.output?.image_url ??
            kieData.data?.imageUrl;

          if (!imageUrl && kieData.data?.resultJson) {
            try {
              const parsed = typeof kieData.data.resultJson === "string"
                ? JSON.parse(kieData.data.resultJson)
                : kieData.data.resultJson;
              imageUrl = parsed?.resultUrls?.[0];
            } catch {
              // ignore parse errors
            }
          }

          if (imageUrl) {
            console.log(`[kieClient] Image generated (via API poll): ${taskId}`);
            await supabase.from("kie_task_results").delete().eq("task_id", taskId);
            return { imageUrl, taskId };
          }
        }

        if (kieState === "failed" || kieState === "error") {
          await supabase.from("kie_task_results").delete().eq("task_id", taskId);
          throw new Error(
            `KIE image generation failed (taskId: ${taskId}): ${kieData.data?.error ?? kieData.message ?? "unknown"}`,
          );
        }
      }
    } catch (err) {
      // KIE API poll failed — not critical, continue with DB polling
      if (err instanceof Error && err.message.includes("KIE image generation failed")) {
        throw err;
      }
      // Log only every 10 attempts to avoid spam
      if (attempt % 10 === 0) {
        console.warn(
          `[kieClient] KIE API poll error (attempt ${attempt + 1}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // Timeout
  await supabase.from("kie_task_results").delete().eq("task_id", taskId);
  throw new Error(
    `KIE image generation timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s (taskId: ${taskId})`,
  );
}

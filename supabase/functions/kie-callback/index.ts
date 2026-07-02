// KIE AI task-completion webhook.
//
// KIE POSTs here when a `jobs/createTask` task finishes. We write the outcome to
// `kie_task_results` so the polling loop in `src/services/kieClient.ts` can
// resolve immediately (DB-first) instead of waiting on the recordInfo poll.
//
// The payload shape is not formally documented and differs across KIE API
// families, so parsing is intentionally defensive:
//   jobs API:    { code, msg, data: { taskId, state, resultJson, failMsg } }
//   runway-like: { code, msg, data: { result_image_url }, taskId }
//
// verify_jwt is disabled: KIE cannot send a Supabase JWT. This endpoint only
// upserts a row keyed by an opaque taskId, so the blast radius is minimal.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
function pick(obj: any, ...keys: string[]): any {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function extractImageUrl(resultJson: unknown): string | undefined {
  if (!resultJson) return undefined;
  try {
    const parsed =
      typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
    const urls = (parsed as { resultUrls?: unknown })?.resultUrls;
    if (Array.isArray(urls) && typeof urls[0] === "string") return urls[0];
  } catch {
    // ignore
  }
  return undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // deno-lint-ignore no-explicit-any
  const data = (body as any).data ?? {};
  const taskId: string | undefined = pick(data, "taskId") ?? pick(body, "taskId");

  if (!taskId) {
    return new Response(JSON.stringify({ ok: false, error: "no taskId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const state: string | undefined = pick(data, "state");
  const code = pick(body, "code");
  const imageUrl =
    extractImageUrl(pick(data, "resultJson")) ??
    pick(data, "result_image_url", "imageUrl") ??
    (Array.isArray(pick(data, "resultUrls"))
      ? pick(data, "resultUrls")[0]
      : undefined);
  const failMsg: string | undefined =
    pick(data, "failMsg") ?? pick(body, "msg");

  // Decide terminal outcome.
  const succeeded =
    state === "success" || (state === undefined && !!imageUrl && code === 200);
  const failed =
    state === "fail" ||
    (typeof code === "number" && code >= 400) ||
    (succeeded && !imageUrl);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  if (succeeded && imageUrl) {
    await supabase.from("kie_task_results").upsert({
      task_id: taskId,
      status: "completed",
      image_url: imageUrl,
      error_message: null,
    });
  } else if (failed) {
    await supabase.from("kie_task_results").upsert({
      task_id: taskId,
      status: "failed",
      image_url: null,
      error_message: failMsg ?? "KIE task failed",
    });
  } else {
    // Non-terminal / unrecognized callback — record nothing terminal, let
    // polling continue. Acknowledge so KIE does not retry.
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

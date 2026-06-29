import type { StealthGenerateRequest } from "@/features/stealth/types";
import { resizeAndUploadImages } from "@/lib/image-utils";
import { assembleStealthPrompt } from "@/lib/stealth-prompt-assembler";
import { requireUser, handleApiError } from "@/lib/user-context";
import type { KieAspectRatio } from "@/services/kieClient";
import { generateImage } from "@/services/kieClient";
import { NextRequest, NextResponse } from "next/server";

// KIE API allows up to 20,000 characters for input.prompt
const MAX_KIE_PROMPT_LENGTH = 20000;

// ─── SSE Helper ─────────────────────────────────────────────────────────────

function createSSEWriter(
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const encoder = new TextEncoder();
  return function send(event: string, data: unknown) {
    try {
      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      );
    } catch {
      // Client disconnected — ignore
    }
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: StealthGenerateRequest;
  try {
    body = (await request.json()) as StealthGenerateRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!body.plans?.length) {
    return NextResponse.json(
      { success: false, error: "No plans provided" },
      { status: 400 },
    );
  }

  // Authenticate before starting the stream
  let userId: string;
  try {
    ({ userId } = await requireUser(request));
  } catch (e) {
    return handleApiError(e);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = createSSEWriter(controller);

      function updateStep(step: string, status: string, message: string) {
        send("step", { step, status, message });
      }

      try {
        // ── STEP 1: Prepare product images ──────────────────────────
        updateStep("prepareImages", "running", "Resizing product images...");

        const productImages = body.productImages ?? [];
        let resizedImages: string[] = [];

        // Use cached resized images if available (pack mode optimization)
        if (body.cachedResizedProductImageUrls) {
          resizedImages = body.cachedResizedProductImageUrls;
          console.log(
            `[stealth/generate] Using ${resizedImages.length} cached resized product images`,
          );
        } else if (productImages.length > 0) {
          try {
            resizedImages = await resizeAndUploadImages(productImages, 1024);
            console.log(
              `[stealth/generate] Resized ${resizedImages.length} product images`,
            );
          } catch {
            console.warn(
              "[stealth/generate] Image resize failed, using originals",
            );
            resizedImages = productImages;
          }
        }

        // Resize reference image if provided (stealth-ref mode)
        let resizedRefImage: string | null = null;
        if (body.referenceImageUrl) {
          try {
            const [resized] = await resizeAndUploadImages(
              [body.referenceImageUrl],
              1024,
            );
            resizedRefImage = resized;
            console.log("[stealth/generate] Resized reference image");
          } catch {
            console.warn(
              "[stealth/generate] Reference image resize failed, using original",
            );
            resizedRefImage = body.referenceImageUrl;
          }
        }

        updateStep(
          "prepareImages",
          "completed",
          `${resizedImages.length} image${resizedImages.length !== 1 ? "s" : ""} prepared${resizedRefImage ? " + reference" : ""}`,
        );

        // ── STEP 2: Assemble prompts ────────────────────────────────
        updateStep(
          "assemblePrompts",
          "running",
          `Building ${body.plans.length} stealth prompt${body.plans.length > 1 ? "s" : ""}...`,
        );

        const audienceContext = {
          ageRange: body.audienceAgeRange,
          sensitivity: body.sensitivityLevel,
        };

        // Reference prompt note — appended when a reference image is provided
        const referencePromptNote = resizedRefImage
          ? `\n\nSCENE REFERENCE (LAST ATTACHED IMAGE) — REPLICATE THIS FORMAT:
The last attached image is the reference ad. Your generated image MUST follow the SAME:
- Scene format and layout structure (same type of post, same platform look)
- Content approach (same before/after split, same text overlay style, same composition pattern)
- Product visibility and placement style (same prominence level, same casual integration)
- Authenticity level (same "realness", same imperfections, same casual feel)
${body.referenceAnalysisSummary ? `Reference summary: ${body.referenceAnalysisSummary}` : ""}
What changes: the specific person, specific text, camera angle (5-15° shift), lighting warmth, product position.
What stays IDENTICAL: the scene template, format, structure, composition pattern, text density.
Swap the competitor's product with OUR product. Keep everything else structurally the same.

PROPS — REFERENCE ONLY:
ONLY include objects/props that exist in the reference scene. Do NOT add random keys, phones,
coffee cups, glasses, or other "authenticity" props that the reference doesn't have.

iPHONE CAMERA AESTHETIC — MANDATORY:
Image must look shot on iPhone 14/15 Pro: computational photography HDR, 26mm f/1.78,
slight noise in shadows, natural warm tones, NOT color-graded. Imperfections: slightly
off-level (1-2°), minor edge blur, not perfectly centered. For screen captures: pixel-perfect
platform UI, correct fonts and spacing. NEVER studio lighting or DSLR look.

PERSON IN IMAGE — CONTEXT-DEPENDENT (creatine product):
- BEFORE/AFTER or TRANSFORMATION scenes: "before" = normal/average untrained body (relatable),
  "after" = visibly improved, toned, 3-6 months training. The CONTRAST shows product effectiveness.
- SINGLE-MOMENT scenes (gym, lifestyle): athletic, toned, 1-2 years consistent training.
- OFFICE scenes: sharp, focused, energetic, well-groomed.

PRODUCT IMAGE — ABSOLUTE #1 PRIORITY:
The product MUST be IDENTICAL to the attached product reference images. Same packaging shape,
same label, same colors, same proportions. ZERO creative liberty. If the product is a green pouch,
it MUST be that exact green pouch. Getting the product wrong = entire ad is worthless.`
          : "";

        const promptEntries = body.plans.map((plan) => {
          let prompt = assembleStealthPrompt(
            plan,
            body.productName,
            body.productDescription,
            audienceContext,
          );
          // Append reference note if provided
          if (referencePromptNote) {
            prompt += referencePromptNote;
          }
          // Truncate if needed
          if (prompt.length > MAX_KIE_PROMPT_LENGTH) {
            prompt = prompt.substring(0, MAX_KIE_PROMPT_LENGTH);
          }
          // "name-only" plans: product name in text only, NO product images sent to KIE
          const isNameOnly = (plan.productVisibility ?? "physical") === "name-only";
          // Build imageInput: product images + reference image (if provided)
          const baseImages = isNameOnly ? [] : resizedImages.slice(0, 13);
          const imageInput = resizedRefImage
            ? [...baseImages, resizedRefImage].slice(0, 14)
            : baseImages;
          return {
            prompt,
            sceneId: plan.sceneId,
            sceneName: plan.sceneName,
            imageInput,
          };
        });

        updateStep(
          "assemblePrompts",
          "completed",
          `${promptEntries.length} prompt${promptEntries.length !== 1 ? "s" : ""} assembled`,
        );

        // ── STEP 3: Generate images ─────────────────────────────────
        send("meta", { totalExpected: promptEntries.length });
        updateStep(
          "generateImages",
          "running",
          `Generating ${promptEntries.length} stealth image${promptEntries.length > 1 ? "s" : ""} with KIE AI...`,
        );

        let completed = 0;
        let failed = 0;

        const kiePromises = promptEntries.map((entry) => {
          console.log(
            `[stealth/generate] Prompt for ${entry.sceneId}: ${entry.prompt.length} chars`,
          );
          return generateImage(userId, entry.prompt, {
            aspectRatio: (body.aspectRatio ?? "1:1") as KieAspectRatio,
            resolution: (body.resolution ?? "1K") as "1K" | "2K" | "4K",
            imageInput:
              entry.imageInput.length > 0 ? entry.imageInput : undefined,
          })
            .then((kieResult) => {
              completed++;
              send("result", {
                imageUrl: kieResult.imageUrl,
                taskId: kieResult.taskId,
                prompt: entry.prompt,
                sceneName: entry.sceneName,
                sceneId: entry.sceneId,
              });
              updateStep(
                "generateImages",
                "running",
                `Generated ${completed}/${promptEntries.length} image${promptEntries.length !== 1 ? "s" : ""}...`,
              );
            })
            .catch((err) => {
              failed++;
              const errMsg = err instanceof Error ? err.message : String(err);
              console.error(
                `[stealth/generate] Image generation failed for ${entry.sceneId}: ${errMsg}`,
              );
              send("imageError", {
                error: errMsg,
                sceneName: entry.sceneName,
                sceneId: entry.sceneId,
              });
            });
        });

        await Promise.allSettled(kiePromises);

        if (completed > 0) {
          updateStep(
            "generateImages",
            "completed",
            `${completed} image${completed !== 1 ? "s" : ""} generated${failed > 0 ? ` (${failed} failed)` : ""}`,
          );
        } else {
          updateStep("generateImages", "failed", "All image generations failed");
        }

        send("done", { totalResults: completed, totalFailed: failed });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[stealth/generate] Pipeline error:", message);
        send("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

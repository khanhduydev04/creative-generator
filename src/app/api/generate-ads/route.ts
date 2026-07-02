import { analyzeCompetitorAds } from "@/lib/competitor-analyzer";
import type { ConceptPrompt } from "@/lib/concept-prompt-loader";
import { loadFullConcept } from "@/lib/concept-prompt-loader";
import type { AudienceProfile, CompetitorContext } from "@/lib/concept-skills";
import {
  analyzeCompetitorSheet,
  applyConceptSkillVariants,
} from "@/lib/concept-skills";
import { analyzeCompetitorAdImageClaude, readProductPage } from "@/lib/gemini-reader";
import { resizeAndUploadImages } from "@/lib/image-utils";
import type { BrandProfile, OutputConfig } from "@/lib/prompt-assembler";
import {
  assembleCompetitorRefPrompt,
  assemblePrompt,
} from "@/lib/prompt-assembler";
import {
  fetchCompetitorSheet,
} from "@/lib/sheets-reader";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { BrandProductService } from "@/services/brandProductService";
import type { KieAspectRatio } from "@/services/kieClient";
import { generateImage } from "@/services/kieClient";
import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

// ─── KIE Prompt Length Limit ─────────────────────────────────────────────────
// KIE API allows up to 20,000 characters for input.prompt
const MAX_KIE_PROMPT_LENGTH = 20000;

// Hoisted regex patterns for condensePromptForKie — avoid re-creating per call
const RE_LANG_OVERRIDE =
  /⚠️ LANGUAGE OVERRIDE \(HIGHEST PRIORITY[^]*?keep original spelling\)\./;
const RE_PRODUCT_FIDELITY =
  /## ⚠️ PRODUCT IMAGE FIDELITY[^]*?FAIL IF:[^\n]*/;
const RE_BRAND_SECTION =
  /## BRAND\n[^]*?ZERO external colors[^\n]*/;
// Native/stealth prompt preservation patterns
const RE_AUTHENTICITY_MANDATE =
  /## AUTHENTICITY MANDATE[^]*?instant reject\./;
const RE_ANTI_AD_CONSTRAINTS =
  /## ANTI-AD CONSTRAINTS[^]*?"this is selling something"/;
// Strip order: least critical → most critical (stops once prompt fits)
const SECTIONS_TO_STRIP = [
  /## OUTPUT[\s\S]*$/,
  /## VISUAL DIRECTION[\s\S]*?(?=\n## |\n$)/,
  /### Attached Image Map[\s\S]*?(?=\n## |\n$)/,
  /## PRODUCT DATA[\s\S]*?(?=\n## |\n$)/,
];
// Native/stealth prompts: strip order (least critical → most critical)
const NATIVE_SECTIONS_TO_STRIP = [
  /## OUTPUT RULES[\s\S]*$/,
  /### Product Fidelity[\s\S]*?(?=\n## |\n$)/,
  /## REFERENCE SCENE ANALYSIS[\s\S]*?(?=\n## |\n$)/,
  /## IPHONE CAMERA AESTHETIC[\s\S]*?(?=\n## |\n$)/,
];
const RE_MULTI_NEWLINES = /\n{3,}/g;

/**
 * Condense a verbose prompt to fit within KIE's text length limit.
 * Keeps the most important creative direction while removing repetitive rules.
 */
function condensePromptForKie(
  prompt: string,
  maxLength: number = MAX_KIE_PROMPT_LENGTH,
): string {
  if (prompt.length <= maxLength) return prompt;

  // Detect prompt type — native/stealth prompts have different critical sections
  const isNativePrompt = prompt.includes("## AUTHENTICITY MANDATE");

  // Extract critical sections that MUST survive condensation
  const preservedSections: string[] = [];

  // Preserve language override block (highest priority — both types)
  const langMatch = prompt.match(RE_LANG_OVERRIDE);
  if (langMatch) {
    preservedSections.push(langMatch[0]);
  }

  if (isNativePrompt) {
    // Native/stealth: preserve authenticity mandate + anti-ad constraints
    const authMatch = prompt.match(RE_AUTHENTICITY_MANDATE);
    if (authMatch) {
      preservedSections.push(authMatch[0]);
    }
    const antiAdMatch = prompt.match(RE_ANTI_AD_CONSTRAINTS);
    if (antiAdMatch) {
      preservedSections.push(antiAdMatch[0]);
    }
  } else {
    // Traditional: preserve product fidelity (most critical) + brand
    const productFidelityMatch = prompt.match(RE_PRODUCT_FIDELITY);
    if (productFidelityMatch) {
      preservedSections.push(productFidelityMatch[0]);
    }
    const brandMatch = prompt.match(RE_BRAND_SECTION);
    if (brandMatch) {
      preservedSections.push(brandMatch[0]);
    }
  }

  // Remove verbose rule sections — type-specific strip order
  const sectionsToStrip = isNativePrompt ? NATIVE_SECTIONS_TO_STRIP : SECTIONS_TO_STRIP;

  let condensed = prompt;
  for (const regex of sectionsToStrip) {
    if (condensed.length <= maxLength) break;
    condensed = condensed.replace(regex, "");
  }

  // Remove excessive whitespace
  condensed = condensed.replace(RE_MULTI_NEWLINES, "\n\n").trim();

  // If still too long, truncate but preserve critical sections
  if (condensed.length > maxLength) {
    // Remove preserved sections from condensed (they'll be prepended)
    let body = condensed;
    for (const section of preservedSections) {
      body = body.replace(section, "");
    }
    body = body.replace(RE_MULTI_NEWLINES, "\n\n").trim();

    const preservedText =
      preservedSections.length > 0
        ? preservedSections.join("\n\n") + "\n\n"
        : "";
    const bodyBudget = maxLength - preservedText.length;

    if (bodyBudget > 0) {
      const truncated = body.substring(0, bodyBudget);
      const lastPeriod = truncated.lastIndexOf(".");
      const lastNewline = truncated.lastIndexOf("\n");
      const cutPoint = Math.max(lastPeriod, lastNewline);
      const trimmedBody =
        cutPoint > bodyBudget * 0.5
          ? truncated.substring(0, cutPoint + 1)
          : truncated;
      condensed = preservedText + trimmedBody;
    } else {
      condensed = preservedText.substring(0, maxLength);
    }
  }

  return condensed;
}

// ─── Request Body Type ───────────────────────────────────────────────────────

interface GenerateAdsRequest {
  productId: string;
  productName: string;
  productDescription?: string | null;
  productImages: string[];
  landingPageUrl: string;
  market?: string;
  language?: string;
  generationMode?: "concept" | "competitor_ref";
  competitorRefImageUrl?: string;
  // Pack mode: multiple competitor refs processed in parallel
  competitorRefImageUrls?: string[];
  conceptIds: string[];
  adCopyOverride?: {
    headline?: string;
    bodyText?: string;
    additionalNotes?: string;
  };
  targetAudience: AudienceProfile;
  brandProfile: BrandProfile;
  deepAnalysis?: boolean;
  outputConfig: {
    aspectRatio: string;
    resolution?: string;
    funnelStage?: string;
    count?: number;
  };
  // Pre-cached data from /api/prepare-generation (pack mode optimization)
  cachedProductContext?: import("@/lib/gemini-reader").ProductContext;
  cachedResizedProductImageUrls?: string[];
  cachedResizedBrandLogoUrl?: string | null;
}

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

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  // Parse request body
  let body: GenerateAdsRequest;
  try {
    body = (await request.json()) as GenerateAdsRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const adCount = Math.min(Math.max(body.outputConfig.count ?? 1, 1), 10);
  const mode = body.generationMode ?? "concept";

  // Validate required fields — landingPageUrl can be empty if cachedProductContext is provided
  if (!body.targetAudience) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!body.landingPageUrl && !body.cachedProductContext) {
    return NextResponse.json(
      { success: false, error: "Either a product URL or cached product context is required" },
      { status: 400 },
    );
  }

  if (mode === "concept" && !body.conceptIds?.length) {
    return NextResponse.json(
      {
        success: false,
        error: "Concept mode requires at least one concept",
      },
      { status: 400 },
    );
  }

  const isPackMode =
    mode === "competitor_ref" &&
    body.competitorRefImageUrls &&
    body.competitorRefImageUrls.length > 0;

  if (
    mode === "competitor_ref" &&
    !body.competitorRefImageUrl &&
    !isPackMode
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Competitor reference mode requires a reference image",
      },
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

  // ── All validation passed — create SSE stream ──────────────────────

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = createSSEWriter(controller);

      function updateStep(step: string, status: string, message: string) {
        send("step", { step, status, message });
      }

      try {
        // ── STEP 1: Read Product Page ──────────────────────────────────
        // Priority: client cache → DB cache → scrape from URL
        let productContext: import("@/lib/gemini-reader").ProductContext;
        if (body.cachedProductContext) {
          productContext = body.cachedProductContext;
          updateStep("readProductPage", "completed", "Product page (cached)");
        } else {
          // Try loading cached context from DB
          let dbCachedContext: import("@/lib/gemini-reader").ProductContext | null = null;
          if (body.productId) {
            try {
              const supabaseForProduct = await createClient();
              const productService = new BrandProductService(supabaseForProduct, userId);
              const dbProduct = await productService.getById(body.productId);
              if (dbProduct?.cached_product_context) {
                dbCachedContext = dbProduct.cached_product_context as unknown as import("@/lib/gemini-reader").ProductContext;
              }
            } catch {
              // Ignore DB errors, fall through to scraping
            }
          }

          if (dbCachedContext) {
            productContext = dbCachedContext;
            updateStep("readProductPage", "completed", "Product page (DB cached)");
          } else if (body.landingPageUrl) {
            updateStep("readProductPage", "running", "Reading product page...");
            productContext = await readProductPage(userId, body.landingPageUrl);
            updateStep("readProductPage", "completed", "Product page analyzed");

            // Fire-and-forget: cache the scraped context in DB for future use
            if (body.productId) {
              void (async () => {
                try {
                  const supabaseCache = await createClient();
                  const svc = new BrandProductService(supabaseCache, userId);
                  await svc.update(body.productId, {
                    cached_product_context: productContext as unknown as import("@/types/database.types").Json,
                    context_cached_at: new Date().toISOString(),
                  });
                  console.log("[generate-ads] Auto-cached product context for", body.productId);
                } catch (e) {
                  console.warn("[generate-ads] Failed to auto-cache product context:", e);
                }
              })();
            }
          } else {
            throw new Error("No product context available. Add a product URL in Brand Setup.");
          }
        }

        // ── Prepare product images (shared by both modes) ──────────────
        const productImages =
          body.productImages.length > 0 ? body.productImages : [];
        // KIE API supports up to 14 input images — send all product + reference images
        const MAX_IMAGES_PER_CALL = 14;

        interface PromptEntry {
          prompt: string;
          headline: string;
          conceptLabel: string;
          imageInput: string[];
        }

        const allPrompts: PromptEntry[] = [];

        // ════════════════════════════════════════════════════════════════
        // MODE: COMPETITOR REFERENCE
        // ════════════════════════════════════════════════════════════════
        if (mode === "competitor_ref") {
          const refUrls = isPackMode
            ? body.competitorRefImageUrls!
            : [body.competitorRefImageUrl!];
          const refCount = refUrls.length;
          const resizeWidth = 1024;

          // ── Phase 1: Analyze ALL refs via Claude (PARALLEL) ──────────
          updateStep(
            "analyzeCompetitorAd",
            "running",
            refCount > 1
              ? `Analyzing ${refCount} competitor ads in parallel (Claude)...`
              : "Analyzing competitor ad image (Claude)...",
          );

          const analysisResults = await Promise.allSettled(
            refUrls.map((url) => analyzeCompetitorAdImageClaude(userId, url)),
          );

          // Collect successful analyses, log failures
          const refAnalyses: Array<{
            url: string;
            analysis: Awaited<ReturnType<typeof analyzeCompetitorAdImageClaude>>;
          }> = [];
          for (let i = 0; i < analysisResults.length; i++) {
            const result = analysisResults[i];
            if (result.status === "fulfilled") {
              refAnalyses.push({ url: refUrls[i], analysis: result.value });
            } else {
              console.error(
                `[generate-ads] Ref ${i + 1}/${refCount} analysis failed:`,
                result.reason,
              );
              send("imageError", {
                error: `Ref ${i + 1} analysis failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
                headline: `Ref ${i + 1}`,
                concept: "Competitor Reference",
              });
            }
          }

          if (refAnalyses.length === 0) {
            updateStep("analyzeCompetitorAd", "failed", "All analyses failed");
            send("done", { totalResults: 0, totalFailed: refCount });
            controller.close();
            return;
          }

          updateStep(
            "analyzeCompetitorAd",
            "completed",
            refCount > 1
              ? `${refAnalyses.length}/${refCount} competitor ads analyzed`
              : "Competitor ad analyzed — layout, colors, typography extracted",
          );

          // ── Phase 2: Resize ALL ref images + product images (PARALLEL) ──
          updateStep(
            "assemblePrompt",
            "running",
            `Preparing images & building ${refAnalyses.length * adCount} prompts...`,
          );

          const maxProductImages = Math.min(
            productImages.length,
            MAX_IMAGES_PER_CALL - 1,
          );
          const budgetedProductImages = productImages.slice(0, maxProductImages);

          // Resize product images + brand logo + ALL ref images in parallel
          const [resizedProductImages, resizedBrandLogo, ...resizedRefResults] =
            await Promise.all([
              // Product images
              body.cachedResizedProductImageUrls
                ? Promise.resolve(
                    body.cachedResizedProductImageUrls.slice(0, maxProductImages),
                  )
                : budgetedProductImages.length > 0
                  ? resizeAndUploadImages(budgetedProductImages, resizeWidth).catch(
                      () => budgetedProductImages,
                    )
                  : Promise.resolve([] as string[]),
              // Brand logo
              body.cachedResizedBrandLogoUrl !== undefined
                ? Promise.resolve(body.cachedResizedBrandLogoUrl)
                : body.brandProfile.logoUrl
                  ? resizeAndUploadImages([body.brandProfile.logoUrl], 512)
                      .then(([url]) => url)
                      .catch(() => null as string | null)
                  : Promise.resolve(null as string | null),
              // ALL competitor ref images — smaller (512px) to reduce visual influence
              ...refAnalyses.map(({ url }) =>
                resizeAndUploadImages([url], 512)
                  .then(([resized]) => resized)
                  .catch(() => url),
              ),
            ]);

          // ── Phase 3: Assemble prompts for ALL refs ──────────────────
          for (let refIdx = 0; refIdx < refAnalyses.length; refIdx++) {
            const { analysis } = refAnalyses[refIdx];
            const resizedRef = resizedRefResults[refIdx];
            // Send product image(s) first (duplicating main product for visual weight),
            // then brand logo, then reference image LAST.
            // Product images at 1024px, reference at 512px — product dominates visually.
            const mainProduct = resizedProductImages[0];
            const extraProducts = resizedProductImages.slice(1);
            const combinedImages = [
              ...(mainProduct ? [mainProduct, mainProduct] : []),  // duplicate main product
              ...extraProducts,
              ...(resizedBrandLogo ? [resizedBrandLogo] : []),
              resizedRef,
            ].slice(0, MAX_IMAGES_PER_CALL);

            for (let i = 0; i < adCount; i++) {
              const outputConfig: OutputConfig = {
                aspectRatio: body.outputConfig.aspectRatio,
                resolution: body.outputConfig.resolution ?? "1K",
                funnelStage: body.outputConfig.funnelStage ?? "awareness",
                count: adCount,
                variantIndex: i,
              };

              const prompt = assembleCompetitorRefPrompt(
                analysis,
                productContext,
                body.brandProfile,
                body.targetAudience,
                outputConfig,
                body.productName,
                body.productDescription,
                budgetedProductImages.length,
                body.language,
                resizedBrandLogo !== null,
                body.adCopyOverride,
              );

              const refLabel = refCount > 1
                ? `Ref ${refIdx + 1}/${refCount}`
                : "";
              const variantLabel = adCount > 1
                ? ` — Style #${i + 1}`
                : "";

              allPrompts.push({
                prompt,
                headline: `${body.productName}${refLabel ? ` — ${refLabel}` : ""}${variantLabel}`,
                conceptLabel: "Competitor Reference",
                imageInput: combinedImages,
              });
            }
          }

          updateStep(
            "assemblePrompt",
            "completed",
            `${allPrompts.length} prompt${allPrompts.length > 1 ? "s" : ""} assembled`,
          );

          // ════════════════════════════════════════════════════════════════
          // MODE: CONCEPT — adCount is TOTAL output, distributed across concepts
          // ════════════════════════════════════════════════════════════════
        } else {
          // ── Load concepts + competitor data IN PARALLEL (async-parallel) ──
          const marketLabel = body.market || "market";
          updateStep(
            "readCompetitorSheet",
            "running",
            `Fetching competitor data (${marketLabel})...`,
          );

          // Start both independent operations concurrently
          const conceptsPromise = Promise.all(
            body.conceptIds.map(async (cid) => {
              const concept = await loadFullConcept(cid);
              return { conceptId: cid, concept };
            }),
          );

          const competitorPromise = (async (): Promise<CompetitorContext> => {
            // Skip competitor data when no market is configured
            if (!body.market) {
              updateStep("readCompetitorSheet", "completed", "No market configured — skipping competitor analysis");
              return analyzeCompetitorSheet(userId, "", "No competitor data available.");
            }

            // Use hardcoded MARKET_GID_MAP
            const marketCode = body.market ?? "";
            try {
              const rows = await fetchCompetitorSheet(marketCode);

              if (rows.length === 0) {
                return analyzeCompetitorSheet(
                  userId,
                  marketCode,
                  "No competitor data available for this market.",
                );
              }

              const hasUrls = rows.some((r) => r.imageUrl || r.landingPageUrl);
              if (body.deepAnalysis && hasUrls) {
                updateStep(
                  "readCompetitorSheet",
                  "running",
                  `Deep-analyzing top 5 of ${rows.length} competitor ads...`,
                );
                return analyzeCompetitorAds(userId, rows, marketCode);
              }

              updateStep(
                "readCompetitorSheet",
                "running",
                `Analyzing ${rows.length} competitor captions...`,
              );
              const captionCsv = rows
                .map(
                  (r) =>
                    `${r.rank},${r.productName},${r.pageName},${r.durationDays},${r.wowScore},"${r.caption.replace(/"/g, '""')}"`,
                )
                .join("\n");
              const header =
                "Rank,Product Name,Page Name,Duration (days),WOW,Caption";
              return analyzeCompetitorSheet(
                userId,
                marketCode,
                `${header}\n${captionCsv}`,
              );
            } catch (err) {
              console.warn(
                `[generate-ads] Competitor analysis failed, falling back to local CSV: ${err instanceof Error ? err.message : String(err)}`,
              );
              const sheetPath = path.join(
                process.cwd(),
                "src",
                "data",
                "competitors",
                `${marketCode}.csv`,
              );
              const sheetContent = await fs
                .readFile(sheetPath, "utf-8")
                .catch(() => "No competitor data available.");
              return analyzeCompetitorSheet(userId, marketCode, sheetContent);
            }
          })();

          // Await both results
          const [conceptEntries, competitorContext] = await Promise.all([
            conceptsPromise,
            competitorPromise,
          ]);

          const validConcepts = conceptEntries.filter(
            (e) => e.concept !== null,
          );
          if (validConcepts.length === 0) {
            send("error", {
              error: `No valid concepts found: ${body.conceptIds.join(", ")}`,
            });
            controller.close();
            return;
          }

          // ── Distribute adCount across concepts ──────────────────────
          const conceptCount = validConcepts.length;
          const basePerConcept = Math.floor(adCount / conceptCount);
          const extraCount = adCount % conceptCount;

          updateStep(
            "readCompetitorSheet",
            "completed",
            "Competitor market analyzed",
          );

          // ── STEP 3: Apply Concept Skills with distributed variant counts ──
          const totalAdsLabel = `${adCount} ad${adCount > 1 ? "s" : ""} across ${conceptCount} concept${conceptCount > 1 ? "s" : ""}`;
          updateStep(
            "applyConceptSkill",
            "running",
            `Generating creative variants for ${totalAdsLabel}...`,
          );

          interface ConceptResultEntry {
            conceptId: string;
            concept: NonNullable<(typeof validConcepts)[0]["concept"]>;
            directives: Awaited<ReturnType<typeof applyConceptSkillVariants>>;
            conceptPrompt: ConceptPrompt | null;
            adsForThisConcept: number;
          }

          const conceptResults: ConceptResultEntry[] = [];

          await Promise.all(
            validConcepts.map(async ({ conceptId, concept }, idx) => {
              const adsForThisConcept =
                basePerConcept + (idx < extraCount ? 1 : 0);
              if (adsForThisConcept === 0) return;

              const directives = await applyConceptSkillVariants(
                userId,
                concept!,
                productContext,
                competitorContext,
                null,
                body.targetAudience,
                adsForThisConcept,
                body.brandProfile.brandName,
                body.productDescription,
                body.language,
              );
              // Derive conceptPrompt from already-loaded concept — no duplicate DB fetch
              const conceptPrompt: ConceptPrompt | null = concept!.prompt
                ? {
                    conceptId: concept!.id,
                    label: concept!.label,
                    prompt: concept!.prompt,
                    referenceImages: concept!.referenceImages,
                  }
                : null;
              conceptResults.push({
                conceptId,
                concept: concept!,
                directives,
                conceptPrompt,
                adsForThisConcept,
              });
            }),
          );

          // Sort by original order (Promise.all may resolve out of order)
          const conceptOrder = validConcepts.map((e) => e.conceptId);
          conceptResults.sort(
            (a, b) =>
              conceptOrder.indexOf(a.conceptId) -
              conceptOrder.indexOf(b.conceptId),
          );

          updateStep(
            "applyConceptSkill",
            "completed",
            `${conceptResults.length} concept${conceptResults.length > 1 ? "s" : ""} applied`,
          );

          // ── STEP 4: Assemble Prompts + Prepare Images ──────────────────
          updateStep(
            "assemblePrompt",
            "running",
            `Building ${adCount} prompt${adCount > 1 ? "s" : ""} and preparing images...`,
          );

          // With 14 image slots, send all product images + all concept reference images
          const maxProductImages = Math.min(
            productImages.length,
            MAX_IMAGES_PER_CALL,
          );
          const budgetedProductImages = productImages.slice(
            0,
            maxProductImages,
          );
          const resizeWidth = 1024;

          console.log(
            `[generate-ads] Image budget: ${maxProductImages} product + refs, resize ${resizeWidth}px, max ${MAX_IMAGES_PER_CALL}/call`,
          );

          let resizedProductImages: string[] = [];
          if (budgetedProductImages.length > 0) {
            try {
              resizedProductImages = await resizeAndUploadImages(
                budgetedProductImages,
                resizeWidth,
              );
              console.log(
                `[generate-ads] Resized ${resizedProductImages.length} product images at ${resizeWidth}px`,
              );
            } catch (err) {
              console.warn(
                `[generate-ads] Image resize failed, using originals: ${err instanceof Error ? err.message : String(err)}`,
              );
              resizedProductImages = budgetedProductImages;
            }
          }

          // Include brand logo if available (for accurate packaging reproduction)
          let resizedBrandLogo: string | null = null;
          if (body.brandProfile.logoUrl) {
            try {
              const [resized] = await resizeAndUploadImages(
                [body.brandProfile.logoUrl],
                512,
              );
              resizedBrandLogo = resized;
            } catch {
              // Logo resize failed — skip, product packaging still has it
            }
          }

          // Allow all concept reference images (up to remaining budget after product + logo images)
          const baseImageCount =
            resizedProductImages.length + (resizedBrandLogo ? 1 : 0);
          const refBudgetPerConcept = Math.max(
            2,
            MAX_IMAGES_PER_CALL - baseImageCount,
          );
          const conceptRefImagesMap = new Map<string, string[]>();

          // Resize all concept ref images in parallel
          await Promise.allSettled(
            conceptResults
              .filter(
                (cr) => (cr.conceptPrompt?.referenceImages?.length ?? 0) > 0,
              )
              .map(async (cr) => {
                const budgetedRefs = cr.conceptPrompt!.referenceImages.slice(
                  0,
                  refBudgetPerConcept,
                );
                try {
                  const resized = await resizeAndUploadImages(
                    budgetedRefs,
                    resizeWidth,
                  );
                  conceptRefImagesMap.set(cr.conceptId, resized);
                } catch (err) {
                  console.warn(
                    `[generate-ads] Ref image resize failed for "${cr.conceptId}": ${err instanceof Error ? err.message : String(err)}`,
                  );
                  conceptRefImagesMap.set(cr.conceptId, budgetedRefs);
                }
              }),
          );

          for (const cr of conceptResults) {
            const conceptRefImages =
              conceptRefImagesMap.get(cr.conceptId) ?? [];
            const combinedImages = [
              ...resizedProductImages,
              ...(resizedBrandLogo ? [resizedBrandLogo] : []),
              ...conceptRefImages,
            ].slice(0, MAX_IMAGES_PER_CALL);

            for (let i = 0; i < cr.adsForThisConcept; i++) {
              const baseDirective = cr.directives[i % cr.directives.length];
              // Override headline/bodyText when user provided custom ad copy
              const variantDirective =
                body.adCopyOverride?.headline || body.adCopyOverride?.bodyText
                  ? {
                      ...baseDirective,
                      headline:
                        body.adCopyOverride.headline ?? baseDirective.headline,
                      bodyText:
                        body.adCopyOverride.bodyText ?? baseDirective.bodyText,
                    }
                  : baseDirective;

              const outputConfig: OutputConfig = {
                aspectRatio: body.outputConfig.aspectRatio,
                resolution: body.outputConfig.resolution ?? "1K",
                funnelStage: body.outputConfig.funnelStage ?? "awareness",
                count: cr.adsForThisConcept,
                variantIndex: i,
              };
              const prompt = assemblePrompt(
                variantDirective,
                productContext,
                body.brandProfile,
                body.targetAudience,
                outputConfig,
                cr.conceptPrompt,
                body.productName,
                body.productDescription,
                body.adCopyOverride,
                budgetedProductImages.length,
                body.language,
                {
                  hasBrandLogo: resizedBrandLogo !== null,
                  conceptRefCount: conceptRefImages.length,
                },
              );
              allPrompts.push({
                prompt,
                headline: variantDirective.headline,
                conceptLabel: cr.concept.label,
                imageInput: combinedImages,
              });
            }
          }

          updateStep(
            "assemblePrompt",
            "completed",
            `${allPrompts.length} prompt${allPrompts.length > 1 ? "s" : ""} assembled`,
          );
        }

        // ── FINAL STEP: Generate Images via KIE AI (parallel, streamed) ──
        send("meta", { totalExpected: allPrompts.length });
        updateStep(
          "generateImage",
          "running",
          `Generating ${allPrompts.length} image${allPrompts.length > 1 ? "s" : ""} with KIE AI...`,
        );

        let completed = 0;
        let failed = 0;

        const kiePromises = allPrompts.map((entry) => {
          const condensedPrompt = condensePromptForKie(entry.prompt);
          console.log(
            `[generate-ads] Prompt condensed: ${entry.prompt.length} → ${condensedPrompt.length} chars`,
          );
          return generateImage(userId, condensedPrompt, {
            aspectRatio: body.outputConfig.aspectRatio as KieAspectRatio,
            resolution: (body.outputConfig.resolution ?? "1K") as
              | "1K"
              | "2K"
              | "4K",
            imageInput:
              entry.imageInput.length > 0 ? entry.imageInput : undefined,
          })
            .then((kieResult) => {
              completed++;
              send("result", {
                imageUrl: kieResult.imageUrl,
                taskId: kieResult.taskId,
                prompt: entry.prompt,
                headline: entry.headline,
                concept: entry.conceptLabel,
                market: body.market || "",
              });
              updateStep(
                "generateImage",
                "running",
                `Generated ${completed}/${allPrompts.length} image${allPrompts.length !== 1 ? "s" : ""}...`,
              );
            })
            .catch((err) => {
              failed++;
              const errMsg = err instanceof Error ? err.message : String(err);
              console.error(
                `[generate-ads] Image generation failed: ${errMsg}`,
              );
              send("imageError", {
                error: errMsg,
                headline: entry.headline,
                concept: entry.conceptLabel,
                market: body.market || "",
                // Retry payload — lets the client re-run just this one image.
                prompt: entry.prompt,
                imageInput: entry.imageInput,
                aspectRatio: body.outputConfig.aspectRatio,
                resolution: body.outputConfig.resolution ?? "1K",
              });
            });
        });

        await Promise.allSettled(kiePromises);

        if (completed > 0) {
          updateStep(
            "generateImage",
            "completed",
            `${completed} image${completed !== 1 ? "s" : ""} generated${failed > 0 ? ` (${failed} failed)` : ""}`,
          );
        } else {
          updateStep("generateImage", "failed", "All image generations failed");
        }

        send("done", { totalResults: completed, totalFailed: failed });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[generate-ads] Pipeline error:", message);
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

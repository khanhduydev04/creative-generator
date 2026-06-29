"use client";
// Client Component: main workspace with 2-column layout — inputs (left) + output (right)

import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import type { Persona } from "@/features/brand/types";
import type { AdCopyOverride } from "@/features/workspace/components/AdCopySection";
import { AdCopySection } from "@/features/workspace/components/AdCopySection";
import { BrandProductSection } from "@/features/workspace/components/BrandProductSection";
import type { CompetitorRefSubMode, GenerationMode } from "@/features/workspace/components/CompetitorReferenceSection";
import { CompetitorReferenceSection } from "@/features/workspace/components/CompetitorReferenceSection";
import { ConceptSection } from "@/features/workspace/components/ConceptSection";
import { GenerateProgress } from "@/features/workspace/components/GenerateProgress";
import { LanguageSection } from "@/features/workspace/components/LanguageSection";
import { OutputVolumeSection } from "@/features/workspace/components/OutputVolumeSection";
import { TargetAudienceSection } from "@/features/workspace/components/TargetAudienceSection";
import type { Concept } from "@/lib/concepts";
import { parseSSEChunk } from "@/lib/sse-parser";
import { Loader2, Sparkles } from "lucide-react";
import { useProducts } from "@/hooks/api/useProducts";
import { useBrandKit } from "@/hooks/api/useBrandKit";
import { useBrands } from "@/hooks/api/useBrands";
import { useConcepts } from "@/hooks/api/useConcepts";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useResultsCache } from "@/hooks/useResultsCache";
import { useMemo, useState } from "react";
import type { StealthGenerationResult, StealthScenePlan } from "@/features/stealth/types";
import { StealthProgress } from "@/features/stealth/components/StealthProgress";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepStatus {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
}

interface GenerationResult {
  imageUrl: string;
  taskId: string;
  prompt: string;
  headline: string;
  concept: string;
  market: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceView() {
  const { t } = useT();
  const { selectedBrandId } = useApp();

  // Data — fetched via TanStack Query
  const { data: products = [] } = useProducts(selectedBrandId);
  const { data: brandKitData } = useBrandKit(selectedBrandId);
  const { data: brands } = useBrands();
  const { data: conceptsData } = useConcepts();

  const { data: personas = [] } = useQuery({
    queryKey: ["personas", selectedBrandId],
    queryFn: () => apiFetch<{ personas: Persona[] }>(`/api/personas?brandId=${selectedBrandId}`),
    select: (d) => d.personas,
    enabled: !!selectedBrandId,
  });

  const brandProfile = useMemo(() => {
    const kit = brandKitData?.kit as Record<string, string | null> | undefined;
    const brandName = brands?.find((b) => b.id === selectedBrandId)?.name ?? "";
    return {
      brandName,
      logoUrl: brandKitData?.logoUrls?.darkUrl ?? brandKitData?.logoUrls?.lightUrl ?? null,
      primaryColor1: kit?.primary_color_1 ?? "#17cf54",
      primaryColor2: kit?.primary_color_2 ?? "#15b84b",
      secondaryColor1: kit?.secondary_color_1 ?? "#1e293b",
      secondaryColor2: kit?.secondary_color_2 ?? "#334155",
      accentColor1: kit?.accent_color_1 ?? "#facc15",
      accentColor2: kit?.accent_color_2 ?? "#f59e0b",
      typography: kit?.typography ?? "Inter",
    };
  }, [brandKitData, brands, selectedBrandId]);

  const concepts = useMemo<Concept[]>(() => {
    if (!conceptsData) return [];
    const systemConcepts: Concept[] = conceptsData.system
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.concept_id,
        label: c.label,
        description: c.description ?? "",
        requiresCompetitor: c.requires_competitor,
        referenceImages: c.reference_images ?? [],
      }));
    const customConcepts: Concept[] = conceptsData.custom
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.concept_id,
        label: c.label,
        description: c.description ?? "",
        requiresCompetitor: c.requires_competitor,
        referenceImages: c.reference_images ?? [],
      }));
    return [...systemConcepts, ...customConcepts];
  }, [conceptsData]);

  // Form state — Section 1: Brand Product
  const [selectedProductId, setSelectedProductId] = useState("");

  // Form state — Generation Mode
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("competitor_ref");
  const [competitorRefImageUrls, setCompetitorRefImageUrls] = useState<
    string[]
  >([]);
  const [competitorRefSubMode, setCompetitorRefSubMode] =
    useState<CompetitorRefSubMode>("standard");

  // Form state — Stealth tuning (for competitor ref stealth sub-mode)
  const [sensitivityLevel, setSensitivityLevel] = useState<"normal" | "high">("normal");
  const [audienceAgeRange, setAudienceAgeRange] = useState("");

  // Form state — Section 2: Language
  const [language, setLanguage] = useState("en-US");

  // Form state — Section 3: Concepts (multi-select)
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);

  // Form state — Section 4a: Ad Copy (optional override)
  const [adCopy, setAdCopy] = useState<AdCopyOverride>({
    headline: "",
    bodyText: "",
    additionalNotes: "",
  });

  // Form state — Section 4b: Target Audience (multi-select)
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);

  // Form state — Section 5: Output
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [adCount, setAdCount] = useState(1);

  // Generation state (concept + standard competitor ref)
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalExpected, setTotalExpected] = useState(0);

  // Stealth ref state (single-step: plan silently → generate)
  const [isStealthGenerating, setIsStealthGenerating] = useState(false);
  const [stealthSteps, setStealthSteps] = useState<StepStatus[]>([]);
  const [stealthResults, setStealthResults] = useState<StealthGenerationResult[]>([]);
  const [stealthError, setStealthError] = useState<string | null>(null);
  const [stealthTotalExpected, setStealthTotalExpected] = useState(0);

  // Pack progress (which ref is currently being processed, 0-based)
  const [currentPackIndex, setCurrentPackIndex] = useState<number | null>(null);

  // Cache results in localStorage (1h TTL) to survive accidental navigation
  const { clearCache } = useResultsCache("workspace-results", results, setResults);
  const { clearCache: clearStealthCache } = useResultsCache(
    "workspace-stealth-results",
    stealthResults,
    setStealthResults,
  );

  // Derived: is stealth ref mode active?
  const isStealthRefMode =
    generationMode === "competitor_ref" && competitorRefSubMode === "stealth";

  // Derived: pack size for progress display
  const packRefCount =
    generationMode === "competitor_ref" ? competitorRefImageUrls.length : 1;

  // ── Validation ───────────────────────────────────────────────────
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedPersonas = personas.filter((p) =>
    selectedPersonaIds.includes(p.id),
  );

  const isConceptModeValid =
    generationMode === "concept" &&
    selectedConceptIds.length > 0;

  const isCompetitorRefModeValid =
    generationMode === "competitor_ref" && competitorRefImageUrls.length > 0;

  const isFormValid =
    selectedProductId !== "" &&
    selectedPersonaIds.length > 0 &&
    (isConceptModeValid || isCompetitorRefModeValid);

  // ── SSE stream helper — reads one SSE connection, dispatches events ──

  function processSseEvents(
    events: Array<{ event: string; data: string }>,
    onStep: (step: StepStatus) => void,
    onResult: (result: unknown) => void,
    onError: (error: string) => void,
    onMeta?: (meta: { totalExpected: number }) => void,
  ) {
    for (const sseEvent of events) {
      try {
        const raw = JSON.parse(sseEvent.data) as unknown;
        switch (sseEvent.event) {
          case "step":
            onStep(raw as StepStatus);
            break;
          case "meta":
            onMeta?.(raw as { totalExpected: number });
            break;
          case "result":
            onResult(raw);
            break;
          case "error":
            onError((raw as { error: string }).error);
            break;
          case "done":
            break;
        }
      } catch {
        // Ignore malformed events
      }
    }
  }

  async function readSseStream(
    res: Response,
    onStep: (step: StepStatus) => void,
    onResult: (result: unknown) => void,
    onError: (error: string) => void,
    onMeta?: (meta: { totalExpected: number }) => void,
  ): Promise<void> {
    const reader = res.body?.getReader();
    if (!reader) {
      onError("Failed to read response stream");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { events, remaining } = parseSSEChunk(buffer);
      buffer = remaining;

      processSseEvents(events, onStep, onResult, onError, onMeta);
    }
  }

  // ── Generate (SSE streaming) — concept & standard competitor ref ─

  const CONCEPT_STEPS: StepStatus[] = [
    { step: "readProductPage", status: "pending", message: "Waiting..." },
    { step: "readCompetitorSheet", status: "pending", message: "Waiting..." },
    { step: "applyConceptSkill", status: "pending", message: "Waiting..." },
    { step: "assemblePrompt", status: "pending", message: "Waiting..." },
    { step: "generateImage", status: "pending", message: "Waiting..." },
  ];

  const COMPETITOR_REF_STEPS: StepStatus[] = [
    { step: "readProductPage", status: "pending", message: "Waiting..." },
    { step: "analyzeCompetitorAd", status: "pending", message: "Waiting..." },
    { step: "assemblePrompt", status: "pending", message: "Waiting..." },
    { step: "generateImage", status: "pending", message: "Waiting..." },
  ];

  // Pre-cache response type from /api/prepare-generation
  interface PrepareGenerationData {
    productContext: Record<string, unknown>;
    resizedProductImageUrls: string[];
    resizedBrandLogoUrl: string | null;
  }

  async function handleGenerate() {
    if (!isFormValid || !selectedProduct || selectedPersonas.length === 0 || isGenerating)
      return;

    const primaryPersona = selectedPersonas[0];
    const isCompetitorRef = generationMode === "competitor_ref";
    const refUrls = isCompetitorRef ? competitorRefImageUrls : [];
    const isPackMode = refUrls.length > 1;

    setIsGenerating(true);
    setError(null);
    setResults([]);
    clearCache();
    setSteps(
      isCompetitorRef
        ? COMPETITOR_REF_STEPS.map((s) => ({ ...s }))
        : CONCEPT_STEPS.map((s) => ({ ...s })),
    );

    // For pack mode: total = adCount per ref × number of refs
    // For concept mode or single ref: total = adCount (may be updated by meta SSE)
    const packTotal = isPackMode ? adCount * refUrls.length : adCount;
    setTotalExpected(packTotal);
    setCurrentPackIndex(isPackMode ? 0 : null);

    // Accumulated results across all refs (needed for correct appending)
    const accumulated: GenerationResult[] = [];

    // Merge product-specific colors over brand colors (product colors override brand colors when set)
    const effectiveProfile = { ...brandProfile };
    if (selectedProduct.primary_color_1) effectiveProfile.primaryColor1 = selectedProduct.primary_color_1;
    if (selectedProduct.primary_color_2) effectiveProfile.primaryColor2 = selectedProduct.primary_color_2;
    if (selectedProduct.secondary_color_1) effectiveProfile.secondaryColor1 = selectedProduct.secondary_color_1;
    if (selectedProduct.secondary_color_2) effectiveProfile.secondaryColor2 = selectedProduct.secondary_color_2;
    if (selectedProduct.accent_color_1) effectiveProfile.accentColor1 = selectedProduct.accent_color_1;
    if (selectedProduct.accent_color_2) effectiveProfile.accentColor2 = selectedProduct.accent_color_2;

    const makeRequestBody = (refUrl?: string, cache?: PrepareGenerationData, packRefUrls?: string[]) => ({
      productId: selectedProductId,
      productName: selectedProduct.name,
      productDescription: selectedProduct.description,
      productImages: selectedProduct.images,
      landingPageUrl: selectedProduct.product_url ?? "",
      // Use DB-cached product context if available
      ...(selectedProduct.cached_product_context && !cache?.productContext && {
        cachedProductContext: selectedProduct.cached_product_context,
      }),
      language,
      generationMode,
      competitorRefImageUrl: isCompetitorRef ? refUrl : undefined,
      // Pack mode: send all refs in one request for parallel processing
      competitorRefImageUrls: packRefUrls,
      conceptIds: generationMode === "concept" ? selectedConceptIds : [],
      targetAudience: {
        title: primaryPersona.title,
        pain: primaryPersona.pain,
        angle: primaryPersona.angle,
        emotion: primaryPersona.emotion,
      },
      adCopyOverride:
        adCopy.headline.trim() ||
        adCopy.bodyText.trim() ||
        adCopy.additionalNotes.trim()
          ? {
              headline: adCopy.headline.trim() || undefined,
              bodyText: adCopy.bodyText.trim() || undefined,
              additionalNotes: adCopy.additionalNotes.trim() || undefined,
            }
          : undefined,
      selectedPersonaIds,
      brandProfile: effectiveProfile,
      outputConfig: {
        aspectRatio,
        resolution: "1K",
        funnelStage: "awareness",
        count: adCount,
      },
      // Pack mode optimization: pass pre-cached data to skip redundant work
      ...(cache && {
        cachedProductContext: cache.productContext,
        cachedResizedProductImageUrls: cache.resizedProductImageUrls,
        cachedResizedBrandLogoUrl: cache.resizedBrandLogoUrl,
      }),
    });

    // Helper to run one generation call
    async function generateForRef(refUrl?: string, refLabel?: string, cache?: PrepareGenerationData): Promise<void> {
      const requestBody = makeRequestBody(refUrl, cache);

      const res = await fetch("/api/generate-ads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        const prefix = refLabel ? `${refLabel}: ` : "";
        setError(prefix + (json.error ?? `Error ${res.status}`));
        return;
      }

      await readSseStream(
        res,
        // onStep
        (step) => {
          setSteps((prev) => {
            const idx = prev.findIndex((s) => s.step === step.step);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = step;
              return updated;
            }
            return [...prev, step];
          });
        },
        // onResult
        (raw) => {
          accumulated.push(raw as GenerationResult);
          setResults([...accumulated]);
        },
        // onError
        (errMsg) => {
          const prefix = refLabel ? `${refLabel}: ` : "";
          setError(prefix + errMsg);
        },
        // onMeta — only used for non-pack mode (single ref / concept)
        isPackMode
          ? undefined
          : (meta) => setTotalExpected(meta.totalExpected),
      );
    }

    try {
      if (isPackMode) {
        // Pack mode: pre-cache product data, then send ALL refs in ONE request
        // Server handles phased parallel: analyze all → resize all → generate all
        setSteps((prev) => [
          { step: "prepareCache", status: "running", message: "Preparing product data..." },
          ...prev,
        ]);

        let packCache: PrepareGenerationData | undefined;
        try {
          const prepRes = await fetch("/api/prepare-generation", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              landingPageUrl: selectedProduct.product_url ?? "",
              productImages: selectedProduct.images,
              brandLogoUrl: brandProfile.logoUrl || undefined,
            }),
          });
          if (prepRes.ok) {
            const prepJson = await prepRes.json() as { success: boolean } & PrepareGenerationData;
            if (prepJson.success) {
              packCache = prepJson;
            }
          }
        } catch {
          console.warn("[WorkspaceView] Pre-cache failed, will process in server");
        }

        setSteps((prev) => prev.map((s) =>
          s.step === "prepareCache"
            ? { ...s, status: "completed", message: packCache ? "Product data ready" : "Skipped" }
            : s,
        ));

        // Single request with all refs — server processes in parallel
        const requestBody = makeRequestBody(refUrls[0], packCache, refUrls);

        const res = await fetch("/api/generate-ads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setError(json.error ?? `Error ${res.status}`);
        } else {
          await readSseStream(
            res,
            (step) => {
              setSteps((prev) => {
                const idx = prev.findIndex((s) => s.step === step.step);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = step;
                  return updated;
                }
                return [...prev, step];
              });
            },
            (raw) => {
              accumulated.push(raw as GenerationResult);
              setResults([...accumulated]);
            },
            (errMsg) => setError(errMsg),
            (meta) => setTotalExpected(meta.totalExpected),
          );
        }
      } else {
        // Single ref or concept mode
        await generateForRef(refUrls[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCurrentPackIndex(null);
      setIsGenerating(false);
    }
  }

  // ── Stealth Ref: Plan silently → Generate (single-step from user's POV) ──

  const STEALTH_STEPS: StepStatus[] = [
    { step: "planScenes", status: "pending", message: "Waiting..." },
    { step: "prepareImages", status: "pending", message: "Waiting..." },
    { step: "assemblePrompts", status: "pending", message: "Waiting..." },
    { step: "generateImages", status: "pending", message: "Waiting..." },
  ];

  async function handleStealthRefGenerate() {
    if (!selectedProduct || selectedPersonas.length === 0 || competitorRefImageUrls.length === 0)
      return;

    // Capture after guard so TypeScript knows it's defined inside closures
    const product = selectedProduct;
    const refUrls = competitorRefImageUrls;
    const isPackMode = refUrls.length > 1;
    const packTotal = adCount * refUrls.length;

    setIsStealthGenerating(true);
    setStealthError(null);
    setStealthResults([]);
    clearStealthCache();
    setStealthSteps(STEALTH_STEPS.map((s) => ({ ...s })));
    setStealthTotalExpected(packTotal);
    setCurrentPackIndex(isPackMode ? 0 : null);

    const primaryPersona = selectedPersonas[0];
    const accumulated: StealthGenerationResult[] = [];

    // Helper to process one ref through plan → generate
    async function processStealthRef(refUrl: string, refLabel?: string, cache?: PrepareGenerationData): Promise<void> {
      // ── Step 1: Plan scenes ────────────────────────────
      setStealthSteps((prev) =>
        prev.map((s) =>
          s.step === "planScenes"
            ? { ...s, status: "running", message: refLabel ? `${refLabel} — Analyzing reference...` : "Analyzing reference & planning scenes..." }
            : s,
        ),
      );

      const planRes = await fetch("/api/stealth-ref/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName: product.name,
          productDescription: product.description,
          landingPageUrl: product.product_url ?? "",
          competitorRefImageUrl: refUrl,
          targetAudience: {
            title: primaryPersona.title,
            pain: primaryPersona.pain,
            angle: primaryPersona.angle,
            emotion: primaryPersona.emotion,
          },
          language,
          quantity: adCount,
          aspectRatio,
          sensitivityLevel,
          audienceAgeRange,
          // Pack mode optimization: pass cached product context
          ...(cache && { cachedProductContext: cache.productContext }),
        }),
      });

      const planJson = (await planRes.json()) as {
        success: boolean;
        plans?: StealthScenePlan[];
        analysisSummary?: string;
        error?: string;
      };

      if (!planJson.success || !planJson.plans) {
        const prefix = refLabel ? `${refLabel}: ` : "";
        setStealthSteps((prev) =>
          prev.map((s) =>
            s.step === "planScenes"
              ? { ...s, status: "failed", message: prefix + (planJson.error ?? "Planning failed") }
              : s,
          ),
        );
        setStealthError(prefix + (planJson.error ?? "Failed to plan stealth scenes"));
        return;
      }

      setStealthSteps((prev) =>
        prev.map((s) =>
          s.step === "planScenes"
            ? { ...s, status: "completed", message: `${planJson.plans!.length} scene plans ready` }
            : s,
        ),
      );

      // ── Step 2–4: Generate images via SSE ───────────────────────
      const genRes = await fetch("/api/stealth/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plans: planJson.plans,
          productName: product.name,
          productDescription: product.description,
          productImages: product.images,
          aspectRatio,
          resolution: "1K",
          sensitivityLevel,
          audienceAgeRange,
          referenceImageUrl: refUrl,
          referenceAnalysisSummary: planJson.analysisSummary ?? "",
          // Pack mode optimization: pass cached resized product images
          ...(cache && { cachedResizedProductImageUrls: cache.resizedProductImageUrls }),
        }),
      });

      if (!genRes.ok) {
        const json = (await genRes.json()) as { error?: string };
        const prefix = refLabel ? `${refLabel}: ` : "";
        setStealthError(prefix + (json.error ?? `Error ${genRes.status}`));
        return;
      }

      await readSseStream(
        genRes,
        // onStep
        (step) => {
          setStealthSteps((prev) => {
            const idx = prev.findIndex((s) => s.step === step.step);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = step;
              return updated;
            }
            return [...prev, step];
          });
        },
        // onResult
        (raw) => {
          accumulated.push(raw as StealthGenerationResult);
          setStealthResults([...accumulated]);
        },
        // onError
        (errMsg) => {
          const prefix = refLabel ? `${refLabel}: ` : "";
          setStealthError(prefix + errMsg);
        },
        // onMeta
        isPackMode
          ? undefined
          : (meta) => setStealthTotalExpected(meta.totalExpected),
      );
    }

    try {
      if (isPackMode) {
        // Pre-cache product data once for all refs
        setStealthSteps((prev) => [
          { step: "prepareCache", status: "running", message: "Preparing product data..." },
          ...prev,
        ]);

        let packCache: PrepareGenerationData | undefined;
        try {
          const prepRes = await fetch("/api/prepare-generation", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              landingPageUrl: product.product_url ?? "",
              productImages: product.images,
            }),
          });
          if (prepRes.ok) {
            const prepJson = await prepRes.json() as { success: boolean } & PrepareGenerationData;
            if (prepJson.success) {
              packCache = prepJson;
            }
          }
        } catch {
          console.warn("[WorkspaceView] Stealth pre-cache failed, falling back to per-ref processing");
        }

        setStealthSteps((prev) => prev.map((s) =>
          s.step === "prepareCache"
            ? { ...s, status: "completed", message: packCache ? "Product data ready" : "Skipped (will process per ref)" }
            : s,
        ));

        for (let i = 0; i < refUrls.length; i++) {
          setCurrentPackIndex(i);
          setStealthSteps((prev) => {
            const prepareCacheStep = prev.find((s) => s.step === "prepareCache");
            return [
              ...(prepareCacheStep ? [prepareCacheStep] : []),
              ...STEALTH_STEPS.map((s) => ({ ...s })),
            ];
          });

          await processStealthRef(refUrls[i], `Ref ${i + 1}/${refUrls.length}`, packCache);
        }
      } else {
        await processStealthRef(refUrls[0]);
      }
    } catch (err) {
      setStealthError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCurrentPackIndex(null);
      setIsStealthGenerating(false);
    }
  }

  // ── No brand selected ────────────────────────────────────────────
  if (!selectedBrandId) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <Sparkles className="h-10 w-10 text-primary mx-auto mb-4 opacity-40" />
        <p className="text-foreground-muted text-sm">
          {t.workspace.selectBrand}
        </p>
      </div>
    );
  }

  // ── Determine which sections to hide ──────────────────────────
  const shouldHideConcepts = generationMode === "competitor_ref";
  const shouldHideAdCopy = isStealthRefMode;
  const isBusy = isGenerating || isStealthGenerating;

  // ── Main Layout ──────────────────────────────────────────────────
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.workspace.createAds}</h1>
        <p className="mt-1.5 text-sm text-foreground-muted">
          {t.workspace.createAdsSubtitle}
        </p>
      </div>

      <div className="flex gap-8">
        {/* LEFT COLUMN — Inputs (fixed width 420px) */}
        <aside className="w-[420px] shrink-0 space-y-4">
          {/* [1] Brand Product */}
          <BrandProductSection
            products={products}
            selectedProductId={selectedProductId}
            onProductChange={(pid: string) => {
              setSelectedProductId(pid);
            }}
          />

          {/* [2] Language */}
          <LanguageSection
            language={language}
            onLanguageChange={setLanguage}
          />

          {/* [3] Generation Mode + Competitor Reference */}
          <CompetitorReferenceSection
            mode={generationMode}
            onModeChange={setGenerationMode}
            competitorRefImageUrls={competitorRefImageUrls}
            onImagesChange={setCompetitorRefImageUrls}
            competitorRefSubMode={competitorRefSubMode}
            onSubModeChange={setCompetitorRefSubMode}
            sensitivityLevel={sensitivityLevel}
            onSensitivityChange={setSensitivityLevel}
            audienceAgeRange={audienceAgeRange}
            onAudienceAgeRangeChange={setAudienceAgeRange}
          />

          {/* [4] Concepts (multi-select) — only in concept mode */}
          <div
            className={
              shouldHideConcepts
                ? "opacity-40 pointer-events-none"
                : ""
            }
          >
            <ConceptSection
              concepts={concepts}
              selectedConceptIds={selectedConceptIds}
              onConceptsChange={setSelectedConceptIds}
            />
          </div>

          {/* [5] Ad Copy (optional) — hidden in stealth ref mode */}
          {!shouldHideAdCopy && (
            <AdCopySection adCopy={adCopy} onAdCopyChange={setAdCopy} />
          )}

          {/* [6] Target Audience */}
          <TargetAudienceSection
            personas={personas}
            selectedPersonaIds={selectedPersonaIds}
            onSelectionChange={setSelectedPersonaIds}
          />

          {/* [7] Output Volume */}
          <OutputVolumeSection
            aspectRatio={aspectRatio}
            count={adCount}
            onAspectRatioChange={setAspectRatio}
            onCountChange={setAdCount}
          />

          {/* Generate Button — single button for all modes */}
          <button
            type="button"
            onClick={() =>
              void (isStealthRefMode ? handleStealthRefGenerate() : handleGenerate())
            }
            disabled={!isFormValid || isBusy}
            className="w-full cursor-pointer py-3.5 rounded-xl bg-primary text-white font-bold text-sm transition-all duration-200 hover:shadow-[0_0_24px_hsl(262_83%_65%/0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={!isFormValid ? "Fill all required fields" : undefined}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {currentPackIndex !== null
                  ? t.workspace.generatingRef.replace("{0}", String(currentPackIndex + 1)).replace("{1}", String(packRefCount))
                  : t.workspace.generating}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t.workspace.generateAds}
              </>
            )}
          </button>
        </aside>

        {/* RIGHT COLUMN — Output (flexible) */}
        <section className="flex-1 min-w-0">
          {isStealthRefMode ? (
            <StealthProgress
              isGenerating={isStealthGenerating}
              steps={stealthSteps}
              results={stealthResults}
              error={stealthError}
              totalExpected={stealthTotalExpected}
              brandId={selectedBrandId}
              productId={selectedProductId}
              productName={selectedProduct?.name ?? ""}
              brandContext={brandProfile}
              productContext={
                selectedProduct
                  ? {
                      productName: selectedProduct.name,
                      productDescription:
                        selectedProduct.description ?? null,
                      productImages: selectedProduct.images,
                    }
                  : null
              }
              aspectRatio={aspectRatio}
              language={language}
              onRetry={() => void handleStealthRefGenerate()}
              onResultsChange={setStealthResults}
              currentPackIndex={currentPackIndex}
              totalPackRefs={packRefCount}
            />
          ) : (
            <GenerateProgress
              isGenerating={isGenerating}
              steps={steps}
              results={results}
              error={error}
              adCount={adCount}
              totalExpected={totalExpected}
              brandId={selectedBrandId}
              productId={selectedProductId}
              productName={selectedProduct?.name ?? ""}
              brandContext={brandProfile}
              productContext={
                selectedProduct
                  ? {
                      productName: selectedProduct.name,
                      productDescription: selectedProduct.description ?? null,
                      productImages: selectedProduct.images,
                    }
                  : null
              }
              aspectRatio={aspectRatio}
              language={language}
              onRetry={() => void handleGenerate()}
              onResultsChange={setResults}
              currentPackIndex={currentPackIndex}
              totalPackRefs={packRefCount}
            />
          )}
        </section>
      </div>
    </div>
  );
}

"use client";
// Client Component: main stealth ads view with 2-column layout — inputs (left) + output (right)

import { useApp } from "@/features/app/context";
import type { BrandProduct, Persona } from "@/features/brand/types";
import type {
  StealthGenerationResult,
  StealthImageError,
  StealthPlanCard,
  StealthScenePlan,
} from "@/features/stealth/types";
import { BrandProductSection } from "@/features/workspace/components/BrandProductSection";
import { LanguageSection } from "@/features/workspace/components/LanguageSection";
import { OutputVolumeSection } from "@/features/workspace/components/OutputVolumeSection";
import { TargetAudienceSection } from "@/features/workspace/components/TargetAudienceSection";
import { ScenePlanPreview } from "@/features/stealth/components/ScenePlanPreview";
import { SceneSelectionSection } from "@/features/stealth/components/SceneSelectionSection";
import { StealthProgress } from "@/features/stealth/components/StealthProgress";
import { parseSSEChunk } from "@/lib/sse-parser";
import type { CustomSceneRow } from "@/features/stealth/components/SceneSelectionSection";
import { STEALTH_SCENES, mergeScenes } from "@/lib/stealth-scenes";
import { useT } from "@/lib/i18n/useTranslation";
import { EyeOff, Loader2, SlidersHorizontal, Sparkles, Wand2 } from "lucide-react";
import { useResultsCache } from "@/hooks/useResultsCache";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepStatus {
  step: string;
  status: "pending" | "running" | "completed" | "failed";
  message: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StealthView() {
  const { selectedBrandId } = useApp();
  const { t } = useT();

  // Data
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [customScenes, setCustomScenes] = useState<CustomSceneRow[]>([]);
  const [brandProfile, setBrandProfile] = useState({
    brandName: "",
    logoUrl: null as string | null,
    primaryColor1: "#17cf54",
    primaryColor2: "#15b84b",
    secondaryColor1: "#1e293b",
    secondaryColor2: "#334155",
    accentColor1: "#facc15",
    accentColor2: "#f59e0b",
    typography: "Inter",
  });

  // Form state — Product
  const [selectedProductId, setSelectedProductId] = useState("");

  // Form state — Language
  const [language, setLanguage] = useState("en-US");

  // Form state — Scene Selection
  const [sceneMode, setSceneMode] = useState<"auto" | "manual">("auto");
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

  // Form state — Target Audience
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);

  // Form state — Output
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [adCount, setAdCount] = useState(3);

  // Form state — Audience tuning
  const [sensitivityLevel, setSensitivityLevel] = useState<"normal" | "high">("normal");
  const [audienceAgeRange, setAudienceAgeRange] = useState("");

  // Plan state
  const [isPlanning, setIsPlanning] = useState(false);
  const [planCards, setPlanCards] = useState<StealthPlanCard[]>([]);
  const [planError, setPlanError] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [results, setResults] = useState<StealthGenerationResult[]>([]);
  const [failedImages, setFailedImages] = useState<StealthImageError[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [totalExpected, setTotalExpected] = useState(0);

  // Cache results in localStorage (1h TTL) to survive accidental navigation
  const { clearCache } = useResultsCache("stealth-results", results, setResults);

  // Merged scenes (built-in + custom)
  const allScenes = useMemo(
    () => (customScenes.length > 0 ? mergeScenes(STEALTH_SCENES, customScenes) : STEALTH_SCENES),
    [customScenes],
  );

  // ── Load brand data ──────────────────────────────────────────────
  const loadBrandData = useCallback(async (brandId: string) => {
    const results = await Promise.allSettled([
      fetch("/api/brand-products?brandId=" + brandId),
      fetch("/api/personas?brandId=" + brandId),
      fetch("/api/brands/" + brandId),
      fetch("/api/brand-kit/" + brandId),
      fetch("/api/stealth-scenes?brandId=" + brandId),
    ]);

    const [productsResult, personasResult, brandResult, kitResult, scenesResult] = results;

    if (productsResult.status === "fulfilled") {
      const json = (await productsResult.value.json()) as { products?: BrandProduct[] };
      setProducts(json.products ?? []);
    }

    if (scenesResult.status === "fulfilled") {
      const json = (await scenesResult.value.json()) as { scenes?: CustomSceneRow[] };
      setCustomScenes(json.scenes ?? []);
    }

    if (personasResult.status === "fulfilled") {
      const json = (await personasResult.value.json()) as { personas?: Persona[] };
      setPersonas(json.personas ?? []);
    }

    const brandName =
      brandResult.status === "fulfilled"
        ? ((await brandResult.value.json()) as { brand?: { name: string } }).brand?.name ?? ""
        : "";

    if (kitResult.status === "fulfilled") {
      const kitJson = (await kitResult.value.json()) as {
        kit?: {
          primary_color_1: string | null;
          primary_color_2: string | null;
          secondary_color_1: string | null;
          secondary_color_2: string | null;
          accent_color_1: string | null;
          accent_color_2: string | null;
          typography: string | null;
        };
        logoUrls?: { lightUrl: string | null; darkUrl: string | null };
      };
      if (kitJson.kit) {
        setBrandProfile({
          brandName,
          logoUrl: kitJson.logoUrls?.darkUrl ?? kitJson.logoUrls?.lightUrl ?? null,
          primaryColor1: kitJson.kit.primary_color_1 ?? "#17cf54",
          primaryColor2: kitJson.kit.primary_color_2 ?? "#15b84b",
          secondaryColor1: kitJson.kit.secondary_color_1 ?? "#1e293b",
          secondaryColor2: kitJson.kit.secondary_color_2 ?? "#334155",
          accentColor1: kitJson.kit.accent_color_1 ?? "#facc15",
          accentColor2: kitJson.kit.accent_color_2 ?? "#f59e0b",
          typography: kitJson.kit.typography ?? "Inter",
        });
      } else {
        setBrandProfile((prev) => ({ ...prev, brandName, logoUrl: null }));
      }
    } else {
      setBrandProfile((prev) => ({ ...prev, brandName, logoUrl: null }));
    }
  }, []);

  useEffect(() => {
    if (selectedBrandId) void loadBrandData(selectedBrandId);
  }, [selectedBrandId, loadBrandData]);

  // ── Validation ───────────────────────────────────────────────────
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedPersonas = personas.filter((p) => selectedPersonaIds.includes(p.id));

  const isFormValid =
    selectedProductId !== "" &&
    selectedPersonaIds.length > 0 &&
    (sceneMode === "auto" || selectedSceneIds.length > 0);

  // ── Plan Scenes ──────────────────────────────────────────────────
  async function handlePlanScenes() {
    if (!isFormValid || !selectedProduct || selectedPersonas.length === 0) return;

    setIsPlanning(true);
    setPlanError(null);
    setPlanCards([]);
    setResults([]);
    setGenError(null);

    const primaryPersona = selectedPersonas[0];

    try {
      const res = await fetch("/api/stealth/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId: selectedBrandId,
          productId: selectedProductId,
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          productImages: selectedProduct.images,
          landingPageUrl: selectedProduct.product_url ?? "",
          targetAudience: {
            title: primaryPersona.title,
            pain: primaryPersona.pain,
            angle: primaryPersona.angle,
            emotion: primaryPersona.emotion,
          },
          sceneSelection: sceneMode === "auto" ? "auto" : selectedSceneIds,
          language,
          quantity: adCount,
          aspectRatio,
          sensitivityLevel,
          audienceAgeRange,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        plans?: StealthScenePlan[];
        error?: string;
      };

      if (!json.success || !json.plans) {
        setPlanError(json.error ?? "Failed to generate scene plans");
        return;
      }

      setPlanCards(
        json.plans.map((plan, i) => ({
          index: i,
          plan,
          status: "planned" as const,
        })),
      );
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsPlanning(false);
    }
  }

  function handleUpdatePlan(index: number, plan: StealthScenePlan) {
    setPlanCards((prev) =>
      prev.map((card) => (card.index === index ? { ...card, plan } : card)),
    );
  }

  function handleRegeneratePlan(_index: number) {
    // Re-plan a single card — for now just re-plan all
    void handlePlanScenes();
  }

  function handleDeletePlan(index: number) {
    setPlanCards((prev) => {
      const filtered = prev.filter((c) => c.index !== index);
      // Re-index to keep indices sequential
      return filtered.map((card, i) => ({ ...card, index: i }));
    });
  }

  function handleReorderPlan(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= planCards.length) return;
    setPlanCards((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      // Re-index
      return next.map((card, i) => ({ ...card, index: i }));
    });
  }

  // ── Custom Scene CRUD ───────────────────────────────────────────
  async function handleCreateScene(input: {
    scene_id: string;
    category: string;
    name: string;
    description: string;
    placement_method: string;
    best_for_products?: string[];
    best_for_audiences?: string[];
  }) {
    if (!selectedBrandId) return;
    const res = await fetch("/api/stealth-scenes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brand_id: selectedBrandId, ...input }),
    });
    const json = (await res.json()) as { scene?: CustomSceneRow };
    if (json.scene) {
      setCustomScenes((prev) => [...prev, json.scene as CustomSceneRow]);
    }
  }

  async function handleUpdateScene(
    id: string,
    input: Partial<{
      scene_id: string;
      category: string;
      name: string;
      description: string;
      placement_method: string;
      best_for_products: string[];
      best_for_audiences: string[];
    }>,
  ) {
    const res = await fetch(`/api/stealth-scenes/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as { scene?: CustomSceneRow };
    if (json.scene) {
      setCustomScenes((prev) =>
        prev.map((s) => (s.id === id ? (json.scene as CustomSceneRow) : s)),
      );
    }
  }

  async function handleDeleteScene(id: string) {
    await fetch(`/api/stealth-scenes/${id}`, { method: "DELETE" });
    setCustomScenes((prev) => prev.filter((s) => s.id !== id));
  }

  function handleAddScene(sceneId: string) {
    const scene = allScenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Create a skeleton plan card for the new scene — user can edit details before generating
    const newPlan: StealthScenePlan = {
      sceneId: scene.id,
      sceneName: scene.name,
      productVisibility: scene.category === "FMT" ? "name-only" : "physical",
      composition: {
        cameraAngle: "eye-level, natural angle",
        lighting: "natural ambient light",
        colorMood: "warm neutral tones",
        settingDetail: scene.description,
      },
      surfaceContent: {
        whatViewerSees: scene.description,
        stopScrollHook: "Familiar everyday moment that feels personal",
        emotionalTrigger: "relatability",
      },
      productPlacement: {
        locationInFrame: "background or edge of frame",
        sizeRelative: "small — 5-10% of frame",
        integrationMethod: scene.placementMethod,
        labelVisibility: "partially visible, not focal",
        naturalJustification: "Product belongs in this setting naturally",
      },
      textInImage: {
        textType: "caption",
        textContent: "(edit this text)",
        textPlacement: "bottom or top overlay",
        textStyle: "casual, native to platform",
      },
      localization: {
        market: "US",
        culturalCues: [],
        languageStyle: language || "en-US",
      },
      generation: {
        aspectRatio,
        resolution: "1K",
        styleKeywords: ["candid", "authentic", "everyday"],
        antiKeywords: ["studio", "advertisement", "polished"],
      },
    };

    setPlanCards((prev) => {
      const nextIndex = prev.length > 0 ? Math.max(...prev.map((c) => c.index)) + 1 : 0;
      return [
        ...prev,
        { index: nextIndex, plan: newPlan, status: "planned" as const },
      ];
    });
  }

  // ── Generate Images ──────────────────────────────────────────────
  async function handleGenerate() {
    if (planCards.length === 0 || !selectedProduct) return;

    setIsGenerating(true);
    setGenError(null);
    setResults([]);
    setFailedImages([]);
    clearCache();
    setSteps([
      { step: "prepareImages", status: "pending", message: "Waiting..." },
      { step: "assemblePrompts", status: "pending", message: "Waiting..." },
      { step: "generateImages", status: "pending", message: "Waiting..." },
    ]);
    setTotalExpected(planCards.length);

    try {
      const res = await fetch("/api/stealth/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plans: planCards.map((c) => c.plan),
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          productImages: selectedProduct.images,
          aspectRatio,
          resolution: "1K",
          sensitivityLevel,
          audienceAgeRange,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setGenError(json.error ?? `Error ${res.status}`);
        setIsGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setGenError("Failed to read response stream");
        setIsGenerating(false);
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

        for (const sseEvent of events) {
          try {
            const raw = JSON.parse(sseEvent.data) as unknown;

            switch (sseEvent.event) {
              case "step": {
                const step = raw as StepStatus;
                setSteps((prev) => {
                  const idx = prev.findIndex((s) => s.step === step.step);
                  if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = step;
                    return updated;
                  }
                  return [...prev, step];
                });
                break;
              }
              case "meta": {
                const meta = raw as { totalExpected: number };
                setTotalExpected(meta.totalExpected);
                break;
              }
              case "result":
                setResults((prev) => [
                  ...prev,
                  raw as StealthGenerationResult,
                ]);
                break;
              case "imageError": {
                const errRaw = raw as {
                  error: string;
                  sceneName: string;
                  sceneId: string;
                  prompt?: string;
                  imageInput?: string[];
                  aspectRatio?: string;
                  resolution?: string;
                };
                setFailedImages((prev) => [
                  ...prev,
                  {
                    id: `${errRaw.sceneId}-${prev.length}-${Math.random().toString(36).slice(2, 8)}`,
                    sceneName: errRaw.sceneName,
                    sceneId: errRaw.sceneId,
                    error: errRaw.error,
                    prompt: errRaw.prompt,
                    imageInput: errRaw.imageInput,
                    aspectRatio: errRaw.aspectRatio,
                    resolution: errRaw.resolution,
                  },
                ]);
                break;
              }
              case "error": {
                const errData = raw as { error: string };
                setGenError(errData.error);
                break;
              }
              case "done":
                break;
            }
          } catch {
            // Ignore malformed events
          }
        }
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── No brand selected ────────────────────────────────────────────
  if (!selectedBrandId) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <EyeOff className="h-10 w-10 text-primary mx-auto mb-4 opacity-40" />
        <p className="text-foreground-muted text-sm">
          {t.stealth.selectBrand}
        </p>
      </div>
    );
  }

  // ── Main Layout ──────────────────────────────────────────────────
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.stealth.title}</h1>
        <p className="mt-1.5 text-sm text-foreground-muted">
          {t.stealth.subtitle}
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

          {/* [2] Target Audience */}
          <TargetAudienceSection
            personas={personas}
            selectedPersonaIds={selectedPersonaIds}
            onSelectionChange={setSelectedPersonaIds}
          />

          {/* [3] Audience Tuning */}
          <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30 space-y-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              </div>
              {t.stealth.audienceTuning}
            </h3>

            {/* Sensitivity Level */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                {t.stealth.productSensitivity}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSensitivityLevel("normal")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    sensitivityLevel === "normal"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background-elevated text-foreground-muted hover:border-border-strong"
                  }`}
                >
                  {t.stealth.normal}
                </button>
                <button
                  type="button"
                  onClick={() => setSensitivityLevel("high")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    sensitivityLevel === "high"
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-border bg-background-elevated text-foreground-muted hover:border-border-strong"
                  }`}
                >
                  {t.stealth.highSensitivity}
                </button>
              </div>
              <p className="text-xs text-foreground-subtle mt-1">
                {sensitivityLevel === "high"
                  ? t.stealth.extraStealthHint
                  : t.stealth.standardStealthHint}
              </p>
            </div>

            {/* Audience Age Range */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                {t.stealth.audienceAgeRange}
              </label>
              <select
                value={audienceAgeRange}
                onChange={(e) => setAudienceAgeRange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">{t.stealth.ageNotSpecified}</option>
                <option value="18-25">{t.stealth.age18to25}</option>
                <option value="25-35">{t.stealth.age25to35}</option>
                <option value="35-45">{t.stealth.age35to45}</option>
                <option value="40-55">{t.stealth.age40to55}</option>
                <option value="50+">{t.stealth.age50plus}</option>
              </select>
              <p className="text-xs text-foreground-subtle mt-1">
                {t.stealth.ageAdjustHint}
              </p>
            </div>
          </div>

          {/* [4] Scene Selection */}
          <SceneSelectionSection
            mode={sceneMode}
            selectedSceneIds={selectedSceneIds}
            allScenes={allScenes}
            customScenes={customScenes}
            onModeChange={setSceneMode}
            onScenesChange={setSelectedSceneIds}
            onCreateScene={handleCreateScene}
            onUpdateScene={handleUpdateScene}
            onDeleteScene={handleDeleteScene}
          />

          {/* [5] Language */}
          <LanguageSection
            language={language}
            onLanguageChange={setLanguage}
          />

          {/* [6] Output Volume */}
          <OutputVolumeSection
            aspectRatio={aspectRatio}
            count={adCount}
            onAspectRatioChange={setAspectRatio}
            onCountChange={setAdCount}
          />

          {/* Plan Scenes Button */}
          <button
            type="button"
            onClick={() => void handlePlanScenes()}
            disabled={!isFormValid || isPlanning || isGenerating}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            title={!isFormValid ? t.stealth.fillAllRequired : undefined}
          >
            {isPlanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.stealth.planningScenes}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                {t.stealth.planScenes}
              </>
            )}
          </button>

          {/* Generate All Button (only visible after planning) */}
          {planCards.length > 0 && (
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || isPlanning}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.stealth.generating}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t.stealth.generateAll} ({planCards.length})
                </>
              )}
            </button>
          )}
        </aside>

        {/* RIGHT COLUMN — Output (flexible) */}
        <section className="flex-1 min-w-0 space-y-6">
          {/* Plan Error */}
          {planError && (
            <div className="bg-rose-500/10 rounded-xl border border-rose-500/20 p-5">
              <p className="text-sm font-semibold text-rose-400">{t.stealth.planningFailed}</p>
              <p className="text-xs text-rose-400 mt-1">{planError}</p>
            </div>
          )}

          {/* Planning loader */}
          {isPlanning && (
            <div className="bg-background-elevated rounded-xl border border-border p-8 shadow-sm flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-sm font-bold text-foreground">{t.stealth.planningStealthScenes}</p>
              <p className="text-xs text-foreground-muted mt-1">
                {t.stealth.planningAnalyzing}
              </p>
            </div>
          )}

          {/* Plan Preview (before generation) */}
          {!isPlanning && planCards.length > 0 && results.length === 0 && !isGenerating && (
            <ScenePlanPreview
              planCards={planCards}
              onUpdatePlan={handleUpdatePlan}
              onRegeneratePlan={handleRegeneratePlan}
              onDeletePlan={handleDeletePlan}
              onReorderPlan={handleReorderPlan}
              onAddScene={handleAddScene}
              allScenes={allScenes}
              isPlanning={isPlanning}
            />
          )}

          {/* Generation Progress + Results */}
          <StealthProgress
            isGenerating={isGenerating}
            steps={steps}
            results={results}
            failedImages={failedImages}
            onFailedImagesChange={setFailedImages}
            error={genError}
            totalExpected={totalExpected}
            brandId={selectedBrandId}
            productId={selectedProductId}
            productName={selectedProduct?.name ?? ""}
            brandContext={selectedProduct ? {
              ...brandProfile,
              ...(selectedProduct.primary_color_1 && { primaryColor1: selectedProduct.primary_color_1 }),
              ...(selectedProduct.primary_color_2 && { primaryColor2: selectedProduct.primary_color_2 }),
              ...(selectedProduct.secondary_color_1 && { secondaryColor1: selectedProduct.secondary_color_1 }),
              ...(selectedProduct.secondary_color_2 && { secondaryColor2: selectedProduct.secondary_color_2 }),
              ...(selectedProduct.accent_color_1 && { accentColor1: selectedProduct.accent_color_1 }),
              ...(selectedProduct.accent_color_2 && { accentColor2: selectedProduct.accent_color_2 }),
            } : brandProfile}
            productContext={selectedProduct ? {
              productName: selectedProduct.name,
              productDescription: selectedProduct.description,
              productImages: selectedProduct.images ?? [],
            } : null}
            aspectRatio={aspectRatio}
            language={language}
            onRetry={() => void handleGenerate()}
            onResultsChange={setResults}
          />

          {/* Empty state */}
          {!isPlanning && planCards.length === 0 && results.length === 0 && !planError && !genError && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-foreground-subtle">
              <div className="w-24 h-24 rounded-2xl bg-background-elevated flex items-center justify-center mb-4">
                <EyeOff className="h-10 w-10 text-foreground-subtle" />
              </div>
              <p className="text-sm font-medium">{t.stealth.noStealthAdsYet}</p>
              <p className="text-xs mt-1">
                {t.stealth.fillFormHint}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

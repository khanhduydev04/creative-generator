"use client";
// Client Component: manages brand form state with interactive inputs, mutation hooks for save/generate/persona CRUD

import { useApp } from "@/features/app/context";
import { useAuth } from "@/features/auth/context";
import { useT } from "@/lib/i18n/useTranslation";
import { AddProfileModal } from "@/features/brand/components/AddProfileModal";
import { ApifySyncSection } from "@/features/brand/components/ApifySyncSection";
import { DeleteConfirmModal } from "@/features/brand/components/DeleteConfirmModal";
import { EditProfileModal } from "@/features/brand/components/EditProfileModal";
import { GoogleFontPicker } from "@/features/brand/components/GoogleFontPicker";
import { ProductsTab } from "@/features/brand/components/ProductsTab";
import type { Persona } from "@/features/brand/types";
import {
  useBrandDetail,
  useCreateBrand,
  useUpdateBrand,
} from "@/hooks/api/useBrands";
import { useBrandKit, useSaveBrandKit, useUploadLogo, useResetBrand } from "@/hooks/api/useBrandKit";
import { useBrandIntelligence, useSaveResearch, useGeneratePersonas } from "@/hooks/api/useBrandIntelligence";
import { usePersonas, useUpdatePersona, useDeletePersona } from "@/hooks/api/usePersonas";
import {
  AlignLeft,
  Eye,
  ImageIcon,
  Info,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  COLOR_TIERS,
  EMPTY_BRAND_COLORS,
  getConfiguredTierColors,
  hasAnyConfiguredColor,
  type BrandColors,
  type ColorKey,
} from "@/features/brand/utils/brandColorSlots";
import { useEffect, useRef, useState } from "react";

const COLOR_PICKER_SEED = "#000000"; // Native <input type="color"> requires a value even before the user has picked one; never displayed as a swatch or persisted on its own.

export function BrandSetupForm() {
  const { selectedBrandId, setSelectedBrandId } = useApp();
  const { profile } = useAuth();
  const { t } = useT();
  const canEdit = !!profile;

  const researchPlaceholder = t.brandSetup.researchPlaceholder;
  const tierLabels: Record<string, string> = {
    primary: t.brand.primary,
    secondary: t.brand.secondary,
    accent: t.brand.accent,
  };

  // --- Queries ---
  const brandDetail = useBrandDetail(selectedBrandId);
  const brandKit = useBrandKit(selectedBrandId);
  const intelligence = useBrandIntelligence(selectedBrandId);
  const personasQuery = usePersonas(selectedBrandId);

  const brandLoading =
    brandDetail.isLoading || brandKit.isLoading || intelligence.isLoading || personasQuery.isLoading;

  // --- Mutations ---
  const createBrandMutation = useCreateBrand();
  const updateBrandMutation = useUpdateBrand(selectedBrandId ?? "");
  const saveBrandKitMutation = useSaveBrandKit(selectedBrandId ?? "");
  const uploadLogoMutation = useUploadLogo(selectedBrandId ?? "");
  const saveResearchMutation = useSaveResearch(selectedBrandId ?? "");
  const generatePersonasMutation = useGeneratePersonas(selectedBrandId ?? "");
  const resetBrandMutation = useResetBrand(selectedBrandId ?? "");
  const updatePersonaMutation = useUpdatePersona();
  const deletePersonaMutation = useDeletePersona();

  // --- Local form state ---
  const [brandName, setBrandName] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [typography, setTypography] = useState("Inter");
  const [fontSource, setFontSource] = useState<"google" | "local" | null>(
    "google",
  );
  const [colors, setColors] = useState<BrandColors>(EMPTY_BRAND_COLORS);
  const [saved, setSaved] = useState(false);

  const [research, setResearch] = useState("");
  const [researchSaved, setResearchSaved] = useState(false);

  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [deletingPersona, setDeletingPersona] = useState<Persona | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);

  // --- Initialize form state from query data ---
  useEffect(() => {
    if (brandDetail.data) {
      setBrandName(brandDetail.data.name);
      setBrandDescription(brandDetail.data.description ?? "");
    }
  }, [brandDetail.data]);

  useEffect(() => {
    const kit = brandKit.data?.kit as Record<string, string | null> | null;
    if (kit) {
      setTypography((kit.typography as string) ?? "Inter");
      setFontSource((kit.font_source as "google" | "local" | null) ?? "google");
      setColors({
        primary1: kit.primary_color_1 ?? null,
        primary2: kit.primary_color_2 ?? null,
        secondary1: kit.secondary_color_1 ?? null,
        secondary2: kit.secondary_color_2 ?? null,
        accent1: kit.accent_color_1 ?? null,
        accent2: kit.accent_color_2 ?? null,
      });
    }
  }, [brandKit.data]);

  useEffect(() => {
    if (intelligence.data) {
      setResearch(intelligence.data.summary?.content ?? "");
    }
  }, [intelligence.data]);

  // Derived values
  const personas = personasQuery.data ?? [];
  const logoLightUrl = brandKit.data?.logoUrls?.lightUrl ?? null;
  const logoDarkUrl = brandKit.data?.logoUrls?.darkUrl ?? null;
  const saving = saveBrandKitMutation.isPending || updateBrandMutation.isPending;
  const savingResearch = saveResearchMutation.isPending;
  const generatingPersonas = generatePersonasMutation.isPending;

  function updateColor(key: ColorKey, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
  }

  function clearColor(key: ColorKey) {
    setColors((prev) => ({ ...prev, [key]: null }));
  }

  async function ensureBrand(): Promise<string> {
    if (selectedBrandId) return selectedBrandId;
    const result = await createBrandMutation.mutateAsync(
      brandName || t.brandSetup.myBrand,
    );
    if (!result.brand) throw new Error(t.brandSetup.failedToCreateBrand);
    setSelectedBrandId(result.brand.id);
    return result.brand.id;
  }

  async function handleSaveBrandKit() {
    try {
      const brandId = await ensureBrand();
      await Promise.all([
        updateBrandMutation.mutateAsync({
          name: brandName,
          description: brandDescription,
        }),
        saveBrandKitMutation.mutateAsync({
          typography,
          font_source: fontSource,
          primary_color_1: colors.primary1,
          primary_color_2: colors.primary2,
          secondary_color_1: colors.secondary1,
          secondary_color_2: colors.secondary2,
          accent_color_1: colors.accent1,
          accent_color_2: colors.accent2,
        }),
      ]);
      // Handle the case where brand was just created and mutations used stale brandId
      void brandId;
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      window.alert(
        t.brandSetup.saveFailed + " " + String(err instanceof Error ? err.message : err),
      );
    }
  }

  async function handleSaveResearch() {
    try {
      await ensureBrand();
      await saveResearchMutation.mutateAsync(research);
      setResearchSaved(true);
      window.setTimeout(() => setResearchSaved(false), 2500);
    } catch (err) {
      window.alert(
        t.brandSetup.saveFailed + " " + String(err instanceof Error ? err.message : err),
      );
    }
  }

  async function handleGeneratePersonas() {
    try {
      await ensureBrand();
      // Save research first
      if (research.trim()) {
        await saveResearchMutation.mutateAsync(research);
      }
      await generatePersonasMutation.mutateAsync();
    } catch (err) {
      window.alert(
        t.brandSetup.generationFailed + " " +
          String(err instanceof Error ? err.message : err),
      );
    }
  }

  async function handleOpenAddProfile() {
    try {
      await ensureBrand();
      setShowAddProfile(true);
    } catch (err) {
      setShowAddProfile(false);
      window.alert(String(err instanceof Error ? err.message : err));
    }
  }

  async function handleSavePersona(updated: Persona) {
    if (!selectedBrandId) return;
    try {
      await updatePersonaMutation.mutateAsync({
        personaId: updated.id,
        brandId: selectedBrandId,
        fields: {
          title: updated.title,
          pain: updated.pain ?? undefined,
          angle: updated.angle ?? undefined,
          emotion: updated.emotion ?? undefined,
        },
      });
    } catch (err) {
      window.alert(String(err instanceof Error ? err.message : err));
    } finally {
      setEditingPersona(null);
    }
  }

  async function handleDeletePersona(id: string) {
    if (!selectedBrandId) return;
    try {
      await deletePersonaMutation.mutateAsync({
        personaId: id,
        brandId: selectedBrandId,
      });
    } catch (err) {
      window.alert(String(err instanceof Error ? err.message : err));
    } finally {
      setDeletingPersona(null);
    }
  }

  function handleResetBrand() {
    setBrandName("");
    setBrandDescription("");
    setTypography("Inter");
    setFontSource("google");
    setColors(EMPTY_BRAND_COLORS);
    setResearch("");
    if (selectedBrandId) {
      resetBrandMutation.mutate();
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 font-display">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.brandSetup.title}
          </h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            {canEdit
              ? t.brandSetup.description
              : t.brandSetup.descriptionViewOnly}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetBrand}
              className="px-5 py-2.5 rounded-lg border border-border text-foreground-muted font-semibold text-sm hover:bg-background-subtle transition-colors"
            >
              {t.brandSetup.resetBrand}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveBrandKit()}
              disabled={saving}
              className={
                "px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm flex items-center gap-2 " +
                (saved
                  ? "bg-green-500 text-white"
                  : "bg-primary text-white hover:opacity-90")
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved ? t.brandSetup.savedBrandKit : t.brandSetup.saveBrandKit}
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/[0.06] px-4 py-3 text-warning">
          <Eye className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">
            {t.brandSetup.viewOnlyAdmin}
          </p>
        </div>
      )}

      {brandLoading && (
        <div className="flex items-center justify-center py-8 text-foreground-subtle gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t.brandSetup.loadingBrandData}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <section className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Palette className="h-4.5 w-4.5 text-primary" />
              </div>
              {t.brandSetup.visualIdentity}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  {t.brandSetup.brandName}
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder={t.brandSetup.brandNamePlaceholder}
                  readOnly={!canEdit}
                  className={
                    "w-full rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 text-sm outline-none " +
                    (canEdit
                      ? "focus:border-primary focus:ring-1 focus:ring-primary"
                      : "cursor-default")
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground-muted mb-2">
                  {t.brandSetup.brandDescription}
                </label>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  placeholder={t.brandSetup.brandDescriptionPlaceholder}
                  rows={4}
                  readOnly={!canEdit}
                  className={
                    "w-full rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 text-sm outline-none resize-none " +
                    (canEdit
                      ? "focus:border-primary focus:ring-1 focus:ring-primary"
                      : "cursor-default")
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground-muted mb-2">
                    {t.brandSetup.typography}
                  </label>
                  {canEdit ? (
                    <GoogleFontPicker
                      value={typography}
                      brandId={selectedBrandId}
                      fontSource={fontSource}
                      onSelect={(font, source) => {
                        setTypography(font);
                        setFontSource(source);
                      }}
                    />
                  ) : (
                    <div className="px-3 py-2.5 rounded-lg border border-border bg-background-subtle text-sm text-foreground">
                      {typography}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {COLOR_TIERS.map((tier) => {
                    // Template-literal concatenation can't be narrowed to the ColorKey union by TS; both suffixes are always valid for every tier.
                    const key1 = `${tier}1` as ColorKey;
                    const key2 = `${tier}2` as ColorKey;
                    return (
                      <div key={tier}>
                        <label className="block text-sm font-semibold text-foreground-muted mb-2">
                          {tierLabels[tier]}
                        </label>
                        <div className="flex gap-2">
                          <ColorSlot
                            value={colors[key1]}
                            canEdit={canEdit}
                            notSetLabel={t.brandSetup.colorNotSet}
                            addAriaLabel={t.brandSetup.addColorAria}
                            removeAriaLabel={t.brandSetup.removeColorAria}
                            onChange={(value) => updateColor(key1, value)}
                            onClear={() => clearColor(key1)}
                          />
                          <ColorSlot
                            value={colors[key2]}
                            canEdit={canEdit}
                            notSetLabel={t.brandSetup.colorNotSet}
                            addAriaLabel={t.brandSetup.addColorAria}
                            removeAriaLabel={t.brandSetup.removeColorAria}
                            onChange={(value) => updateColor(key2, value)}
                            onClear={() => clearColor(key2)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LogoUpload
                  label={t.brandSetup.logoLight}
                  dark={false}
                  brandId={selectedBrandId}
                  logoType="light"
                  initialUrl={logoLightUrl}
                  readOnly={!canEdit}
                  uploadLogoMutation={uploadLogoMutation}
                />
                <LogoUpload
                  label={t.brandSetup.logoDark}
                  dark
                  brandId={selectedBrandId}
                  logoType="dark"
                  initialUrl={logoDarkUrl}
                  readOnly={!canEdit}
                  uploadLogoMutation={uploadLogoMutation}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-24">
            <h3 className="text-sm font-bold text-foreground-muted uppercase tracking-wider mb-4">
              {t.brandSetup.liveBrandPreview}
            </h3>
            <div className="overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 backdrop-blur-sm">
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/15 to-violet-900/10">
                <div className="absolute inset-0 dot-pattern opacity-30" />
                <div className="absolute bottom-4 left-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-primary/30 bg-background-elevated/80 shadow-lg backdrop-blur-sm">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="rounded-lg bg-background/80 px-3 py-1 backdrop-blur">
                    <p className="text-xs font-bold text-foreground-subtle">
                      {t.brandSetup.brandAssetPreview}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <h2 className="text-3xl font-extrabold text-foreground mb-2">
                  {brandName || "Brand Name"}
                </h2>
                <p className="text-foreground-muted text-sm leading-relaxed mb-8">
                  {t.brandSetup.sampleTypography}
                </p>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest mb-3">
                      {t.brandSetup.colorSwatches}
                    </p>
                    {hasAnyConfiguredColor(colors) ? (
                      <div className="space-y-3">
                        {COLOR_TIERS.map((tier) => {
                          // Template-literal concatenation can't be narrowed to the ColorKey union by TS; both suffixes are always valid for every tier.
                          const key1 = `${tier}1` as ColorKey;
                          const key2 = `${tier}2` as ColorKey;
                          const presentColors = getConfiguredTierColors(colors, [key1, key2]);
                          if (presentColors.length === 0) return null;
                          return (
                            <div key={tier}>
                              <p className="text-[10px] font-mono uppercase text-foreground-subtle mb-1">
                                {tierLabels[tier]}
                              </p>
                              <div className="flex gap-2">
                                {presentColors.map(({ key, value }) => (
                                  <div
                                    key={key}
                                    className="flex-1 h-10 rounded-lg shadow-inner"
                                    style={{ backgroundColor: value }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-subtle italic">
                        {t.brandSetup.noColorsConfigured}
                      </p>
                    )}
                  </div>
                  <div className="pt-6 border-t border-border-subtle">
                    <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest mb-3">
                      {t.brandSetup.typographyExample}
                    </p>
                    <p className="text-2xl font-bold">Aa Bb Cc 123</p>
                    <p className="text-sm mt-1 text-foreground-muted">
                      {typography.split(" ")[0]} {t.brandSetup.fontFamily}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-3 items-start">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground-muted italic">
                {t.brandSetup.previewNote}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mt-8">
        <ProductsTab brandId={selectedBrandId} readOnly={!canEdit} />
      </div>

      {/* Brand Intelligence */}
      <div className="mt-12">
        <section className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-8 backdrop-blur-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                </div>
                {t.brandSetup.brandIntelligence}
              </h3>
              <p className="text-foreground-muted text-sm mt-1">
                {t.brandSetup.brandIntelligenceDesc}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => void handleSaveResearch()}
                  disabled={savingResearch}
                  className="px-4 py-2 rounded-lg bg-background-subtle border border-border text-foreground-muted font-semibold text-sm hover:bg-background-elevated transition-colors flex items-center gap-2"
                >
                  {savingResearch && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {researchSaved ? t.brandSetup.savedResearchSummary : t.brandSetup.saveResearchSummary}
                </button>
                <button
                  type="button"
                  onClick={() => void handleGeneratePersonas()}
                  disabled={generatingPersonas || !research.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {generatingPersonas && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {generatingPersonas
                    ? t.brandSetup.generating
                    : t.brandSetup.generateProfiles}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenAddProfile()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  {t.brandSetup.addProfile}
                </button>
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-bold text-foreground-muted">
                <AlignLeft className="h-4 w-4 text-primary" />
                {t.brandSetup.researchSummary}
                <span className="text-xs font-normal text-foreground-subtle">
                  {t.brandSetup.optional}
                </span>
              </label>
              <span className="text-[10px] text-foreground-subtle font-mono">
                {research.length} {t.brandSetup.chars}
              </span>
            </div>
            <div className="relative rounded-xl border border-border bg-background-elevated shadow-sm overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <div className="absolute inset-y-0 left-0 w-10 bg-background-subtle border-r border-border-subtle flex flex-col items-center pt-3 gap-[1.35rem] select-none pointer-events-none">
                {research.split("\n").map((_, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono text-foreground-subtle leading-none w-full text-center"
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <textarea
                value={research}
                onChange={(e) => setResearch(e.target.value)}
                spellCheck={false}
                readOnly={!canEdit}
                placeholder={researchPlaceholder}
                className={
                  "w-full min-h-[200px] bg-transparent border-none outline-none text-sm font-mono text-foreground-muted leading-[1.6] resize-none pl-12 pr-4 py-3" +
                  (!canEdit ? " cursor-default" : "")
                }
              />
            </div>
            <p className="text-[10px] text-foreground-subtle mt-2">
              {t.brandSetup.researchHint}
            </p>
          </div>

          <h4 className="text-sm font-bold text-foreground-subtle uppercase tracking-widest mb-6">
            {t.brandSetup.generatedPersonas}
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {personas.length === 0 ? (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center text-foreground-subtle">
                <Sparkles className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">{t.brandSetup.noProfilesYet}</p>
                <p className="text-xs mt-1">
                  {t.brandSetup.profilesHint}
                </p>
              </div>
            ) : (
              personas.map((persona, index) => (
                <div
                  key={persona.id}
                  className="rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-foreground-subtle uppercase tracking-wider">
                      {t.brandSetup.profileLabel} {index + 1}
                    </span>
                    <span className="text-[10px] text-foreground-subtle">
                      {t.brandSetup.source} {persona.source}
                    </span>
                  </div>
                  <h5 className="text-lg font-bold text-foreground mb-2">
                    {persona.title}
                  </h5>
                  <div className="space-y-1.5 text-sm mb-6">
                    {persona.pain && (
                      <p className="text-foreground-muted">
                        <span className="font-bold text-foreground">{t.brandSetup.pain}</span>{" "}
                        {persona.pain}
                      </p>
                    )}
                    {persona.angle && (
                      <p className="text-foreground-muted">
                        <span className="font-bold text-foreground">{t.brandSetup.angle}</span>{" "}
                        {persona.angle}
                      </p>
                    )}
                    {persona.emotion && (
                      <p className="text-foreground-muted">
                        <span className="font-bold text-foreground">
                          {t.brandSetup.emotion}
                        </span>{" "}
                        {persona.emotion}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPersona(persona)}
                        className="px-4 py-1.5 text-xs font-bold border border-border rounded-lg hover:bg-background-subtle transition-colors flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" /> {t.brandSetup.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPersona(persona)}
                        className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> {t.brandSetup.delete}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Apify Sync */}
      <ApifySyncSection brandId={selectedBrandId} />

      {showAddProfile && selectedBrandId && (
        <AddProfileModal
          brandId={selectedBrandId}
          onClose={() => setShowAddProfile(false)}
          onCreated={() => {
            void personasQuery.refetch();
            setShowAddProfile(false);
          }}
        />
      )}
      {editingPersona && (
        <EditProfileModal
          profile={{
            id: editingPersona.id,
            name: editingPersona.title,
            angle: editingPersona.angle ?? "",
            pain: editingPersona.pain ?? "",
            emotion: editingPersona.emotion ?? "",
          }}
          onClose={() => setEditingPersona(null)}
          onSave={(updated) =>
            void handleSavePersona({
              ...editingPersona,
              title: updated.name,
              pain: updated.pain,
              angle: updated.angle,
              emotion: updated.emotion,
            })
          }
        />
      )}
      {deletingPersona && (
        <DeleteConfirmModal
          profileName={deletingPersona.title}
          onClose={() => setDeletingPersona(null)}
          onConfirm={() => void handleDeletePersona(deletingPersona.id)}
        />
      )}
    </div>
  );
}

interface LogoUploadProps {
  label: string;
  dark: boolean;
  brandId: string | null;
  logoType: "light" | "dark";
  initialUrl?: string | null;
  readOnly?: boolean;
  uploadLogoMutation: ReturnType<typeof useUploadLogo>;
}

function LogoUpload({
  label,
  dark,
  brandId,
  logoType,
  initialUrl,
  readOnly,
  uploadLogoMutation,
}: LogoUploadProps) {
  const { t } = useT();
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show the saved logo URL when brand data loads
  useEffect(() => {
    setPreview(initialUrl ?? null);
  }, [initialUrl]);

  const uploading = uploadLogoMutation.isPending;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Only revoke blob URLs -- never revoke storage https URLs
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));

    if (!brandId) return;
    try {
      const result = await uploadLogoMutation.mutateAsync({ file, logoType });
      const savedUrl =
        logoType === "light"
          ? result.logoUrls?.lightUrl
          : result.logoUrls?.darkUrl;
      if (savedUrl) {
        if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
        setPreview(savedUrl);
      }
    } catch {
      // Upload failed; keep the blob preview so the user sees their selection
    }
  }

  function handleRemove() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="block text-sm font-semibold text-foreground-muted mb-3">{label}</p>
      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          accept="image/svg+xml,image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => void handleFileChange(e)}
        />
      )}
      {preview ? (
        <div
          className={
            "border-2 rounded-xl p-4 relative flex items-center justify-center min-h-[96px] " +
            (dark
              ? "bg-primary border-border-strong"
              : "bg-background-elevated border-border")
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Logo preview"
            className="max-h-20 max-w-full object-contain"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-background-elevated text-foreground-muted border border-border shadow-sm"
              aria-label={t.nav.removeLogo}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : readOnly ? (
        <div
          className={
            "border-2 rounded-xl p-6 flex items-center justify-center min-h-[96px] " +
            (dark
              ? "bg-foreground/10 border-border"
              : "bg-background-subtle/50 border-border")
          }
        >
          <span className="text-xs text-foreground-subtle">{t.brandSetup.noLogoUploaded}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={
            "w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-foreground-subtle hover:border-primary/50 hover:text-primary/60 transition-colors " +
            (dark
              ? "bg-foreground/10 border-border-strong"
              : "bg-background-subtle/50 border-border")
          }
        >
          <UploadCloud className="h-7 w-7 mb-2" />
          <span className="text-xs">{t.brandSetup.logoFormatHint}</span>
        </button>
      )}
    </div>
  );
}

interface ColorSlotProps {
  value: string | null;
  canEdit: boolean;
  notSetLabel: string;
  addAriaLabel: string;
  removeAriaLabel: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

function ColorSlot({
  value,
  canEdit,
  notSetLabel,
  addAriaLabel,
  removeAriaLabel,
  onChange,
  onClear,
}: ColorSlotProps) {
  if (value === null && !canEdit) {
    return (
      <div className="flex-1 flex items-center gap-1.5 p-2 border border-dashed border-border rounded-lg bg-background-subtle/50 text-foreground-subtle">
        <div className="w-6 h-6 rounded shrink-0 border border-dashed border-border-strong" />
        <span className="text-[10px] uppercase truncate">{notSetLabel}</span>
      </div>
    );
  }

  if (value === null) {
    return (
      <label
        className="flex-1 flex items-center gap-1.5 p-2 border border-dashed border-border rounded-lg bg-background-subtle/50 text-foreground-subtle cursor-pointer hover:border-primary/50 hover:text-primary/60 transition-colors"
        aria-label={addAriaLabel}
      >
        <div className="w-6 h-6 rounded shrink-0 border border-dashed border-border-strong flex items-center justify-center">
          <Plus className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase truncate">{notSetLabel}</span>
        <input
          type="color"
          value={COLOR_PICKER_SEED}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1.5 p-2 border border-border rounded-lg bg-background-subtle">
      <label className={canEdit ? "cursor-pointer" : "cursor-default"}>
        <div className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: value }} />
        {canEdit && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        )}
      </label>
      <span className="text-[10px] font-mono uppercase text-foreground-muted truncate">
        {value}
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={onClear}
          aria-label={removeAriaLabel}
          className="ml-auto shrink-0 text-foreground-subtle hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

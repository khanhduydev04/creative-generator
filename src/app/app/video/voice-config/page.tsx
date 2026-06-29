// Client Component: Voice Lab uses state for filters, test params, and preview audio
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApp } from "@/features/app/context";
import { useT } from "@/lib/i18n/useTranslation";
import {
  useVbeeVoices,
  useVoiceRatings,
  useSubmitVoiceRating,
  useCreateVoicePreset,
} from "@/hooks/api/useVoicePresets";
import { VoiceRatingStars } from "@/features/video/components/VoiceRatingStars";
import { apiFetch } from "@/lib/api";
import type { VbeeVoice } from "@/features/video/types";

const SAMPLE_TEXT =
  "Sản phẩm này đã thay đổi hoàn toàn cách tôi chăm sóc da. Chỉ sau 2 tuần, làn da trở nên mịn màng và sáng khỏe hơn rõ rệt. Bạn có muốn thử không?";

const PRESET_SAVED_FEEDBACK_MS = 2_000;
const PREVIEW_TEXT_MAX_LENGTH = 500;
const SPEED_MIN = 0.5;
const SPEED_MAX = 2.0;
const SPEED_STEP = 0.1;
const PITCH_MIN = 0.5;
const PITCH_MAX = 2.0;
const PITCH_STEP = 0.1;

type Gender = "all" | "male" | "female";
type Region = "all" | "north" | "central" | "south";
type SortBy = "viral" | "name";

export default function VoiceConfigPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();

  const [gender, setGender] = useState<Gender>("all");
  const [region, setRegion] = useState<Region>("all");
  const [sortBy, setSortBy] = useState<SortBy>("viral");

  const [selectedVoice, setSelectedVoice] = useState<VbeeVoice | null>(null);
  const [testText, setTestText] = useState(SAMPLE_TEXT);
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetSaved, setPresetSaved] = useState(false);

  const { data: voices = [], isLoading: loadingVoices } = useVbeeVoices();
  const { data: ratings = [] } = useVoiceRatings(selectedBrandId);
  const submitRating = useSubmitVoiceRating();
  const createPreset = useCreateVoicePreset();

  const ratingMap = new Map(ratings.map((r) => [r.vbee_voice_code, r.avg_score]));

  const filtered = voices
    .filter((v) => gender === "all" || v.gender === gender)
    .filter((v) => region === "all" || v.region === region)
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      const aScore = ratingMap.get(a.voice_code) ?? 0;
      const bScore = ratingMap.get(b.voice_code) ?? 0;
      return bScore - aScore;
    });

  async function handlePreview() {
    if (!selectedVoice || !testText.trim()) return;
    setGeneratingPreview(true);
    setPreviewUrl(null);
    setPreviewError(null);
    try {
      const res = await apiFetch<{ audioUrl: string }>("/api/video/vbee/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice_code: selectedVoice.voice_code, text: testText, speed, pitch }),
      });
      setPreviewUrl(res.audioUrl);
    } catch {
      setPreviewError(t.video.audioFailed);
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function handleSaveRating() {
    if (!selectedBrandId || !selectedVoice || rating === 0) return;
    await submitRating.mutateAsync({
      brandId: selectedBrandId,
      voiceCode: selectedVoice.voice_code,
      score: rating,
      note: ratingNote || undefined,
    });
    setRating(0);
    setRatingNote("");
  }

  async function handleSavePreset() {
    if (!selectedBrandId || !selectedVoice || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      await createPreset.mutateAsync({
        brandId: selectedBrandId,
        displayName: presetName.trim(),
        voiceCode: selectedVoice.voice_code,
        speed,
        pitch,
      });
      setPresetSaved(true);
      setPresetName("");
      setTimeout(() => setPresetSaved(false), PRESET_SAVED_FEEDBACK_MS);
    } finally {
      setSavingPreset(false);
    }
  }

  function getGenderLabel(g: Gender): string {
    if (g === "all") return t.video.filterGenderAll;
    if (g === "female") return t.video.filterGenderFemale;
    return t.video.filterGenderMale;
  }

  function getRegionLabel(r: Region): string {
    if (r === "all") return t.video.filterRegionAll;
    if (r === "north") return t.video.filterRegionNorth;
    if (r === "central") return t.video.filterRegionCentral;
    return t.video.filterRegionSouth;
  }

  return (
    <DashboardLayout activePath="/app/video/voice-config">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t.video.voiceLabTitle}</h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Voice Browser */}
          <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">{t.video.voiceBrowserTitle}</h2>

            <div className="mb-4 flex flex-wrap gap-2">
              {(["all", "female", "male"] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    gender === g ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-white/[0.04]"
                  }`}
                >
                  {getGenderLabel(g)}
                </button>
              ))}
              <span className="w-px bg-border/30" />
              {(["all", "north", "central", "south"] as Region[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    region === r ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-white/[0.04]"
                  }`}
                >
                  {getRegionLabel(r)}
                </button>
              ))}
              {/* Safe: select options are rendered exclusively from SortBy literals */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="ml-auto rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground-muted focus:outline-none"
              >
                <option value="viral">{t.video.sortByViralScore}</option>
                <option value="name">{t.video.sortByName}</option>
              </select>
            </div>

            {loadingVoices ? (
              <p className="text-sm text-foreground-muted">{t.video.loadingVoices}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-foreground-muted">{t.video.noVoicesFound}</p>
            ) : (
              <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                {filtered.map((voice) => {
                  const avgScore = ratingMap.get(voice.voice_code) ?? 0;
                  const isSelected = selectedVoice?.voice_code === voice.voice_code;
                  return (
                    <div
                      key={voice.voice_code}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{voice.name}</p>
                        {avgScore > 0 && (
                          <VoiceRatingStars value={Math.round(avgScore)} onChange={() => undefined} readonly size="sm" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVoice(voice);
                          setPreviewUrl(null);
                        }}
                        className="shrink-0 rounded-lg border border-border/40 px-2.5 py-1 text-xs text-foreground-muted hover:bg-white/[0.04]"
                      >
                        {t.video.quickTest}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Voice Lab panel */}
          <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">{t.video.voiceLabPanelTitle}</h2>

            {!selectedVoice ? (
              <p className="text-sm text-foreground-muted">Chọn giọng từ danh sách bên trái để thử.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-foreground-muted">{t.video.testText}</p>
                  <textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder={t.video.testTextPlaceholder}
                    rows={4}
                    maxLength={PREVIEW_TEXT_MAX_LENGTH}
                    className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">
                      {t.video.speed}: {speed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min={SPEED_MIN}
                      max={SPEED_MAX}
                      step={SPEED_STEP}
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">
                      {t.video.pitch}: {pitch.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min={PITCH_MIN}
                      max={PITCH_MAX}
                      step={PITCH_STEP}
                      value={pitch}
                      onChange={(e) => setPitch(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={generatingPreview || !testText.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
                >
                  {generatingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                  {generatingPreview ? t.video.generatingPreview : t.video.generatePreview}
                </button>

                {previewError && <p className="text-xs text-danger">{previewError}</p>}

                {previewUrl && (
                  <div className="rounded-xl border border-border/30 bg-background p-3">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio src={previewUrl} controls className="w-full" />
                  </div>
                )}

                <div className="border-t border-border/20 pt-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">{t.video.rateVoice}</p>
                  <VoiceRatingStars value={rating} onChange={setRating} />
                  <textarea
                    value={ratingNote}
                    onChange={(e) => setRatingNote(e.target.value)}
                    placeholder={t.video.notePlaceholder}
                    rows={2}
                    className="mt-2 w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveRating()}
                    disabled={rating === 0 || submitRating.isPending || !selectedBrandId}
                    className="mt-2 rounded-lg bg-background-elevated px-3 py-1.5 text-sm text-foreground-muted hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    Lưu đánh giá
                  </button>
                </div>

                <div className="border-t border-border/20 pt-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">{t.video.presetDisplayName}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder={t.video.presetDisplayNamePlaceholder}
                      className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSavePreset()}
                      disabled={savingPreset || !presetName.trim() || !selectedBrandId}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
                    >
                      {savingPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : presetSaved ? t.video.presetSaved : t.video.savePreset}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

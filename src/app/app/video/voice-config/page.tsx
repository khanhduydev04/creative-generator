// Client Component: Voice Lab uses state for filters, test params, preview audio, and tab selection
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
  useElevenLabsVoices,
  useElevenLabsPreview,
} from "@/hooks/api/useVoicePresets";
import { VoiceRatingStars } from "@/features/video/components/VoiceRatingStars";
import { MiniMaxVoicePanel } from "@/features/video/components/MiniMaxVoicePanel";
import { apiFetch } from "@/lib/api";
import type { VbeeVoice, ElevenLabsVoice } from "@/features/video/types";
import type { ElevenLabsModel } from "@/services/scriptPrompt";

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
// Vbee has no stability concept in its own API; this matches the server-side
// default used in the voice-presets create route (Task 2) for non-ElevenLabs presets.
const VBEE_DEFAULT_STABILITY = 0.5;

const EL_STABILITY_MIN = 0;
const EL_STABILITY_MAX = 1;
const EL_STABILITY_STEP = 0.05;
const EL_SPEED_MIN = 0.7;
const EL_SPEED_MAX = 1.2;
const EL_SPEED_STEP = 0.05;

const EL_V3_STABILITY_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: "Creative" },
  { value: 0.5, label: "Natural" },
  { value: 1, label: "Robust" },
];

const ELEVENLABS_MODELS: { value: ElevenLabsModel; label: string }[] = [
  { value: "eleven_flash_v2_5", label: "v2.5 Flash (nhanh, ổn định)" },
  { value: "eleven_v3", label: "v3 (Expression tags, tự nhiên nhất)" },
];

type Gender = "all" | "male" | "female";
type Region = "all" | "north" | "central" | "south";
type SortBy = "viral" | "name";
type ActiveTab = "vbee" | "elevenlabs" | "minimax";

export default function VoiceConfigPage() {
  const { t } = useT();
  const { selectedBrandId } = useApp();

  const [activeTab, setActiveTab] = useState<ActiveTab>("vbee");

  // Vbee tab state
  const [gender, setGender] = useState<Gender>("all");
  const [region, setRegion] = useState<Region>("all");
  const [sortBy, setSortBy] = useState<SortBy>("viral");
  const [selectedVoice, setSelectedVoice] = useState<VbeeVoice | null>(null);

  // ElevenLabs tab state
  const [elVoiceId, setElVoiceId] = useState<string>("");
  const [elVoiceName, setElVoiceName] = useState<string>("");
  const [elModel, setElModel] = useState<ElevenLabsModel>("eleven_flash_v2_5");
  const [elPreviewUrl, setElPreviewUrl] = useState<string | null>(null);
  const [elStability, setElStability] = useState(0.5);
  const [elSpeed, setElSpeed] = useState(1.0);
  const [elGeneratedPreviewUrl, setElGeneratedPreviewUrl] = useState<string | null>(null);
  const [generatingElPreview, setGeneratingElPreview] = useState(false);
  const [elPreviewError, setElPreviewError] = useState<string | null>(null);

  // Shared state
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
  const { data: elVoices = [], isLoading: loadingElVoices } = useElevenLabsVoices(activeTab === "elevenlabs");
  const { data: ratings = [] } = useVoiceRatings(selectedBrandId);
  const submitRating = useSubmitVoiceRating();
  const createPreset = useCreateVoicePreset();
  const generateElPreview = useElevenLabsPreview();

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
        stability: VBEE_DEFAULT_STABILITY,
      });
      setPresetSaved(true);
      setPresetName("");
      setTimeout(() => setPresetSaved(false), PRESET_SAVED_FEEDBACK_MS);
    } finally {
      setSavingPreset(false);
    }
  }

  async function handleGenerateElPreview() {
    if (!elVoiceId || !testText.trim()) return;
    setGeneratingElPreview(true);
    setElGeneratedPreviewUrl(null);
    setElPreviewError(null);
    try {
      const res = await generateElPreview.mutateAsync({
        voiceId: elVoiceId,
        text: testText,
        modelId: elModel,
        stability: elStability,
        speed: elModel === "eleven_v3" ? undefined : elSpeed,
      });
      setElGeneratedPreviewUrl(res.audioUrl);
    } catch {
      setElPreviewError(t.video.audioFailed);
    } finally {
      setGeneratingElPreview(false);
    }
  }

  async function handleSaveElPreset() {
    if (!selectedBrandId || !elVoiceId || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      await createPreset.mutateAsync({
        brandId: selectedBrandId,
        displayName: presetName.trim(),
        voiceCode: "",
        speed: elModel === "eleven_v3" ? 1.0 : elSpeed,
        pitch: 1.0,
        stability: elStability,
        provider: "elevenlabs",
        providerVoiceId: elVoiceId,
        elevenLabsModel: elModel,
      });
      setPresetSaved(true);
      setPresetName("");
      setTimeout(() => setPresetSaved(false), PRESET_SAVED_FEEDBACK_MS);
    } finally {
      setSavingPreset(false);
    }
  }

  function handleSelectElVoice(voice: ElevenLabsVoice) {
    setElVoiceId(voice.voice_id);
    setElVoiceName(voice.name);
    setElPreviewUrl(voice.preview_url);
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

        {/* Provider tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border/30 bg-background-subtle p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("vbee")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "vbee"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Vbee
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("elevenlabs")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "elevenlabs"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            ElevenLabs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("minimax")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "minimax"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            MiniMax
          </button>
        </div>

        {activeTab === "vbee" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Vbee Voice Browser */}
            <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
              <h2 className="mb-4 text-base font-semibold text-foreground">{t.video.voiceBrowserTitle}</h2>

              <div className="mb-4 flex flex-wrap gap-2">
                {(["all", "female", "male"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      gender === g ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-black/[0.04]"
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
                      region === r ? "bg-primary/10 text-primary" : "text-foreground-muted hover:bg-black/[0.04]"
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
                          isSelected ? "bg-primary/10" : "hover:bg-black/[0.04]"
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
                          className="shrink-0 rounded-lg border border-border/40 px-2.5 py-1 text-xs text-foreground-muted hover:bg-black/[0.04]"
                        >
                          {t.video.quickTest}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Vbee Voice Lab panel */}
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
                      className="mt-2 rounded-lg bg-background-elevated px-3 py-1.5 text-sm text-foreground-muted hover:bg-black/[0.06] disabled:opacity-50"
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
        ) : activeTab === "elevenlabs" ? (
          /* ElevenLabs tab */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: ElevenLabs Voice Picker */}
            <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
              <h2 className="mb-4 text-base font-semibold text-foreground">Chọn giọng ElevenLabs</h2>

              {loadingElVoices ? (
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải danh sách giọng...
                </div>
              ) : elVoices.length === 0 ? (
                <p className="text-sm text-foreground-muted">Không tìm thấy giọng nào.</p>
              ) : (
                <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                  {elVoices.map((voice) => {
                    const isSelected = elVoiceId === voice.voice_id;
                    return (
                      <div
                        key={voice.voice_id}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-black/[0.04]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{voice.name}</p>
                          <p className="text-xs text-foreground-muted capitalize">{voice.category}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {voice.preview_url && (
                            <button
                              type="button"
                              onClick={() => setElPreviewUrl(voice.preview_url)}
                              className="rounded-lg border border-border/40 px-2.5 py-1 text-xs text-foreground-muted hover:bg-black/[0.04]"
                            >
                              Nghe thử
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectElVoice(voice)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "border border-border/40 text-foreground-muted hover:bg-black/[0.04]"
                            }`}
                          >
                            {isSelected ? "Đã chọn" : "Chọn"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: ElevenLabs Config + Save */}
            <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
              <h2 className="mb-4 text-base font-semibold text-foreground">Cấu hình ElevenLabs</h2>

              {!elVoiceId ? (
                <p className="text-sm text-foreground-muted">Chọn giọng từ danh sách bên trái để tiếp tục.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/30 bg-background px-4 py-3">
                    <p className="text-xs text-foreground-muted">Giọng đã chọn</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">{elVoiceName}</p>
                  </div>

                  {elPreviewUrl && (
                    <div className="rounded-xl border border-border/30 bg-background p-3">
                      <p className="mb-2 text-xs font-medium text-foreground-muted">Preview giọng</p>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio src={elPreviewUrl} controls className="w-full" />
                    </div>
                  )}

                  {/* Model selector */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-foreground-muted">Model</p>
                    <div className="flex flex-col gap-2">
                      {ELEVENLABS_MODELS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setElModel(m.value)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                            elModel === m.value
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border/40 bg-background text-foreground-muted hover:bg-black/[0.04]"
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                              elModel === m.value ? "border-primary bg-primary" : "border-border"
                            }`}
                          />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stability + Speed */}
                  {elModel === "eleven_v3" ? (
                    <div>
                      <p className="mb-2 text-xs font-medium text-foreground-muted">Stability</p>
                      <div className="flex gap-2">
                        {EL_V3_STABILITY_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setElStability(preset.value)}
                            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                              elStability === preset.value
                                ? "border-primary/50 bg-primary/10 text-foreground"
                                : "border-border/40 bg-background text-foreground-muted hover:bg-black/[0.04]"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground-muted">
                          Stability: {elStability.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min={EL_STABILITY_MIN}
                          max={EL_STABILITY_MAX}
                          step={EL_STABILITY_STEP}
                          value={elStability}
                          onChange={(e) => setElStability(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground-muted">
                          Speed: {elSpeed.toFixed(2)}x
                        </label>
                        <input
                          type="range"
                          min={EL_SPEED_MIN}
                          max={EL_SPEED_MAX}
                          step={EL_SPEED_STEP}
                          value={elSpeed}
                          onChange={(e) => setElSpeed(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview with custom text */}
                  <div className="border-t border-border/20 pt-4">
                    <p className="mb-1 text-xs font-medium text-foreground-muted">{t.video.testText}</p>
                    <textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder={t.video.testTextPlaceholder}
                      rows={3}
                      maxLength={PREVIEW_TEXT_MAX_LENGTH}
                      className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => void handleGenerateElPreview()}
                      disabled={generatingElPreview || !testText.trim()}
                      className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
                    >
                      {generatingElPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                      {generatingElPreview ? t.video.generatingPreview : t.video.generatePreview}
                    </button>
                    <p className="mt-1.5 text-xs text-foreground-subtle">{t.video.elevenLabsPreviewCreditNote}</p>

                    {elPreviewError && <p className="mt-2 text-xs text-danger">{elPreviewError}</p>}

                    {elGeneratedPreviewUrl && (
                      <div className="mt-2 rounded-xl border border-border/30 bg-background p-3">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio src={elGeneratedPreviewUrl} controls className="w-full" />
                      </div>
                    )}
                  </div>

                  {/* Preset name + save */}
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
                        onClick={() => void handleSaveElPreset()}
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
        ) : (
          <MiniMaxVoicePanel brandId={selectedBrandId} />
        )}
      </div>
    </DashboardLayout>
  );
}

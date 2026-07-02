// Client Component: MiniMax voice panel manages selection, config sliders, preview audio, clone upload
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  useMiniMaxVoices,
  useMiniMaxPreview,
  useCloneMiniMaxVoice,
  useCreateVoicePreset,
} from "@/hooks/api/useVoicePresets";
import type { MiniMaxModel, MiniMaxEmotion, MiniMaxSoundEffect } from "@/services/scriptPrompt";
import type { MiniMaxProviderConfig } from "@/features/video/types";
import {
  MINIMAX_MODEL_OPTIONS,
  MINIMAX_EMOTION_OPTIONS,
  MINIMAX_LANGUAGE_OPTIONS,
  MINIMAX_SOUND_EFFECT_OPTIONS,
  MINIMAX_BITRATE_OPTIONS,
  MINIMAX_SAMPLE_RATE_OPTIONS,
  MINIMAX_SPEED_MIN,
  MINIMAX_SPEED_MAX,
  MINIMAX_SPEED_STEP,
  MINIMAX_VOL_MIN,
  MINIMAX_VOL_MAX,
  MINIMAX_VOL_STEP,
  MINIMAX_PITCH_MIN,
  MINIMAX_PITCH_MAX,
  MINIMAX_PITCH_STEP,
  MINIMAX_PREVIEW_TEXT_MAX_LENGTH,
} from "@/features/video/minimaxOptions";

const SAMPLE_TEXT =
  "Sản phẩm này đã thay đổi hoàn toàn cách tôi chăm sóc da. Chỉ sau 2 tuần, làn da trở nên mịn màng và sáng khỏe hơn rõ rệt.";
const PRESET_SAVED_FEEDBACK_MS = 2_000;
const DEFAULT_AUDIO: MiniMaxProviderConfig["audio"] = {
  format: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channel: 1,
};

export interface MiniMaxVoicePanelProps {
  brandId: string | null;
}

export function MiniMaxVoicePanel({ brandId }: MiniMaxVoicePanelProps) {
  const { data: voices = [], isLoading } = useMiniMaxVoices(brandId, true);
  const preview = useMiniMaxPreview();
  const cloneVoice = useCloneMiniMaxVoice();
  const createPreset = useCreateVoicePreset();

  const [voiceId, setVoiceId] = useState("");
  const [model, setModel] = useState<MiniMaxModel>("speech-2.6-hd");
  const [emotion, setEmotion] = useState<MiniMaxEmotion | "">("");
  const [languageBoost, setLanguageBoost] = useState("Vietnamese");
  const [speed, setSpeed] = useState(1.0);
  const [vol, setVol] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [bitrate, setBitrate] = useState(128000);
  const [sampleRate, setSampleRate] = useState(32000);

  const [timbre, setTimbre] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [soundEffect, setSoundEffect] = useState("");
  const [pronunciation, setPronunciation] = useState("");

  const [testText, setTestText] = useState(SAMPLE_TEXT);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetSaved, setPresetSaved] = useState(false);

  const [cloneName, setCloneName] = useState("");
  const [cloneVoiceId, setCloneVoiceId] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  function buildConfig(): MiniMaxProviderConfig {
    const pronDict = pronunciation
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.includes("/"));
    const voiceModify =
      timbre !== 0 || intensity !== 0 || soundEffect
        ? {
            ...(timbre !== 0 ? { timbre } : {}),
            ...(intensity !== 0 ? { intensity } : {}),
            // Safe: soundEffect value comes from MINIMAX_SOUND_EFFECT_OPTIONS
            ...(soundEffect ? { soundEffects: soundEffect as MiniMaxSoundEffect } : {}),
          }
        : undefined;
    return {
      kind: "minimax",
      model,
      ...(emotion ? { emotion } : {}),
      vol,
      pitch,
      languageBoost,
      audio: { ...DEFAULT_AUDIO, bitrate, sampleRate },
      ...(voiceModify ? { voiceModify } : {}),
      ...(pronDict.length ? { pronunciationDict: pronDict } : {}),
    };
  }

  async function handlePreview() {
    if (!voiceId || !testText.trim()) return;
    setPreviewUrl(null);
    setPreviewError(null);
    try {
      const res = await preview.mutateAsync({
        voiceId,
        text: testText,
        model,
        speed,
        vol,
        pitch,
        emotion: emotion || undefined,
        languageBoost,
      });
      setPreviewUrl(res.audioUrl);
    } catch {
      setPreviewError("Không tạo được preview. Kiểm tra key MiniMax hoặc thử lại.");
    }
  }

  async function handleSavePreset() {
    if (!brandId || !voiceId || !presetName.trim()) return;
    await createPreset.mutateAsync({
      brandId,
      displayName: presetName.trim(),
      voiceCode: "",
      speed,
      pitch: 1.0,
      stability: 0.5,
      provider: "minimax",
      providerVoiceId: voiceId,
      providerConfig: buildConfig(),
    });
    setPresetSaved(true);
    setPresetName("");
    setTimeout(() => setPresetSaved(false), PRESET_SAVED_FEEDBACK_MS);
  }

  async function handleClone() {
    if (!brandId || !cloneFile || !cloneName.trim() || !cloneVoiceId.trim()) return;
    setCloneError(null);
    try {
      await cloneVoice.mutateAsync({
        brandId,
        displayName: cloneName.trim(),
        voiceId: cloneVoiceId.trim(),
        model,
        file: cloneFile,
      });
      setCloneName("");
      setCloneVoiceId("");
      setCloneFile(null);
    } catch {
      setCloneError("Clone thất bại. Kiểm tra file (10s–5 phút, ≤20MB) và voice_id (≥8 ký tự, bắt đầu bằng chữ).");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: voice picker + clone */}
      <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Chọn giọng MiniMax</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách giọng...
          </div>
        ) : (
          <div className="max-h-[40vh] space-y-1 overflow-y-auto">
            {voices.map((v) => (
              <button
                key={v.voice_id}
                type="button"
                onClick={() => setVoiceId(v.voice_id)}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors ${
                  voiceId === v.voice_id ? "bg-primary/10" : "hover:bg-black/[0.04]"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{v.name}</span>
                <span className="text-xs capitalize text-foreground-muted">{v.category}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-border/20 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Clone giọng riêng</h3>
          <p className="mb-2 text-xs text-foreground-subtle">Audio 10s–5 phút, ≤20MB (mp3/m4a/wav).</p>
          <input
            type="text"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="Tên hiển thị"
            className="mb-2 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={cloneVoiceId}
            onChange={(e) => setCloneVoiceId(e.target.value)}
            placeholder="voice_id (vd: brandvoice01)"
            className="mb-2 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav"
            onChange={(e) => setCloneFile(e.target.files?.[0] ?? null)}
            className="mb-2 w-full text-xs text-foreground-muted"
          />
          <button
            type="button"
            onClick={() => void handleClone()}
            disabled={cloneVoice.isPending || !cloneFile || !cloneName.trim() || !cloneVoiceId.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {cloneVoice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clone giọng"}
          </button>
          {cloneError && <p className="mt-2 text-xs text-danger">{cloneError}</p>}
        </div>
      </div>

      {/* Right: config + preview + save */}
      <div className="rounded-2xl border border-border-strong/20 bg-background-subtle p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">Cấu hình MiniMax</h2>
        {!voiceId ? (
          <p className="text-sm text-foreground-muted">Chọn giọng từ danh sách bên trái để tiếp tục.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">Model</label>
              <select
                value={model}
                // Safe: value comes from MINIMAX_MODEL_OPTIONS, always a valid MiniMaxModel
                onChange={(e) => setModel(e.target.value as MiniMaxModel)}
                className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                {MINIMAX_MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Cảm xúc</label>
                <select
                  value={emotion}
                  // Safe: value is "" (default option) or from MINIMAX_EMOTION_OPTIONS, always a valid MiniMaxEmotion | ""
                  onChange={(e) => setEmotion(e.target.value as MiniMaxEmotion | "")}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                  <option value="">(mặc định)</option>
                  {MINIMAX_EMOTION_OPTIONS.map((em) => (
                    <option key={em.value} value={em.value}>{em.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Ngôn ngữ</label>
                <select
                  value={languageBoost}
                  onChange={(e) => setLanguageBoost(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                  {MINIMAX_LANGUAGE_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Tốc độ: {speed.toFixed(1)}x</label>
                <input type="range" min={MINIMAX_SPEED_MIN} max={MINIMAX_SPEED_MAX} step={MINIMAX_SPEED_STEP}
                  value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Âm lượng: {vol.toFixed(1)}</label>
                <input type="range" min={MINIMAX_VOL_MIN} max={MINIMAX_VOL_MAX} step={MINIMAX_VOL_STEP}
                  value={vol} onChange={(e) => setVol(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Cao độ: {pitch}</label>
                <input type="range" min={MINIMAX_PITCH_MIN} max={MINIMAX_PITCH_MAX} step={MINIMAX_PITCH_STEP}
                  value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Bitrate</label>
                <select value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                  {MINIMAX_BITRATE_OPTIONS.map((b) => <option key={b} value={b}>{b / 1000} kbps</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-muted">Sample rate</label>
                <select value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                  {MINIMAX_SAMPLE_RATE_OPTIONS.map((s) => <option key={s} value={s}>{s} Hz</option>)}
                </select>
              </div>
            </div>

            <details className="rounded-xl border border-border/30 bg-background p-3">
              <summary className="cursor-pointer text-xs font-medium text-foreground-muted">Nâng cao (voice_modify, phát âm)</summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">Timbre: {timbre}</label>
                    <input type="range" min={-100} max={100} step={1} value={timbre}
                      onChange={(e) => setTimbre(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground-muted">Cường độ: {intensity}</label>
                    <input type="range" min={-100} max={100} step={1} value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-muted">Hiệu ứng âm thanh</label>
                  <select value={soundEffect} onChange={(e) => setSoundEffect(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                    <option value="">(không)</option>
                    {MINIMAX_SOUND_EFFECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-muted">Từ điển phát âm (mỗi dòng: từ/cách đọc)</label>
                  <textarea value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} rows={2}
                    placeholder="Ladospice/La đô spai"
                    className="w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none" />
                </div>
                <p className="text-[11px] text-foreground-subtle">Mẹo: chèn khoảng nghỉ trong kịch bản bằng cú pháp &lt;#0.5#&gt; (0.5 giây).</p>
              </div>
            </details>

            <div className="border-t border-border/20 pt-4">
              <label className="mb-1 block text-xs font-medium text-foreground-muted">Văn bản thử</label>
              <textarea value={testText} onChange={(e) => setTestText(e.target.value)} rows={3}
                maxLength={MINIMAX_PREVIEW_TEXT_MAX_LENGTH}
                className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button type="button" onClick={() => void handlePreview()}
                disabled={preview.isPending || !testText.trim()}
                className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50">
                {preview.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {preview.isPending ? "Đang tạo..." : "Tạo preview"}
              </button>
              {previewError && <p className="mt-2 text-xs text-danger">{previewError}</p>}
              {previewUrl && (
                <div className="mt-2 rounded-xl border border-border/30 bg-background p-3">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={previewUrl} controls className="w-full" />
                </div>
              )}
            </div>

            <div className="border-t border-border/20 pt-4">
              <label className="mb-2 block text-xs font-medium text-foreground-muted">Tên preset</label>
              <div className="flex gap-2">
                <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)}
                  placeholder="VD: MiniMax nữ miền Nam"
                  className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
                <button type="button" onClick={() => void handleSavePreset()}
                  disabled={createPreset.isPending || !presetName.trim() || !brandId}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50">
                  {createPreset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : presetSaved ? "Đã lưu" : "Lưu preset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Client Component: Stage 5 voice generation — preset selector and audio list for a script
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { useVoicePresets } from "@/hooks/api/useVoicePresets";
import { useGeneratedAudiosByScript, useGenerateAudio, useDeleteAudio } from "@/hooks/api/useGeneratedAudios";
import { AudioPlayer } from "@/features/video/components/AudioPlayer";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface VoiceGenerationPanelProps {
  scriptId: string | null;
  brandId: string;
}

export function VoiceGenerationPanel({ scriptId, brandId }: VoiceGenerationPanelProps) {
  const { t } = useT();
  const { data: presets = [] } = useVoicePresets(brandId);
  const { data: audios = [] } = useGeneratedAudiosByScript(scriptId);
  const generateAudio = useGenerateAudio();
  const deleteAudio = useDeleteAudio();
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from("generated-audio").getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function handleGenerate() {
    if (!scriptId || !selectedPresetId) return;
    await generateAudio.mutateAsync({ scriptId, voicePresetId: selectedPresetId, brandId });
  }

  async function handleDelete(audioId: string) {
    if (!scriptId) return;
    setDeletingId(audioId);
    try {
      await deleteAudio.mutateAsync({ audioId, scriptId, brandId });
    } finally {
      setDeletingId(null);
    }
  }

  if (!scriptId) {
    return (
      <p className="text-sm text-foreground-muted">{t.video.noScriptSaved}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">{presets.length === 0 ? t.video.noVoicePreset : t.video.selectVoicePreset}</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!selectedPresetId || generateAudio.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
        >
          {generateAudio.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {generateAudio.isPending ? t.video.generatingAudio : t.video.generateAudio}
        </button>
      </div>

      {audios.length > 0 && (
        <div className="space-y-2">
          {audios.map((audio) => (
            <AudioPlayer
              key={audio.id}
              audio={audio}
              publicUrl={audio.storage_path ? getPublicUrl(audio.storage_path) : (audio.vbee_audio_url ?? "")}
              onDelete={() => void handleDelete(audio.id)}
              isDeleting={deletingId === audio.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

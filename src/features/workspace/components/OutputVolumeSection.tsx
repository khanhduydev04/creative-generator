"use client";
// Client Component: output configuration (aspect ratio, count)

import { useT } from "@/lib/i18n/useTranslation";
import { Settings2 } from "lucide-react";
import { useState } from "react";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:5", label: "4:5 (Portrait)" },
  { value: "9:16", label: "9:16 (Story)" },
] as const;

interface OutputVolumeSectionProps {
  aspectRatio: string;
  count: number;
  onAspectRatioChange: (ratio: string) => void;
  onCountChange: (count: number) => void;
}

export function OutputVolumeSection({
  aspectRatio,
  count,
  onAspectRatioChange,
  onCountChange,
}: OutputVolumeSectionProps) {
  const { t } = useT();
  // Track whether user is actively editing — derive display value during render
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  // Derive display value: use editValue while editing, otherwise derive from prop
  const inputValue = isEditing ? editValue : String(count);

  function handleFocus() {
    setIsEditing(true);
    setEditValue(String(count));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow empty string while typing
    if (raw === "") {
      setEditValue("");
      return;
    }
    // Only allow digits
    if (!/^\d+$/.test(raw)) return;
    setEditValue(raw);
    const num = Number(raw);
    if (num >= 1 && num <= 10) {
      onCountChange(num);
    }
  }

  function handleBlur() {
    setIsEditing(false);
    const num = Number(editValue);
    if (!editValue || num < 1) {
      onCountChange(1);
    } else if (num > 10) {
      onCountChange(10);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
        </div>
        {t.workspace.outputVolume}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
            {t.workspace.aspectRatio}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                type="button"
                onClick={() => onAspectRatioChange(ar.value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  aspectRatio === ar.value
                    ? "bg-primary text-white border-primary"
                    : "bg-background-subtle text-foreground-muted border-border hover:border-primary/50"
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
            {t.workspace.numberOfAds}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <p className="text-[10px] text-foreground-subtle mt-1">{t.workspace.adsPerGeneration}</p>
        </div>
      </div>
    </div>
  );
}

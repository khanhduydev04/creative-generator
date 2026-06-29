"use client";
// Client Component: edit form state for a brand profile

import { useT } from "@/lib/i18n/useTranslation";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ProfileData {
  id: string;
  name: string;
  angle: string;
  pain: string;
  emotion: string;
}

interface EditProfileModalProps {
  profile: ProfileData;
  onClose: () => void;
  onSave: (updated: ProfileData) => void;
}

interface FormState {
  name: string;
  angle: string;
  pain: string;
  emotion: string;
}

export function EditProfileModal({
  profile,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const { t } = useT();
  const [form, setForm] = useState<FormState>({
    name: profile.name,
    angle: profile.angle,
    pain: profile.pain,
    emotion: profile.emotion,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({ ...profile, ...form });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const FIELDS: {
    key: keyof FormState;
    label: string;
    multiline: boolean;
    placeholder: string;
  }[] = [
    {
      key: "name",
      label: t.brandSetup.profileNameLabel,
      multiline: false,
      placeholder: t.brandSetup.profileNamePlaceholder,
    },
    {
      key: "angle",
      label: t.brandSetup.angleFieldLabel,
      multiline: true,
      placeholder: t.brandSetup.anglePlaceholder,
    },
    {
      key: "pain",
      label: t.brandSetup.painPointLabel,
      multiline: true,
      placeholder: t.brandSetup.painPointPlaceholder,
    },
    {
      key: "emotion",
      label: t.brandSetup.emotionFieldLabel,
      multiline: false,
      placeholder: t.brandSetup.emotionFieldPlaceholder,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border glass-strong shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-black text-foreground">
              {t.brandSetup.editProfileTitle}
            </h2>
            <p className="mt-0.5 text-xs text-foreground-subtle">
              {t.brandSetup.editProfileDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 transition-colors hover:bg-black/[0.05]"
            aria-label={t.brandSetup.closeLabel}
          >
            <X className="h-5 w-5 text-foreground-muted" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {FIELDS.map(({ key, label, multiline, placeholder }) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground-muted">
                {label}
              </label>
              {multiline ? (
                <textarea
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background-elevated px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              ) : (
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground-muted transition-colors hover:bg-black/[0.05]"
          >
            {t.brandSetup.cancelBtn}
          </button>
          <button
            type="button"
            disabled={!form.name.trim()}
            onClick={handleSave}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all duration-200 hover:shadow-[0_0_16px_hsl(262_83%_65%/0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {t.brandSetup.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

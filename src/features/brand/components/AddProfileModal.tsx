"use client";
// Client Component: form modal for adding a new persona profile (replaces window.prompt)

import { SimpleModal } from "@/components/ui/SimpleModal";
import { useT } from "@/lib/i18n/useTranslation";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";

interface AddProfileModalProps {
  brandId: string;
  onClose: () => void;
  onCreated: (persona: { id: string; title: string; pain: string | null; angle: string | null; emotion: string | null; source: "manual" }) => void;
}

interface FormState {
  title: string;
  pain: string;
  angle: string;
  emotion: string;
}

export function AddProfileModal({ brandId, onClose, onCreated }: AddProfileModalProps) {
  const { t } = useT();
  const [form, setForm] = useState<FormState>({ title: "", pain: "", angle: "", emotion: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandId,
          title: form.title.trim(),
          pain: form.pain.trim() || null,
          angle: form.angle.trim() || null,
          emotion: form.emotion.trim() || null,
        }),
      });
      const json = (await res.json()) as { persona?: { id: string; title: string; pain: string | null; angle: string | null; emotion: string | null; source: "manual" }; error?: string };
      if (json.error) throw new Error(json.error);
      if (!json.persona) throw new Error(t.brandSetup.failedToCreateProfile);
      onCreated(json.persona);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.brandSetup.failedToCreateProfile);
    } finally {
      setSubmitting(false);
    }
  }

  const FIELDS: { key: keyof FormState; label: string; multiline: boolean; placeholder: string; required?: boolean }[] = [
    { key: "title", label: t.brandSetup.profileNameLabel, multiline: false, placeholder: t.brandSetup.profileNamePlaceholder, required: true },
    { key: "angle", label: t.brandSetup.angleFieldLabel, multiline: true, placeholder: t.brandSetup.anglePlaceholder },
    { key: "pain", label: t.brandSetup.painPointLabel, multiline: true, placeholder: t.brandSetup.painPointPlaceholder },
    { key: "emotion", label: t.brandSetup.emotionFieldLabel, multiline: false, placeholder: t.brandSetup.emotionFieldPlaceholder },
  ];

  return (
    <SimpleModal title={t.brandSetup.addProfileTitle} description={t.brandSetup.addProfileDescription} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4">
        {FIELDS.map(({ key, label, multiline, placeholder, required }) => (
          <div key={key}>
            <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-1.5">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            {multiline ? (
              <textarea
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-lg border border-border bg-background-subtle px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            ) : (
              <input
                type="text"
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={placeholder}
                autoFocus={key === "title"}
                className="w-full rounded-lg border border-border bg-background-subtle px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            )}
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-foreground-muted bg-background-elevated rounded-lg hover:bg-background-elevated transition-colors"
          >
            {t.brandSetup.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={!form.title.trim() || submitting}
            className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t.brandSetup.createProfileBtn}
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}

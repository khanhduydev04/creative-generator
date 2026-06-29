// Client Component: modal to add TikTok URL manually
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { ApiError } from "@/lib/api";

interface AddVideoModalProps {
  onClose: () => void;
  onAdd: (tiktokUrl: string) => Promise<void>;
}

function isValidTikTokUrl(url: string): boolean {
  return url.startsWith("http") && url.includes("tiktok.com");
}

export function AddVideoModal({ onClose, onAdd }: AddVideoModalProps) {
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidTikTokUrl(url.trim())) {
      setError(t.video.invalidUrl);
      return;
    }

    setAdding(true);
    try {
      await onAdd(url.trim());
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t.video.urlAlreadyExists);
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t.video.addVideoModalTitle}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-black/[0.05] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-foreground-muted">
          {t.video.tiktokUrlLabel}
        </label>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.video.tiktokUrlPlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-foreground-muted hover:text-foreground"
          >
            {t.video.cancel}
          </button>
          <button
            type="submit"
            disabled={!url.trim() || adding}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
            {adding ? t.video.adding : t.video.add}
          </button>
        </div>
      </form>
    </div>
  );
}

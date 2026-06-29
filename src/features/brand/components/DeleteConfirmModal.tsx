"use client";
// Client Component: confirmation dialog before deleting a brand profile

import { useT } from "@/lib/i18n/useTranslation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect } from "react";

interface DeleteConfirmModalProps {
  profileName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  profileName,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const { t } = useT();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border glass-strong shadow-2xl">
        <div className="flex items-start justify-between px-6 pb-0 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">
                {t.brandSetup.deleteProfileTitle}
              </h2>
              <p className="mt-0.5 text-xs text-foreground-subtle">
                {t.brandSetup.deleteProfileCannotUndo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-1 shrink-0 cursor-pointer rounded-full p-2 transition-colors hover:bg-black/[0.05]"
            aria-label={t.brandSetup.closeLabel}
          >
            <X className="h-4 w-4 text-foreground-subtle" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-foreground-muted">
            {t.brandSetup.deleteProfileConfirmPrefix}{" "}
            <span className="font-bold text-foreground">
              &ldquo;{profileName}&rdquo;
            </span>
            {t.brandSetup.deleteProfileConfirmSuffix}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground-muted transition-colors hover:bg-black/[0.05]"
          >
            {t.brandSetup.cancelBtn}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-danger/90"
          >
            <Trash2 className="h-4 w-4" />
            {t.brandSetup.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
// Client Component: reusable modal shell with backdrop, Escape key, and focus trap

import { X } from "lucide-react";
import { useEffect } from "react";

interface SimpleModalProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

export function SimpleModal({
  title,
  description,
  children,
  onClose,
  maxWidth = "max-w-md",
}: SimpleModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-background-elevated rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-black text-foreground">{title}</h2>
            {description && (
              <p className="text-xs text-foreground-subtle mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-background-elevated rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-foreground-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );
}

// Client Component: requires i18n context for language switching
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { t, locale, setLocale } = useT();
  const router = useRouter();

  function handleToggle() {
    const next = locale === "vi" ? "en" : "vi";
    setLocale(next);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground-muted transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
      title={locale === "vi" ? t.nav.switchToEnglish : t.nav.switchToVietnamese}
    >
      <Globe className="h-3.5 w-3.5" />
      {locale === "vi" ? "EN" : "VI"}
    </button>
  );
}

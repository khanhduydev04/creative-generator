// Client Component: requires i18n context for translated heading
"use client";

import { useT } from "@/lib/i18n/useTranslation";

export function ConceptsPageHeader() {
  const { t } = useT();

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {t.app.conceptsTitle}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {t.app.conceptsSubtitle}
      </p>
    </div>
  );
}

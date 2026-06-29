// Client Component: fetches /api/user/me on mount to know which BYOK keys are missing
"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useTranslation";

const PROVIDER_LABELS = { anthropic: "Anthropic", google: "Google AI", kie: "KIE" } as const;
type Provider = keyof typeof PROVIDER_LABELS;

interface UserMe {
  has_keys: { anthropic: boolean; google: boolean; kie: boolean };
}

export function MissingKeyBanner() {
  const { t } = useT();
  const [missing, setMissing] = useState<Provider[] | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserMe | null) => {
        if (!data) {
          setMissing(null);
          return;
        }
        const m = (Object.keys(PROVIDER_LABELS) as Provider[]).filter((p) => !data.has_keys[p]);
        setMissing(m);
      })
      .catch(() => setMissing(null));
  }, []);

  if (!missing || missing.length === 0) return null;

  return (
    <div className="mx-4 mt-4 rounded-xl border border-warning/20 bg-warning/[0.06] p-4 sm:mx-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="font-medium text-foreground">{t.app.missingKeysTitle}</p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              {t.app.missingLabel}: {missing.map((p) => PROVIDER_LABELS[p]).join(", ")}.
            </p>
          </div>
        </div>
        <Link
          href="/app/settings#api-keys"
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:shadow-[0_0_16px_hsl(262_83%_65%/0.3)]"
        >
          {t.app.addKeys} &rarr;
        </Link>
      </div>
    </div>
  );
}

// Client Component: uses useT() hook for i18n translations
"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useTranslation";

const PROVIDER_LABELS = { anthropic: "Anthropic", google: "Google AI", kie: "KIE" } as const;
type Provider = keyof typeof PROVIDER_LABELS;

export interface MissingKeyEmptyStateProps {
  provider: Provider;
  feature: string;
}

export function MissingKeyEmptyState({ provider, feature }: MissingKeyEmptyStateProps) {
  const { t } = useT();
  const providerLabel = PROVIDER_LABELS[provider];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-strong bg-background-elevated p-12 text-center">
      <h3 className="text-lg font-semibold text-foreground">
        {t.settings.featureNeedsKey.replace("{0}", feature).replace("{1}", providerLabel)}
      </h3>
      <p className="mt-2 max-w-md text-sm text-foreground-muted">
        {t.settings.addKeyInSettings.replace("{0}", providerLabel)}
      </p>
      <Link
        href="/app/settings#api-keys"
        className="mt-6 cursor-pointer rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors duration-200 hover:bg-violet-500"
      >
        {t.settings.addProviderKey.replace("{0}", providerLabel)}
      </Link>
    </div>
  );
}

"use client";
// Client Component: form state for entering 3 BYOK API keys via TanStack Query mutations

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/useTranslation";
import { useSaveApiKey } from "@/hooks/api/useApiKeys";

type Provider = "anthropic" | "google" | "kie";

const PROVIDERS: { id: Provider; label: string; helpUrl: string }[] = [
  { id: "anthropic", label: "Anthropic", helpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "google", label: "Google AI Studio", helpUrl: "https://aistudio.google.com/apikey" },
  { id: "kie", label: "KIE", helpUrl: "https://kie.ai/api-keys" },
];

export function OnboardingWizard() {
  const { t } = useT();
  const [keys, setKeys] = useState<Record<Provider, string>>({ anthropic: "", google: "", kie: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const saveApiKey = useSaveApiKey();

  async function saveAll() {
    setBusy(true);
    setError(null);
    const providers: Provider[] = ["anthropic", "google", "kie"];
    for (const provider of providers) {
      const key = keys[provider].trim();
      if (!key) continue;
      try {
        await saveApiKey.mutateAsync({ provider, key });
      } catch (err) {
        const message = err instanceof Error
          ? `${provider}: ${err.message}`
          : `${provider}: ${t.auth.saveFailed}`;
        setError(message);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    router.push("/app");
  }

  function skip() {
    router.push("/app");
  }

  const anyKey = Object.values(keys).some((k) => k.trim().length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">{t.auth.addApiKeys}</h1>
        <p className="mt-2 text-foreground-muted">
          {t.auth.byokOnboarding}
        </p>
      </header>

      {PROVIDERS.map((p) => (
        <div key={p.id} className="rounded-xl border border-border-strong bg-background-elevated p-4">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`onboarding-${p.id}`} className="font-medium">
              {p.label}
            </label>
            <a
              href={p.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer text-sm text-cyan-400 transition-colors duration-200 hover:text-accent"
            >
              {t.auth.howToGetKey} →
            </a>
          </div>
          <input
            id={`onboarding-${p.id}`}
            type="password"
            value={keys[p.id]}
            onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
            placeholder={`${t.auth.pasteKeyPlaceholder} ${p.label}`}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={skip}
          className="cursor-pointer rounded-lg border border-border-strong px-4 py-2 transition-colors duration-200 hover:border-foreground-muted"
        >
          {t.auth.skipForNow}
        </button>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={!anyKey || busy}
          className="cursor-pointer rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors duration-200 hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? t.auth.saving : t.auth.saveAndContinue}
        </button>
      </div>
    </div>
  );
}

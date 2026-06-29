// Client Component: manages user-provided API keys with save/delete per provider
"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/useTranslation";
import { useApiKeys, useSaveApiKey, useDeleteApiKey } from "@/hooks/api/useApiKeys";
import type { ApiKeyProvider } from "@/lib/key-provider";

const TEMPLATE_PLACEHOLDER = "{0}";

const PROVIDERS: { id: ApiKeyProvider; label: string; helpUrl: string }[] = [
  { id: "anthropic", label: "Anthropic", helpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "google", label: "Google AI Studio", helpUrl: "https://aistudio.google.com/apikey" },
  { id: "kie", label: "KIE", helpUrl: "https://kie.ai/api-keys" },
  { id: "openai", label: "OpenAI", helpUrl: "https://platform.openai.com/api-keys" },
];

export function UserApiKeysCard() {
  const { t } = useT();
  const { data: keys = [], isLoading } = useApiKeys();
  const saveApiKey = useSaveApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [drafts, setDrafts] = useState<Record<ApiKeyProvider, string>>({ anthropic: "", google: "", kie: "", openai: "" });
  const [savingProvider, setSavingProvider] = useState<ApiKeyProvider | null>(null);
  const [errorByProvider, setErrorByProvider] = useState<Partial<Record<ApiKeyProvider, string>>>({});

  function saveKey(provider: ApiKeyProvider) {
    const key = drafts[provider].trim();
    if (!key) return;
    setSavingProvider(provider);
    setErrorByProvider((previousErrors) => ({ ...previousErrors, [provider]: undefined }));
    saveApiKey.mutate(
      { provider, key },
      {
        onSuccess: () => {
          setSavingProvider(null);
          setDrafts((previousDrafts) => ({ ...previousDrafts, [provider]: "" }));
        },
        onError: (err) => {
          setSavingProvider(null);
          const message = err instanceof Error ? err.message : t.settings.failedToSaveKey;
          setErrorByProvider((previousErrors) => ({ ...previousErrors, [provider]: message }));
        },
      },
    );
  }

  function deleteKey(provider: ApiKeyProvider) {
    if (!confirm(t.settings.confirmRemoveKey.replace(TEMPLATE_PLACEHOLDER, provider))) return;
    setSavingProvider(provider);
    deleteApiKey.mutate(provider, {
      onSettled: () => {
        setSavingProvider(null);
      },
    });
  }

  if (isLoading) return <div className="text-foreground-muted">{t.settings.loadingKeys}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t.settings.apiKeysTitle}</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {t.settings.apiKeysDescription}
        </p>
      </div>

      {PROVIDERS.map((provider) => {
        const existing = keys.find((apiKey) => apiKey.provider === provider.id);
        const err = errorByProvider[provider.id];
        return (
          <div key={provider.id} className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-4 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <label htmlFor={`key-${provider.id}`} className="font-medium">{provider.label}</label>
                <a
                  href={provider.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 cursor-pointer text-sm text-cyan-400 transition-colors duration-200 hover:text-accent"
                >
                  {t.settings.howToGetKey} &rarr;
                </a>
              </div>
              {existing && (
                <button
                  type="button"
                  onClick={() => void deleteKey(provider.id)}
                  disabled={savingProvider === provider.id}
                  className="cursor-pointer text-sm text-danger transition-colors duration-200 hover:underline disabled:opacity-50"
                >
                  {t.settings.remove}
                </button>
              )}
            </div>

            {existing ? (
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-sm text-foreground-muted">{existing.masked}</span>
                <span className="text-xs text-foreground-subtle">
                  {t.settings.updated} {new Date(existing.updated_at).toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-foreground-subtle">{t.settings.notSet}</p>
            )}

            <div className="mt-3 flex gap-2">
              <input
                id={`key-${provider.id}`}
                type="password"
                placeholder={existing ? t.settings.enterNewKeyToReplace : t.settings.pasteProviderKey.replace(TEMPLATE_PLACEHOLDER, provider.label)}
                value={drafts[provider.id]}
                onChange={(e) => setDrafts((previousDrafts) => ({ ...previousDrafts, [provider.id]: e.target.value }))}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => void saveKey(provider.id)}
                disabled={!drafts[provider.id].trim() || savingProvider === provider.id}
                className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors duration-200 hover:bg-violet-500 disabled:opacity-50"
              >
                {savingProvider === provider.id ? t.settings.saving : existing ? t.settings.replace : t.settings.save}
              </button>
            </div>

            {err && (
              <p className="mt-2 text-sm text-danger">{err}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

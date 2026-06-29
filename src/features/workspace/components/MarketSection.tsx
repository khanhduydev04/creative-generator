"use client";
// Client Component: market CRUD per product + language selector — requires useState, event handlers, fetch

import type { ProductMarket } from "@/features/brand/types";
import { useT } from "@/lib/i18n/useTranslation";
import {
  Globe,
  Languages,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Database,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const MARKET_PRESETS = [
  { code: "US", label: "United States" },
  { code: "UK", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "JP", label: "Japan" },
] as const;

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-UK", label: "English (UK)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "vi", label: "Vietnamese" },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

interface MarketSectionProps {
  productId: string | null;
  selectedMarketId: string;
  language: string;
  onMarketChange: (marketId: string, marketCode: string) => void;
  onLanguageChange: (language: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MarketSection({
  productId,
  selectedMarketId,
  language,
  onMarketChange,
  onLanguageChange,
}: MarketSectionProps) {
  const { t } = useT();
  const [markets, setMarkets] = useState<ProductMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [fetchingDataId, setFetchingDataId] = useState<string | null>(null);

  // Add form state
  const [newMarketCode, setNewMarketCode] = useState("");
  const [newSheetUrl, setNewSheetUrl] = useState("");
  const [newSheetName, setNewSheetName] = useState("");

  // ── Load markets when product changes ──────────────────────────
  const loadMarkets = useCallback(
    async (pid: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/product-markets?productId=${pid}`);
        const json = (await res.json()) as { markets?: ProductMarket[] };
        const loaded = json.markets ?? [];
        setMarkets(loaded);

        // Auto-select first market if none selected
        if (loaded.length > 0 && !selectedMarketId) {
          const first = loaded[0];
          onMarketChange(first.id, first.market_code);
          onLanguageChange(first.language);
        }
      } catch (err) {
        console.error("[MarketSection] Failed to load markets:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedMarketId, onMarketChange, onLanguageChange],
  );

  useEffect(() => {
    if (productId) {
      void loadMarkets(productId);
    } else {
      setMarkets([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // ── Add market ─────────────────────────────────────────────────
  async function handleAddMarket() {
    if (!productId || !newMarketCode) return;

    const preset = MARKET_PRESETS.find((p) => p.code === newMarketCode);
    if (!preset) return;

    try {
      const res = await fetch("/api/product-markets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          market_code: preset.code,
          market_label: preset.label,
          language: "en-US",
          sheet_url: newSheetUrl.trim() || null,
          sheet_name: newSheetName.trim() || null,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        console.error("[MarketSection] Create failed:", json.error);
        return;
      }

      const json = (await res.json()) as { market: ProductMarket };
      setMarkets((prev) => [...prev, json.market]);
      setShowAddForm(false);
      setNewMarketCode("");
      setNewSheetUrl("");
      setNewSheetName("");

      // Auto-select the newly added market
      onMarketChange(json.market.id, json.market.market_code);
      onLanguageChange(json.market.language);
    } catch (err) {
      console.error("[MarketSection] Create error:", err);
    }
  }

  // ── Delete market ──────────────────────────────────────────────
  async function handleDeleteMarket(marketId: string) {
    try {
      await fetch(`/api/product-markets/${marketId}`, { method: "DELETE" });
      setMarkets((prev) => prev.filter((m) => m.id !== marketId));

      if (selectedMarketId === marketId) {
        const remaining = markets.filter((m) => m.id !== marketId);
        if (remaining.length > 0) {
          onMarketChange(remaining[0].id, remaining[0].market_code);
          onLanguageChange(remaining[0].language);
        } else {
          onMarketChange("", "");
        }
      }
    } catch (err) {
      console.error("[MarketSection] Delete error:", err);
    }
  }

  // ── Fetch competitor data ──────────────────────────────────────
  async function handleFetchData(marketId: string) {
    setFetchingDataId(marketId);
    try {
      const res = await fetch(
        `/api/product-markets/${marketId}/fetch-data`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        rowCount?: number;
        cachedAt?: string;
        error?: string;
      };

      if (res.ok && json.cachedAt) {
        setMarkets((prev) =>
          prev.map((m) =>
            m.id === marketId
              ? { ...m, cached_at: json.cachedAt ?? null }
              : m,
          ),
        );
      } else {
        console.error("[MarketSection] Fetch data failed:", json.error);
      }
    } catch (err) {
      console.error("[MarketSection] Fetch data error:", err);
    } finally {
      setFetchingDataId(null);
    }
  }

  // ── Select market ──────────────────────────────────────────────
  function handleSelectMarket(marketId: string) {
    const market = markets.find((m) => m.id === marketId);
    if (market) {
      onMarketChange(market.id, market.market_code);
      onLanguageChange(market.language);
    }
  }

  // ── Available markets (not yet added) ──────────────────────────
  const existingCodes = new Set(markets.map((m) => m.market_code));
  const availablePresets = MARKET_PRESETS.filter(
    (p) => !existingCodes.has(p.code),
  );

  // ── No product selected ────────────────────────────────────────
  if (!productId) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm opacity-50">
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          {t.workspace.marketAndLanguage}
        </h3>
        <p className="text-xs text-foreground-subtle">{t.workspace.selectProductFirst}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm">
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        {t.workspace.marketAndLanguage}
      </h3>

      <div className="space-y-3">
        {/* Market Selector */}
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
            {t.workspace.targetMarket} <span className="text-rose-500">*</span>
          </label>

          {loading ? (
            <div className="text-xs text-foreground-subtle py-2">{t.workspace.loadingMarkets}</div>
          ) : markets.length === 0 ? (
            <div className="text-xs text-foreground-subtle py-2">
              {t.workspace.noMarketsConfigured}
            </div>
          ) : (
            <div className="space-y-1.5">
              {markets.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    selectedMarketId === m.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-background-subtle hover:border-border-strong"
                  }`}
                  onClick={() => handleSelectMarket(m.id)}
                >
                  {/* Selection indicator */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedMarketId === m.id
                        ? "border-primary bg-primary"
                        : "border-border-strong"
                    }`}
                  >
                    {selectedMarketId === m.id && (
                      <Check className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>

                  {/* Market info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {m.market_label}
                      </span>
                      <span className="text-[10px] text-foreground-subtle font-mono">
                        {m.market_code}
                      </span>
                    </div>
                    {/* Data status */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Database className="h-3 w-3 text-foreground-subtle" />
                      {m.cached_at ? (
                        <span className="text-[10px] text-emerald-600">
                          {t.workspace.dataCached}{" "}
                          {new Date(m.cached_at).toLocaleDateString()}
                        </span>
                      ) : m.spreadsheet_id ? (
                        <span className="text-[10px] text-amber-600">
                          {t.workspace.sheetLinkedNotFetched}
                        </span>
                      ) : (
                        <span className="text-[10px] text-foreground-subtle">
                          {t.workspace.noDataSource}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(m.spreadsheet_id || m.cached_csv) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleFetchData(m.id);
                        }}
                        disabled={fetchingDataId === m.id}
                        className="p-1 rounded hover:bg-background-elevated text-foreground-subtle hover:text-foreground-muted disabled:opacity-40"
                        title={t.workspace.fetchCompetitorData}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${fetchingDataId === m.id ? "animate-spin" : ""}`}
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteMarket(m.id);
                      }}
                      className="p-1 rounded hover:bg-rose-500/10 text-foreground-subtle hover:text-rose-400"
                      title={t.workspace.removeMarket}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Market Toggle */}
        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          disabled={availablePresets.length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showAddForm ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t.workspace.cancel}
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              {t.workspace.addMarket}
            </>
          )}
        </button>

        {/* Add Market Form */}
        {showAddForm && (
          <div className="border border-border rounded-lg p-3 space-y-2.5 bg-background-subtle/50">
            {/* Market code select */}
            <div>
              <label className="block text-[10px] font-semibold text-foreground-muted mb-1">
                {t.workspace.market}
              </label>
              <select
                value={newMarketCode}
                onChange={(e) => setNewMarketCode(e.target.value)}
                className="w-full rounded-lg border border-border bg-background-elevated text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">{t.workspace.selectMarket}</option>
                {availablePresets.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Sheet URL */}
            <div>
              <label className="block text-[10px] font-semibold text-foreground-muted mb-1">
                {t.workspace.googleSheetUrl}{" "}
                <span className="font-normal text-foreground-subtle">{t.workspace.optional}</span>
              </label>
              <input
                type="url"
                value={newSheetUrl}
                onChange={(e) => setNewSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full rounded-lg border border-border bg-background-elevated text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-foreground-subtle"
              />
            </div>

            {/* Sheet Tab Name */}
            {newSheetUrl && (
              <div>
                <label className="block text-[10px] font-semibold text-foreground-muted mb-1">
                  {t.workspace.sheetTabName}{" "}
                  <span className="font-normal text-foreground-subtle">
                    {t.workspace.forSheetsApi}
                  </span>
                </label>
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder={t.workspace.sheetTabPlaceholder}
                  className="w-full rounded-lg border border-border bg-background-elevated text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-foreground-subtle"
                />
              </div>
            )}

            {/* Add button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleAddMarket()}
                disabled={!newMarketCode}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {t.workspace.addMarket}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewMarketCode("");
                  setNewSheetUrl("");
                  setNewSheetName("");
                }}
                className="px-3 py-2 rounded-lg border border-border text-foreground-muted text-xs font-medium hover:bg-background-elevated transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Language Selector */}
        <div className="pt-1 border-t border-border-subtle">
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5 flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5" />
            {t.workspace.language}
          </label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-foreground-subtle mt-1.5">
            {t.workspace.languageHelper}
          </p>
        </div>
      </div>
    </div>
  );
}

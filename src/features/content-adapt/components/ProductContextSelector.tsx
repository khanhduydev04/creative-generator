"use client";
// Client Component: modal for selecting product with cached context for content adaptation
// Products must have their context cached via Brand Setup first

import type { BrandProduct } from "@/features/brand/types";
import type { ProductDataForAdapt } from "@/lib/content-adapter";
import type { ProductContext } from "@/lib/gemini-reader";
import { ProductDropdown } from "@/components/ui/ProductDropdown";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Languages,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-UK", label: "English (UK)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "vi", label: "Vietnamese" },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProductContextSelectorProps {
  products: BrandProduct[];
  onConfirm: (productData: ProductDataForAdapt, language: string) => void;
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCachedAge(cachedAt: string | null): string {
  if (!cachedAt) return "";
  const diff = Date.now() - new Date(cachedAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function productContextToAdaptData(
  ctx: ProductContext,
): ProductDataForAdapt {
  return {
    brandName: ctx.brandName,
    productName: ctx.productName,
    tagline: ctx.tagline ?? undefined,
    packagingForm: ctx.packagingForm,
    physicalDimensions: ctx.physicalDimensions,
    productFormDetails: ctx.productFormDetails,
    claims: ctx.claims,
    keyIngredients: ctx.keyIngredients,
    benefits: ctx.benefits,
    tone: ctx.tone,
    targetSignals: ctx.targetSignals,
    rawSummary: ctx.rawSummary,
    priceInfo: ctx.priceInfo,
    servingInfo: ctx.servingInfo,
    certifications: ctx.certifications,
    socialProof: ctx.socialProof,
    flavorVariant: ctx.flavorVariant,
    uniqueSellingPoints: ctx.uniqueSellingPoints,
    visualIdentifiers: ctx.visualIdentifiers,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProductContextSelector({
  products,
  onConfirm,
  onClose,
}: ProductContextSelectorProps) {
  const [selectedProductId, setSelectedProductId] = useState(
    products.length === 1 ? products[0].id : "",
  );
  const [language, setLanguage] = useState("en-US");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const hasCachedContext = Boolean(
    selectedProduct?.cached_product_context && selectedProduct?.context_cached_at,
  );

  const handleConfirm = useCallback(() => {
    if (!selectedProduct?.cached_product_context) return;
    const ctx = selectedProduct.cached_product_context as unknown as ProductContext;
    onConfirm(productContextToAdaptData(ctx), language);
  }, [selectedProduct, language, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background-elevated rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-bold text-foreground">
            Select Product for Content Adaptation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-background-elevated rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-foreground-subtle" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Product Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground-muted mb-1.5 block">
              Product
            </label>
            <ProductDropdown
              products={products}
              selectedProductId={selectedProductId}
              onProductChange={setSelectedProductId}
              placeholder="Choose a product..."
            />
          </div>

          {/* Cache Status */}
          {selectedProduct && (
            <div>
              {hasCachedContext ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">
                      Product data ready
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      Scraped {formatCachedAge(selectedProduct.context_cached_at)} — includes pricing, ingredients, benefits, and more.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs text-amber-700 font-medium">
                      Product data not available
                    </p>
                    <p className="text-[10px] text-amber-600">
                      Go to Brand Setup → Products → add a URL and click &quot;Scrape Now&quot; to cache product data first.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Language Selector */}
          {selectedProduct && hasCachedContext && (
            <div>
              <label className="text-xs font-semibold text-foreground-muted mb-1.5 flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" />
                Output Language
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background-subtle text-foreground px-3 py-2.5 pr-8 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground-muted hover:bg-background-subtle transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasCachedContext}
            className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

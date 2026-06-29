"use client";
// Client Component: product selector with image thumbnails + cache status display

import type { BrandProduct } from "@/features/brand/types";
import { ProductDropdown } from "@/components/ui/ProductDropdown";
import { useT } from "@/lib/i18n/useTranslation";
import { AlertTriangle, CheckCircle2, Globe, Package } from "lucide-react";

interface BrandProductSectionProps {
  products: BrandProduct[];
  selectedProductId: string;
  onProductChange: (id: string) => void;
}

export function BrandProductSection({
  products,
  selectedProductId,
  onProductChange,
}: BrandProductSectionProps) {
  const { t } = useT();
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const hasUrl = Boolean(selectedProduct?.product_url);
  const hasCachedContext = Boolean(
    selectedProduct?.cached_product_context && selectedProduct?.context_cached_at,
  );

  return (
    <div className="group relative z-10 rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-3.5 w-3.5 text-primary" />
        </div>
        {t.workspace.brandProduct}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5">
            {t.workspace.product} <span className="text-rose-500">*</span>
          </label>
          <ProductDropdown
            products={products}
            selectedProductId={selectedProductId}
            onProductChange={onProductChange}
          />
        </div>

        {/* Product URL + Cache status */}
        {selectedProduct && (
          <div className="space-y-1.5">
            {hasUrl ? (
              <p className="text-[10px] text-foreground-subtle flex items-center gap-1 truncate">
                <Globe className="h-3 w-3 shrink-0" />
                {selectedProduct.product_url}
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {t.workspace.noProductUrl}
              </p>
            )}

            {hasCachedContext ? (
              <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                {t.workspace.productCached}
              </p>
            ) : hasUrl ? (
              <p className="text-[10px] text-amber-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {t.workspace.productNotScraped}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

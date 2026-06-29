"use client";
// Client Component: custom product selector dropdown with product image thumbnails

import type { BrandProduct } from "@/features/brand/types";
import { ChevronDown, ImageIcon, Package } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProductDropdownProps {
  products: BrandProduct[];
  selectedProductId: string;
  onProductChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Compact size for modals/sidebars */
  compact?: boolean;
}

export function ProductDropdown({
  products,
  selectedProductId,
  onProductChange,
  placeholder = "Select product...",
  disabled = false,
  compact = false,
}: ProductDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      onProductChange(id);
      setIsOpen(false);
    },
    [onProductChange],
  );

  const imgSize = compact ? "w-7 h-7" : "w-9 h-9";
  const textSize = compact ? "text-xs" : "text-sm";
  const padding = compact ? "px-2.5 py-2" : "px-3 py-2.5";
  const optionPadding = compact ? "px-2.5 py-2" : "px-3 py-2.5";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        className={`w-full flex items-center gap-3 ${padding} rounded-lg border border-border bg-background-subtle ${textSize} text-left transition-colors hover:bg-background-elevated focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed ${isOpen ? "border-primary ring-1 ring-primary" : ""}`}
      >
        {selectedProduct ? (
          <>
            <div className={`${imgSize} rounded-md bg-background-elevated border border-border overflow-hidden shrink-0 flex items-center justify-center`}>
              {selectedProduct.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-foreground-subtle" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${textSize} font-medium text-foreground truncate`}>
                {selectedProduct.name}
              </p>
              {/* Color swatches */}
              {selectedProduct.primary_color_1 && !compact && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[selectedProduct.primary_color_1, selectedProduct.primary_color_2, selectedProduct.secondary_color_1, selectedProduct.secondary_color_2, selectedProduct.accent_color_1, selectedProduct.accent_color_2]
                    .filter(Boolean)
                    .map((c, i) => (
                      <div
                        key={`${c}-${i}`}
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: c ?? undefined }}
                      />
                    ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={`${imgSize} rounded-md bg-background-elevated flex items-center justify-center shrink-0`}>
              <Package className="h-4 w-4 text-foreground-subtle" />
            </div>
            <span className="text-foreground-subtle flex-1">{placeholder}</span>
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 text-foreground-subtle shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-background-elevated border border-border rounded-xl shadow-lg py-1 max-h-[280px] overflow-y-auto">
          {/* Empty option */}
          <button
            type="button"
            onClick={() => handleSelect("")}
            className={`w-full flex items-center gap-3 ${optionPadding} ${textSize} text-left transition-colors hover:bg-background-subtle ${!selectedProductId ? "bg-primary/5 text-primary" : "text-foreground-subtle"}`}
          >
            <div className={`${imgSize} rounded-md bg-background-elevated flex items-center justify-center shrink-0`}>
              <Package className="h-4 w-4 text-foreground-subtle" />
            </div>
            <span className="italic">{placeholder}</span>
          </button>

          {products.map((product) => {
            const isActive = product.id === selectedProductId;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product.id)}
                className={`w-full flex items-center gap-3 ${optionPadding} ${textSize} text-left transition-colors ${isActive ? "bg-primary/5 font-medium" : "hover:bg-background-subtle"}`}
              >
                <div className={`${imgSize} rounded-md bg-background-elevated border border-border overflow-hidden shrink-0 flex items-center justify-center`}>
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-foreground-subtle" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                    {product.name}
                  </p>
                  {/* Color swatches */}
                  {product.primary_color_1 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[product.primary_color_1, product.primary_color_2, product.secondary_color_1, product.secondary_color_2, product.accent_color_1, product.accent_color_2]
                        .filter(Boolean)
                        .map((c, i) => (
                          <div
                            key={`${c}-${i}`}
                            className="w-2.5 h-2.5 rounded-full border border-border"
                            style={{ backgroundColor: c ?? undefined }}
                          />
                        ))}
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

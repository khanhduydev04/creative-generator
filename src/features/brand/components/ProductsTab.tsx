"use client";
// Client Component: manages product CRUD with interactive uploads and form state

import type { BrandProduct } from "@/features/brand/types";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUploadProductImage,
  useScrapeProduct,
} from "@/hooks/api/useProducts";
import { useT } from "@/lib/i18n/useTranslation";
import {
  CheckCircle2,
  Crown,
  Globe,
  ImageIcon,
  Loader2,
  Package,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

interface ProductsTabProps {
  brandId: string | null;
  readOnly?: boolean;
}

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

export function ProductsTab({ brandId, readOnly }: ProductsTabProps) {
  const { t } = useT();
  const { data: products = [], isLoading: loading } = useProducts(brandId);
  const deleteProduct = useDeleteProduct(brandId ?? "");
  const scrapeProduct = useScrapeProduct(brandId ?? "");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null);
  const [scrapingProductId, setScrapingProductId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm(t.brand.deleteProductConfirm)) return;
    try {
      await deleteProduct.mutateAsync(id);
    } catch (err) {
      window.alert(t.brand.deleteFailed + " " + String(err instanceof Error ? err.message : err));
    }
  }

  async function handleScrapeContext(product: BrandProduct) {
    if (!product.product_url) {
      window.alert(t.brand.addProductUrlFirst);
      return;
    }
    setScrapingProductId(product.id);
    try {
      await scrapeProduct.mutateAsync({
        productId: product.id,
        url: product.product_url,
      });
    } catch (err) {
      window.alert(t.brand.scrapeFailed + " " + String(err instanceof Error ? err.message : err));
    } finally {
      setScrapingProductId(null);
    }
  }

  if (!brandId) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-4.5 w-4.5 text-primary" />
          </div>
          {t.brand.products}
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => { setEditingProduct(null); setShowForm(true); }}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t.brand.addProduct}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-foreground-subtle gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t.brand.loadingProducts}</span>
        </div>
      )}

      {!loading && products.length === 0 && !showForm && (
        <div className="py-12 flex flex-col items-center justify-center text-foreground-subtle">
          <Package className="h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">{t.brand.noProductsYet}</p>
          <p className="text-xs mt-1">{t.brand.addProductHint}</p>
        </div>
      )}

      {(showForm || editingProduct) && (
        <ProductForm
          brandId={brandId}
          product={editingProduct}
          onSaved={() => { setShowForm(false); setEditingProduct(null); }}
          onCancel={() => { setShowForm(false); setEditingProduct(null); }}
        />
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {products.map((product) => {
            const isScraping = scrapingProductId === product.id;
            const hasCachedContext = Boolean(product.cached_product_context && product.context_cached_at);
            return (
              <div
                key={product.id}
                className="bg-background-subtle rounded-lg border border-border-subtle p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-background-elevated border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-foreground-subtle" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground text-sm truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">{product.description}</p>
                    )}
                    <p className="text-xs text-foreground-subtle mt-1">{product.images.length} image{product.images.length !== 1 ? "s" : ""}</p>
                    {/* Color swatches */}
                    {product.primary_color_1 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {[product.primary_color_1, product.primary_color_2, product.secondary_color_1, product.secondary_color_2, product.accent_color_1, product.accent_color_2]
                          .filter(Boolean)
                          .map((c, i) => (
                            <div
                              key={`${c}-${i}`}
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: c ?? undefined }}
                              title={c ?? undefined}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setEditingProduct(product); }}
                        className="p-1.5 rounded-lg border border-border hover:bg-background-elevated transition-colors"
                        aria-label={t.brand.edit}
                      >
                        <Pencil className="h-3.5 w-3.5 text-foreground-muted" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(product.id)}
                        className="p-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                        aria-label={t.brand.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Product URL + Cache Status */}
                {product.product_url && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <div className="flex items-center gap-1.5 text-[11px] text-foreground-subtle mb-1.5">
                      <Globe className="h-3 w-3" />
                      <span className="truncate">{product.product_url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCachedContext ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          {`${t.brand.productDataCached} (${formatCachedAge(product.context_cached_at)})`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">
                          {t.brand.notYetScraped}
                        </span>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => void handleScrapeContext(product)}
                          disabled={isScraping}
                          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-background-elevated border border-border text-foreground-muted hover:bg-background-subtle transition-colors disabled:opacity-50"
                        >
                          {isScraping ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {hasCachedContext ? t.brand.refresh : t.brand.scrapeNow}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {!product.product_url && !readOnly && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <p className="text-[11px] text-foreground-subtle">
                      {t.brand.noProductUrlHint}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Image Role Labels ──────────────────────────────────────────────────────

function getImageRoleLabel(index: number, labels: string[]): string {
  return labels[index] ?? `#${index + 1}`;
}

// ─── Product Form (Add / Edit) ───────────────────────────────────────────────

interface ProductFormProps {
  brandId: string;
  product: BrandProduct | null;
  onSaved: () => void;
  onCancel: () => void;
}

function ProductForm({ brandId, product, onSaved, onCancel }: ProductFormProps) {
  const { t } = useT();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(brandId);
  const uploadProductImage = useUploadProductImage();
  const imageRoleLabels = [t.brand.front, t.brand.back, t.brand.side, t.brand.detail, t.brand.alt];
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [productUrl, setProductUrl] = useState(product?.product_url ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [colors, setColors] = useState({
    primary1: product?.primary_color_1 ?? "",
    primary2: product?.primary_color_2 ?? "",
    secondary1: product?.secondary_color_1 ?? "",
    secondary2: product?.secondary_color_2 ?? "",
    accent1: product?.accent_color_1 ?? "",
    accent2: product?.accent_color_2 ?? "",
  });
  const [showColors, setShowColors] = useState(
    Boolean(product?.primary_color_1 || product?.secondary_color_1 || product?.accent_color_1),
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saving = createProduct.isPending || updateProduct.isPending;
  const MAX_IMAGES = 5;
  const canAddMore = images.length < MAX_IMAGES;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toUpload = Array.from(files).slice(0, remaining);

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const targetId = product?.id ?? "temp-" + Date.now();
        const result = await uploadProductImage.mutateAsync({
          productId: targetId,
          file,
        });
        uploaded.push(result.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      window.alert(t.brand.uploadFailed + " " + String(err instanceof Error ? err.message : err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function setAsPrimary(index: number) {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || images.length === 0) return;

    try {
      const urlValue = productUrl.trim() || null;
      const colorFields = {
        primary_color_1: colors.primary1 || null,
        primary_color_2: colors.primary2 || null,
        secondary_color_1: colors.secondary1 || null,
        secondary_color_2: colors.secondary2 || null,
        accent_color_1: colors.accent1 || null,
        accent_color_2: colors.accent2 || null,
      };
      if (product) {
        await updateProduct.mutateAsync({
          productId: product.id,
          name: name.trim(),
          description: description.trim() || null,
          images,
          product_url: urlValue,
          ...colorFields,
        });
      } else {
        await createProduct.mutateAsync({
          brand_id: brandId,
          name: name.trim(),
          description: description.trim() || null,
          images,
          product_url: urlValue,
          ...colorFields,
        });
      }
      onSaved();
    } catch (err) {
      window.alert(t.brand.saveFailed + " " + String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="bg-background-subtle rounded-lg border border-border p-5 mb-4">
      <h4 className="font-bold text-sm text-foreground-muted mb-4">
        {product ? t.brand.editProduct : t.brand.addNewProduct}
      </h4>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-foreground-muted mb-1.5">
          {t.brand.productName} <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.brand.productNamePlaceholder}
          required
          className="w-full rounded-lg border border-border bg-background-elevated text-foreground px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-foreground-muted mb-1.5">
          {t.brand.description}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.brand.descriptionPlaceholder}
          rows={3}
          className="w-full rounded-lg border border-border bg-background-elevated text-foreground px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-foreground-muted mb-1.5">
          <Globe className="inline h-4 w-4 mr-1 -mt-0.5 text-foreground-subtle" />
          {t.brand.productPageUrl}
        </label>
        <input
          type="url"
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder={t.brand.productPageUrlPlaceholder}
          className="w-full rounded-lg border border-border bg-background-elevated text-foreground px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
        <p className="text-[10px] text-foreground-subtle mt-1">
          {t.brand.productPageUrlHint}
        </p>
      </div>

      {/* Product Colors */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground-muted mb-2 hover:text-primary transition-colors"
        >
          <Palette className="h-4 w-4 text-foreground-subtle" />
          {t.brand.productColors}
          <span className="text-[10px] font-normal text-foreground-subtle">
            {showColors ? `(${t.brand.collapse})` : `(${t.brand.expand})`}
          </span>
        </button>

        {!showColors && (
          <p className="text-[10px] text-foreground-subtle">
            {t.brand.colorsOverrideHint}
          </p>
        )}

        {showColors && (
          <div className="space-y-3 p-3 bg-background-elevated rounded-lg border border-border-subtle">
            <p className="text-[10px] text-foreground-subtle mb-1">
              {t.brand.colorsNote}
            </p>
            {[
              { label: t.brand.primary, key1: "primary1" as const, key2: "primary2" as const },
              { label: t.brand.secondary, key1: "secondary1" as const, key2: "secondary2" as const },
              { label: t.brand.accent, key1: "accent1" as const, key2: "accent2" as const },
            ].map((tier) => (
              <div key={tier.label} className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground-muted w-20 shrink-0">{tier.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[tier.key1] || "#ffffff"}
                    onChange={(e) => setColors((prev) => ({ ...prev, [tier.key1]: e.target.value }))}
                    className="w-8 h-8 rounded-md border border-border cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono text-foreground-subtle w-16">
                    {colors[tier.key1] || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[tier.key2] || "#ffffff"}
                    onChange={(e) => setColors((prev) => ({ ...prev, [tier.key2]: e.target.value }))}
                    className="w-8 h-8 rounded-md border border-border cursor-pointer p-0.5"
                  />
                  <span className="text-[10px] font-mono text-foreground-subtle w-16">
                    {colors[tier.key2] || "—"}
                  </span>
                </div>
                {(colors[tier.key1] || colors[tier.key2]) && (
                  <button
                    type="button"
                    onClick={() => setColors((prev) => ({ ...prev, [tier.key1]: "", [tier.key2]: "" }))}
                    className="p-1 hover:bg-background-elevated rounded transition-colors"
                    title={t.brand.clearColors}
                  >
                    <X className="h-3 w-3 text-foreground-subtle" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-foreground-muted">
            {t.brand.productImages} <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs text-foreground-subtle font-mono">{images.length} / {MAX_IMAGES}</span>
        </div>

        {images.length > 0 && (
          <p className="text-[10px] text-foreground-subtle mb-2">
            {images.length > 1
              ? t.brand.imageOrderHint
              : t.brand.mainImageHint}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => {
            const isPrimary = i === 0;
            const roleLabel = getImageRoleLabel(i, imageRoleLabels);
            return (
              <div
                key={url}
                className={`relative group transition-all ${
                  isPrimary ? "w-28 h-28" : "w-20 h-20"
                } rounded-lg border-2 overflow-hidden bg-background-elevated ${
                  isPrimary
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-border-strong"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Product ${roleLabel}`} className="w-full h-full object-cover" />

                {/* Role label badge */}
                <span
                  className={`absolute bottom-0 left-0 right-0 text-center font-bold py-0.5 ${
                    isPrimary
                      ? "bg-primary text-white text-[10px]"
                      : "bg-black/50 text-white/90 text-[9px]"
                  }`}
                >
                  {isPrimary ? t.brand.mainBadge : roleLabel}
                </span>

                {/* Primary crown badge (always visible) */}
                {isPrimary && (
                  <div className="absolute top-1 left-1 p-0.5 rounded bg-primary text-white">
                    <Crown className="h-3 w-3" />
                  </div>
                )}

                {/* Actions overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                  {/* Top-right: remove button */}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 p-1 rounded-md bg-black/60 hover:bg-rose-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={t.brand.removeImage}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Set as primary (non-primary images only) */}
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(i)}
                      className="absolute top-0.5 left-0.5 p-1 rounded-md bg-white/90 hover:bg-primary hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      title={t.brand.setAsMainImage}
                    >
                      <Crown className="h-3 w-3" />
                    </button>
                  )}

                  {/* Reorder arrows */}
                  {images.length > 1 && (
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5 opacity-0 group-hover:opacity-100">
                      {i > 0 ? (
                        <button
                          type="button"
                          onClick={() => moveImage(i, i - 1)}
                          className="p-0.5 rounded bg-white/80 hover:bg-background-elevated text-foreground-muted text-xs font-bold leading-none"
                          title={t.brand.moveLeft}
                        >
                          &#8592;
                        </button>
                      ) : (
                        <span />
                      )}
                      {i < images.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => moveImage(i, i + 1)}
                          className="p-0.5 rounded bg-white/80 hover:bg-background-elevated text-foreground-muted text-xs font-bold leading-none"
                          title={t.brand.moveRight}
                        >
                          &#8594;
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {canAddMore && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-border-strong flex flex-col items-center justify-center text-foreground-subtle hover:border-primary hover:text-primary transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UploadCloud className="h-5 w-5" />
                  <span className="text-[9px] mt-1">{t.brand.upload}</span>
                </>
              )}
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => void handleFileUpload(e)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-foreground-muted text-sm font-semibold hover:bg-background-elevated transition-colors"
        >
          {t.brand.cancel}
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim() || images.length === 0}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {product ? t.brand.saveChanges : t.brand.createProduct}
        </button>
      </div>
    </form>
  );
}

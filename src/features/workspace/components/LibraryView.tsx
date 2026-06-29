"use client";
// Client Component: uses useApp context, TanStack Query hooks, useState for interactive gallery UI

import type { BrandProduct } from "@/features/brand/types";
import type { ProductDataForAdapt } from "@/lib/content-adapter";
import { ProductDropdown } from "@/components/ui/ProductDropdown";
import { useT } from "@/lib/i18n/useTranslation";
import { useApp } from "@/features/app/context";
import { ContentAdaptPanel } from "@/features/content-adapt/components/ContentAdaptPanel";
import { ProductContextSelector } from "@/features/content-adapt/components/ProductContextSelector";
import { useLibrary, useDeleteAds, type SavedAd } from "@/hooks/api/useLibrary";
import { useProducts } from "@/hooks/api/useProducts";
import { useBrandKit } from "@/hooks/api/useBrandKit";
import { useBrands } from "@/hooks/api/useBrands";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Grid3X3,
  LayoutList,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "grid" | "list";
type SortOrder = "newest" | "oldest";
type DateFilter = "all" | "today" | "this_week" | "this_month" | "last_month";

interface BrandContext {
  brandName: string;
  logoUrl?: string | null;
  primaryColor1: string;
  primaryColor2: string;
  secondaryColor1: string;
  secondaryColor2: string;
  accentColor1: string;
  accentColor2: string;
  typography: string;
}

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTimestamp(filename: string): number {
  const base = filename.replace(/\.\w+$/, "");
  // Handle "1234567890___product-slug" format — extract timestamp before separator
  const sep = base.indexOf("___");
  const timestampStr = sep === -1 ? base : base.slice(0, sep);
  const ts = parseInt(timestampStr, 10);
  return isNaN(ts) ? 0 : ts;
}

function formatDate(filename: string): string {
  const ts = parseTimestamp(filename);
  if (ts === 0) return filename;
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(filename: string): string {
  const ts = parseTimestamp(filename);
  if (ts === 0) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDateGroup(filename: string, activeDateFilter: DateFilter): string {
  const ts = parseTimestamp(filename);
  if (ts === 0) return "Other";

  const date = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  // Always show Today / Yesterday
  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";

  // Show "This Week" / "This Month" groups only when those filters are active
  if (activeDateFilter === "this_week") {
    return "This Week";
  }
  if (activeDateFilter === "this_month") {
    return "This Month";
  }
  if (activeDateFilter === "last_month") {
    return "Last Month";
  }

  // Default: group by specific date (d/m/year)
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" });
}

function matchesDateFilter(filename: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const ts = parseTimestamp(filename);
  if (ts === 0) return true;

  const date = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return date >= startOfToday;
    case "this_week": {
      const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 86400000);
      return date >= startOfWeek;
    }
    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }
    case "last_month": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfLastMonth && date < startOfThisMonth;
    }
    default:
      return true;
  }
}


function groupAdsByDate(ads: SavedAd[], activeDateFilter: DateFilter): Array<{ label: string; ads: SavedAd[] }> {
  const groups = new Map<string, SavedAd[]>();
  for (const ad of ads) {
    const label = getDateGroup(ad.name, activeDateFilter);
    const existing = groups.get(label) ?? [];
    existing.push(ad);
    groups.set(label, existing);
  }
  return Array.from(groups.entries()).map(([label, groupAds]) => ({ label, ads: groupAds }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LibraryView() {
  const { t } = useT();
  const { selectedBrandId } = useApp();
  const queryClient = useQueryClient();

  // ── TanStack Query hooks for server data ────────────────────────
  const { data: ads = [], isLoading: loading } = useLibrary(selectedBrandId);
  const { data: products = [] } = useProducts(selectedBrandId);
  const { data: brandKitData } = useBrandKit(selectedBrandId);
  const { data: brands } = useBrands();
  const deleteAdsMutation = useDeleteAds(selectedBrandId!);

  // Derive brand context from query data
  const brandContext = useMemo<BrandContext>(() => {
    const brand = brands?.find((b) => b.id === selectedBrandId);
    const kit = brandKitData?.kit as Record<string, string | null> | null | undefined;
    const logoUrls = brandKitData?.logoUrls;
    return {
      brandName: brand?.name ?? "",
      logoUrl: logoUrls?.darkUrl ?? logoUrls?.lightUrl ?? null,
      primaryColor1: kit?.primary_color_1 ?? "#17cf54",
      primaryColor2: kit?.primary_color_2 ?? "#15b84b",
      secondaryColor1: kit?.secondary_color_1 ?? "#1e293b",
      secondaryColor2: kit?.secondary_color_2 ?? "#334155",
      accentColor1: kit?.accent_color_1 ?? "#facc15",
      accentColor2: kit?.accent_color_2 ?? "#f59e0b",
      typography: kit?.typography ?? "Inter",
    };
  }, [brands, selectedBrandId, brandKitData]);

  // ── UI state ────────────────────────────────────────────────────
  const [detailAd, setDetailAd] = useState<SavedAd | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [productFilter, setProductFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Content adaptation state
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAdaptPanel, setShowAdaptPanel] = useState(false);
  const [productContextForAdapt, setProductContextForAdapt] =
    useState<ProductDataForAdapt | null>(null);
  const [adaptLanguage, setAdaptLanguage] = useState("en-US");

  // Track which individual paths are currently being deleted (for spinner UI)
  const [deletingPaths, setDeletingPaths] = useState<Set<string>>(new Set());

  // ── Actions ──────────────────────────────────────────────────────
  function handleDelete(ad: SavedAd) {
    if (deletingPaths.has(ad.storagePath)) return;
    setDeletingPaths((prev) => new Set(prev).add(ad.storagePath));
    deleteAdsMutation.mutate([ad.storagePath], {
      onSuccess: () => {
        setSelectedPaths((prev) => {
          const next = new Set(prev);
          next.delete(ad.storagePath);
          return next;
        });
        if (detailAd?.storagePath === ad.storagePath) {
          setDetailAd(null);
        }
      },
      onSettled: () => {
        setDeletingPaths((prev) => {
          const next = new Set(prev);
          next.delete(ad.storagePath);
          return next;
        });
      },
    });
  }

  function handleDownload(ad: SavedAd) {
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(ad.publicUrl)}&filename=${encodeURIComponent(ad.name)}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = ad.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Selection ────────────────────────────────────────────────────
  function toggleSelect(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function selectAll() {
    if (selectedPaths.size === filteredAds.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredAds.map((a) => a.storagePath)));
    }
  }

  function clearSelection() {
    setSelectedPaths(new Set());
  }

  // ── Bulk Actions ─────────────────────────────────────────────────
  function handleBulkDelete() {
    if (deleteAdsMutation.isPending || selectedPaths.size === 0) return;
    const paths = Array.from(selectedPaths);
    deleteAdsMutation.mutate(paths, {
      onSuccess: () => {
        if (detailAd && paths.includes(detailAd.storagePath)) {
          setDetailAd(null);
        }
        setSelectedPaths(new Set());
      },
    });
  }

  async function handleBulkDownload() {
    if (isBulkDownloading || selectedPaths.size === 0) return;
    setIsBulkDownloading(true);
    const selected = ads.filter((a) => selectedPaths.has(a.storagePath));
    for (const ad of selected) {
      handleDownload(ad);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setIsBulkDownloading(false);
  }

  // ── Derive product IDs that have saved ads ──────────────────────
  const productIdsWithAds = useMemo(() => {
    const ids = new Set<string>();
    for (const ad of ads) {
      if (ad.productId) ids.add(ad.productId);
    }
    return ids;
  }, [ads]);

  // Map product IDs to display names
  const productIdToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.id, product.name);
    }
    return map;
  }, [products]);

  // Has any ad without a product tag (legacy/untagged)
  const hasUntaggedAds = useMemo(
    () => ads.some((ad) => !ad.productId),
    [ads],
  );

  // ── Filter, Sort & Group ─────────────────────────────────────────
  const filteredAds = useMemo(() => {
    let result = ads;

    // Product filter (by product ID from saved_ads table)
    if (productFilter !== "all") {
      if (productFilter === "untagged") {
        result = result.filter((ad) => !ad.productId);
      } else {
        result = result.filter((ad) => ad.productId === productFilter);
      }
    }

    // Date filter
    if (dateFilter !== "all") {
      result = result.filter((ad) => matchesDateFilter(ad.name, dateFilter));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ad) =>
          ad.name.toLowerCase().includes(q) ||
          formatDate(ad.name).toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortOrder === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [ads, searchQuery, dateFilter, sortOrder, productFilter]);

  // ── Pagination ──────────────────────────────────────────────────
  const ADS_PER_PAGE = 200;
  const totalPages = Math.max(1, Math.ceil(filteredAds.length / ADS_PER_PAGE));
  const needsPagination = filteredAds.length > ADS_PER_PAGE;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, sortOrder, productFilter]);

  // Clamp page if filtered results shrink (e.g. after delete)
  const safePage = Math.min(currentPage, totalPages);
  const pageAds = useMemo(() => {
    const start = (safePage - 1) * ADS_PER_PAGE;
    return filteredAds.slice(start, start + ADS_PER_PAGE);
  }, [filteredAds, safePage]);

  const groupedAds = useMemo(() => groupAdsByDate(pageAds, dateFilter), [pageAds, dateFilter]);
  const isSelecting = selectedPaths.size > 0;
  const activeFilterCount = (dateFilter !== "all" ? 1 : 0) + (productFilter !== "all" ? 1 : 0);

  // Map raw group labels from getDateGroup to translated strings
  const dateGroupLabels: Record<string, string> = {
    "Today": t.library.today,
    "Yesterday": t.library.yesterday,
    "This Week": t.library.thisWeek,
    "This Month": t.library.thisMonth,
    "Last Month": t.library.lastMonth,
  };
  function translateGroupLabel(label: string): string {
    return dateGroupLabels[label] ?? label;
  }

  function goToPage(page: number) {
    setCurrentPage(page);
    // Scroll to top of the content area
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── No Brand ─────────────────────────────────────────────────────
  if (!selectedBrandId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-background-elevated flex items-center justify-center mb-5">
          <Bookmark className="h-9 w-9 text-foreground-subtle" />
        </div>
        <p className="text-foreground font-bold text-lg">No brand selected</p>
        <p className="text-foreground-subtle text-sm mt-1 max-w-xs">
          Select a client and brand from the header to view your saved ad creatives.
        </p>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 w-36 bg-background-elevated rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-background-elevated rounded-lg animate-pulse" />
          </div>
          <div className="h-9 w-48 bg-background-elevated rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="bg-background-elevated rounded-2xl border border-border-subtle overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-background-elevated" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-background-elevated rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────
  if (ads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-primary/60" />
        </div>
        <p className="text-foreground font-bold text-xl">Your library is empty</p>
        <p className="text-foreground-subtle text-sm mt-2 max-w-sm leading-relaxed">
          Generate ads from the Home or Stealth Ads page and save them to build your creative library.
        </p>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.library.title}</h1>
            <p className="text-foreground-subtle text-sm mt-0.5">
              {ads.length} {ads.length !== 1 ? t.library.creatives : t.library.creative} saved
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.library.search}
                className="pl-9 pr-3 py-2 w-44 rounded-lg border border-border bg-background-elevated text-xs text-foreground-muted placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-shadow"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-background-elevated rounded"
                >
                  <X className="h-3 w-3 text-foreground-subtle" />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  activeFilterCount > 0
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border bg-background-elevated text-foreground-muted hover:bg-background-subtle"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                {dateFilter === "all" ? t.library.filter : DATE_FILTER_LABELS[dateFilter]}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-44 bg-background-elevated border border-border rounded-xl shadow-lg py-1 z-50">
                    {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setDateFilter(key);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                          dateFilter === key
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground-muted hover:bg-background-subtle"
                        }`}
                      >
                        {DATE_FILTER_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Product Filter */}
            {(products.length > 0 || productIdsWithAds.size > 0) && (
              <div className="relative">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className={`appearance-none pl-7 pr-7 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    productFilter !== "all"
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border bg-background-elevated text-foreground-muted hover:bg-background-subtle"
                  }`}
                >
                  <option value="all">All Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{productIdsWithAds.has(p.id) ? "" : " (0)"}
                    </option>
                  ))}
                  {hasUntaggedAds && <option value="untagged">Untagged</option>}
                </select>
                <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-subtle pointer-events-none" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-foreground-subtle pointer-events-none" />
              </div>
            )}

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background-elevated text-xs font-medium text-foreground-muted hover:bg-background-subtle transition-colors"
              title={sortOrder === "newest" ? t.library.newestFirst : t.library.oldestFirst}
            >
              {sortOrder === "newest" ? (
                <ArrowDownAZ className="h-3.5 w-3.5" />
              ) : (
                <ArrowUpAZ className="h-3.5 w-3.5" />
              )}
              {sortOrder === "newest" ? t.library.newest : t.library.oldest}
            </button>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background-elevated text-foreground-subtle hover:text-foreground-muted"}`}
                title={t.library.gridView}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background-elevated text-foreground-subtle hover:text-foreground-muted"}`}
                title={t.library.listView}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        {isSelecting && (
          <div className="flex items-center gap-3 mb-5 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {selectedPaths.size === filteredAds.length ? t.library.deselectAll : t.library.selectAll}
            </button>
            <span className="text-xs text-foreground-muted">
              {selectedPaths.size} {t.library.selectedCount}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => void handleBulkDownload()}
              disabled={isBulkDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-elevated border border-border text-xs font-semibold text-foreground-muted hover:bg-background-subtle transition-colors disabled:opacity-50"
            >
              {isBulkDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download
            </button>
            <button
              type="button"
              onClick={() => setShowProductSelector(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {t.workspace.adaptContent}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleteAdsMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
            >
              {deleteAdsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="p-1.5 hover:bg-background-elevated rounded-lg transition-colors"
              title={t.library.clearSelection}
            >
              <X className="h-4 w-4 text-foreground-subtle" />
            </button>
          </div>
        )}

        {/* No results */}
        {filteredAds.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <XCircle className="h-10 w-10 text-foreground-subtle mb-3" />
            <p className="text-foreground-muted text-sm">
              {t.library.noAdsMatch} &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" &&
          groupedAds.map((group) => (
            <div key={group.label} className="mb-8 last:mb-0">
              <div className="flex items-center gap-2.5 mb-4">
                <Calendar className="h-4.5 w-4.5 text-foreground-muted" />
                <h2 className="text-sm font-extrabold text-foreground-muted uppercase tracking-wider">
                  {translateGroupLabel(group.label)}
                </h2>
                <span className="text-sm text-foreground-subtle font-medium">
                  ({group.ads.length})
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {group.ads.map((ad) => (
                  <GridCard
                    key={ad.storagePath}
                    ad={ad}
                    isSelected={selectedPaths.has(ad.storagePath)}
                    isSelecting={isSelecting}
                    isDeleting={deletingPaths.has(ad.storagePath)}
                    onView={() => setDetailAd(ad)}
                    onSelect={() => toggleSelect(ad.storagePath)}
                    onDownload={() => handleDownload(ad)}
                    onDelete={() => handleDelete(ad)}
                  />
                ))}
              </div>
            </div>
          ))}

        {/* List View */}
        {viewMode === "list" &&
          groupedAds.map((group) => (
            <div key={group.label} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2.5 mb-3">
                <Calendar className="h-4.5 w-4.5 text-foreground-muted" />
                <h2 className="text-sm font-extrabold text-foreground-muted uppercase tracking-wider">
                  {translateGroupLabel(group.label)}
                </h2>
                <span className="text-sm text-foreground-subtle font-medium">
                  ({group.ads.length})
                </span>
              </div>
              <div className="bg-background-elevated rounded-xl border border-border divide-y divide-border overflow-hidden">
                {group.ads.map((ad) => (
                  <ListRow
                    key={ad.storagePath}
                    ad={ad}
                    isSelected={selectedPaths.has(ad.storagePath)}
                    isDeleting={deletingPaths.has(ad.storagePath)}
                    onView={() => setDetailAd(ad)}
                    onSelect={() => toggleSelect(ad.storagePath)}
                    onDownload={() => handleDownload(ad)}
                    onDelete={() => handleDelete(ad)}
                  />
                ))}
              </div>
            </div>
          ))}

        {/* Pagination */}
        {needsPagination && (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage <= 1}
              className="p-2 rounded-lg border border-border bg-background-elevated text-foreground-muted hover:bg-background-subtle transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`min-w-[36px] h-9 rounded-lg text-sm font-semibold transition-colors ${
                  page === safePage
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background-elevated text-foreground-muted hover:bg-background-subtle"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="p-2 rounded-lg border border-border bg-background-elevated text-foreground-muted hover:bg-background-subtle transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-xs text-foreground-subtle ml-2">
              {(safePage - 1) * ADS_PER_PAGE + 1}–{Math.min(safePage * ADS_PER_PAGE, filteredAds.length)} of {filteredAds.length}
            </span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailAd && (
        <DetailModal
          ad={detailAd}
          isDeleting={deletingPaths.has(detailAd.storagePath)}
          brandContext={brandContext}
          brandId={selectedBrandId}
          products={products}
          defaultProductId={productFilter !== "all" && productFilter !== "untagged" ? productFilter : undefined}
          onClose={() => setDetailAd(null)}
          onDownload={() => handleDownload(detailAd)}
          onDelete={() => handleDelete(detailAd)}
          onEditResult={(editedAd) => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.library.list(selectedBrandId!) });
            setDetailAd(editedAd);
          }}
        />
      )}

      {/* Product Context Selector — step 1 of content adaptation */}
      {showProductSelector && (
        <ProductContextSelector
          products={products}
          onConfirm={(productData, lang) => {
            setProductContextForAdapt(productData);
            setAdaptLanguage(lang);
            setShowProductSelector(false);
            setShowAdaptPanel(true);
          }}
          onClose={() => setShowProductSelector(false)}
        />
      )}

      {/* Content Adapt Panel — step 2 */}
      {showAdaptPanel && productContextForAdapt && (
        <ContentAdaptPanel
          items={ads
            .filter((a) => selectedPaths.has(a.storagePath))
            .map((a) => ({
              imageUrl: a.publicUrl,
              identifier: a.storagePath,
              label: a.name,
            }))}
          mode="vision"
          productData={productContextForAdapt}
          language={adaptLanguage}
          onClose={() => {
            setShowAdaptPanel(false);
            setProductContextForAdapt(null);
          }}
        />
      )}
    </>
  );
}

// ─── Grid Card ───────────────────────────────────────────────────────────────

interface GridCardProps {
  ad: SavedAd;
  isSelected: boolean;
  isSelecting: boolean;
  isDeleting: boolean;
  onView: () => void;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function GridCard({
  ad,
  isSelected,
  isSelecting,
  isDeleting,
  onView,
  onSelect,
  onDownload,
  onDelete,
}: GridCardProps) {
  return (
    <div
      className={`relative cursor-pointer overflow-hidden rounded-2xl group transition-all duration-300 ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
          : "border border-border-strong/20 hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(262_83%_65%/0.1)] hover:-translate-y-0.5"
      }`}
    >
      {/* Select checkbox (top-left) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
          isSelected
            ? "bg-primary border-primary text-white"
            : isSelecting
              ? "bg-white/90 border-border-strong text-transparent hover:border-primary"
              : "bg-white/90 border-border-strong text-transparent opacity-0 group-hover:opacity-100"
        }`}
      >
        <Check className="h-3.5 w-3.5" />
      </button>

      {/* Image */}
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onView(); }}
        className="block w-full aspect-square relative bg-background-elevated cursor-pointer overflow-hidden"
      >
        <Image
          src={ad.publicUrl}
          alt={ad.name}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
          unoptimized
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
          <span className="text-white text-[11px] font-medium">
            {formatShortDate(ad.name)}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors flex items-center justify-center"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-rose-500/80 transition-colors flex items-center justify-center disabled:opacity-50"
              title="Delete"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List Row ────────────────────────────────────────────────────────────────

interface ListRowProps {
  ad: SavedAd;
  isSelected: boolean;
  isDeleting: boolean;
  onView: () => void;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function ListRow({
  ad,
  isSelected,
  isDeleting,
  onView,
  onSelect,
  onDownload,
  onDelete,
}: ListRowProps) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 hover:bg-background-subtle transition-colors ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onSelect}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
          isSelected
            ? "bg-primary border-primary text-white"
            : "border-border-strong text-transparent hover:border-primary"
        }`}
      >
        <Check className="h-3 w-3" />
      </button>

      {/* Thumbnail */}
      <button
        type="button"
        onClick={onView}
        className="w-14 h-14 rounded-lg overflow-hidden bg-background-elevated shrink-0 relative cursor-pointer"
      >
        <Image
          src={ad.publicUrl}
          alt={ad.name}
          fill
          loading="lazy"
          className="object-cover"
          sizes="56px"
          unoptimized
        />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onView}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block text-left"
        >
          {ad.name}
        </button>
        <p className="text-xs text-foreground-subtle mt-0.5">{formatDate(ad.name)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onDownload}
          className="p-2 rounded-lg hover:bg-background-elevated text-foreground-subtle hover:text-foreground-muted transition-colors"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg hover:bg-rose-500/10 text-foreground-subtle hover:text-rose-400 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

interface DetailModalProps {
  ad: SavedAd;
  isDeleting: boolean;
  brandContext: BrandContext;
  brandId: string;
  products: BrandProduct[];
  defaultProductId?: string;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onEditResult: (editedAd: SavedAd) => void;
}

function DetailModal({
  ad,
  isDeleting,
  brandContext,
  brandId,
  products,
  defaultProductId,
  onClose,
  onDownload,
  onDelete,
  onEditResult,
}: DetailModalProps) {
  const { t } = useT();
  const [editPrompt, setEditPrompt] = useState("");
  const [editImages, setEditImages] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Auto-select: ad's own productId → active filter → single product → empty
  const [selectedProductId, setSelectedProductId] = useState(
    ad.productId ?? defaultProductId ?? (products.length === 1 ? products[0].id : ""),
  );
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Merge product colors over brand colors when a product is selected
  const effectiveBrandContext = useMemo(() => {
    if (!selectedProduct) return brandContext;
    return {
      ...brandContext,
      ...(selectedProduct.primary_color_1 && { primaryColor1: selectedProduct.primary_color_1 }),
      ...(selectedProduct.primary_color_2 && { primaryColor2: selectedProduct.primary_color_2 }),
      ...(selectedProduct.secondary_color_1 && { secondaryColor1: selectedProduct.secondary_color_1 }),
      ...(selectedProduct.secondary_color_2 && { secondaryColor2: selectedProduct.secondary_color_2 }),
      ...(selectedProduct.accent_color_1 && { accentColor1: selectedProduct.accent_color_1 }),
      ...(selectedProduct.accent_color_2 && { accentColor2: selectedProduct.accent_color_2 }),
    };
  }, [brandContext, selectedProduct]);

  // Track edited image for preview + retry save
  const [editedPreviewUrl, setEditedPreviewUrl] = useState<string | null>(null);
  const [editedKieTempUrl, setEditedKieTempUrl] = useState<string | null>(null);
  const [editedPromptText, setEditedPromptText] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isEditing) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, isEditing]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !isEditing) onClose();
  }

  function handleEditImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setEditImages((prev) => [...prev, ...newFiles].slice(0, 4));
    e.target.value = "";
  }

  function handleEditImageRemove(index: number) {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function saveEditedImage(imageUrl: string, promptText: string) {
    setIsSaving(true);
    setSaveStatus("saving");
    setEditError(null);
    try {
      const saveRes = await fetch("/api/save-ad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          prompt: promptText,
          headline: `Edited — ${ad.name}`,
          concept: "edit",
          market: "",
          brandId,
          productId: selectedProductId || null,
          productName: selectedProduct?.name ?? "",
          source: "workspace",
        }),
      });

      const saveJson = (await saveRes.json()) as {
        success?: boolean;
        storagePath?: string;
        permanentUrl?: string;
        error?: string;
      };

      if (saveJson.success && saveJson.permanentUrl) {
        const editedAd: SavedAd = {
          name: saveJson.storagePath?.split("/").pop() ?? `${Date.now()}.jpg`,
          storagePath: saveJson.storagePath ?? "",
          publicUrl: saveJson.permanentUrl,
          createdAt: new Date().toISOString(),
          productId: selectedProductId || null,
          headline: `Edited — ${ad.name}`,
          concept: "edit",
          source: "workspace",
        };
        setSaveStatus("saved");
        setEditedPreviewUrl(saveJson.permanentUrl);
        setEditedKieTempUrl(null);
        setEditPrompt("");
        setEditImages([]);
        onEditResult(editedAd);
      } else {
        setSaveStatus("failed");
        setEditError(saveJson.error ?? "Failed to save — click Save to retry");
      }
    } catch (err) {
      setSaveStatus("failed");
      setEditError(err instanceof Error ? err.message : "Network error — click Save to retry");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditSubmit() {
    if (!editPrompt.trim() || isEditing) return;

    setIsEditing(true);
    setEditError(null);
    setSaveStatus("idle");

    try {
      const additionalImageUrls = await Promise.all(
        editImages.map((f) => fileToDataUrl(f)),
      );

      const res = await fetch("/api/edit-ad", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          originalImageUrl: ad.publicUrl,
          editPrompt: editPrompt.trim(),
          originalPrompt: "",
          brandContext: effectiveBrandContext,
          productContext: {
            productName: selectedProduct?.name ?? "",
            productDescription: selectedProduct?.description ?? null,
            productImages: selectedProduct?.images ?? [],
          },
          additionalImages:
            additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
        }),
      });

      const json = (await res.json()) as {
        success: boolean;
        imageUrl?: string;
        taskId?: string;
        prompt?: string;
        error?: string;
      };

      if (json.success && json.imageUrl) {
        // Show edited image immediately in preview
        setEditedPreviewUrl(json.imageUrl);
        setEditedKieTempUrl(json.imageUrl);
        setEditedPromptText(json.prompt ?? editPrompt.trim());
        setIsEditing(false);

        // Auto-save to Supabase Storage
        await saveEditedImage(json.imageUrl, json.prompt ?? editPrompt.trim());
      } else {
        setEditError(json.error ?? "Edit failed");
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsEditing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 !m-0"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-background-elevated rounded-2xl shadow-2xl w-full max-w-[1060px] flex max-h-[90vh] overflow-hidden">
        {/* Left — Image Preview */}
        <div className="flex-1 bg-background-elevated flex items-center justify-center p-6 min-w-0 relative">
          <div className="relative w-full h-full max-h-[75vh]">
            <Image
              src={editedPreviewUrl ?? ad.publicUrl}
              alt={ad.name}
              fill
              className="object-contain rounded-lg"
              sizes="(max-width: 768px) 100vw, 680px"
              unoptimized
            />
          </div>
          {isEditing && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-3 bg-black/70 text-white px-5 py-3 rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-semibold">
                  {t.workspace.generatingEdited}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right — Details Panel */}
        <div className="w-[380px] shrink-0 flex flex-col border-l border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-black text-foreground">{t.library.adDetails}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-background-elevated rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-foreground-subtle" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Product Selector for Edit */}
            {products.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3 w-3" />
                    {t.library.productReference}
                  </span>
                </label>
                <ProductDropdown
                  products={products}
                  selectedProductId={selectedProductId}
                  onProductChange={setSelectedProductId}
                  placeholder="No product"
                  disabled={isEditing}
                  compact
                />
                <p className="text-[10px] text-foreground-subtle mt-1">
                  {t.library.selectProduct}
                </p>
              </div>
            )}

            {/* Edit Prompt Section */}
            <div>
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.editThisAd}
              </label>
              <p className="text-[11px] text-foreground-subtle mb-2">
                {t.workspace.editDescription}
              </p>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder='e.g. "Change headline text" or "Add brand logo in top-right" or "Make background darker"'
                className="w-full h-[80px] px-3 py-2.5 rounded-lg border border-border bg-background-subtle text-xs text-foreground-muted placeholder:text-foreground-subtle resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                disabled={isEditing}
              />

              {/* Image upload area */}
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-[10px] text-foreground-subtle">
                    {t.workspace.attachImages}
                  </label>
                  {editImages.length < 4 && (
                    <label className="cursor-pointer text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
                      <Plus className="h-3 w-3" />
                      {t.workspace.add}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditImageAdd}
                        className="hidden"
                        disabled={isEditing}
                      />
                    </label>
                  )}
                </div>
                {editImages.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {editImages.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="relative w-14 h-14 rounded-lg border border-border overflow-hidden group/img"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditImageRemove(idx)}
                          className="absolute top-0 right-0 p-0.5 bg-black/60 rounded-bl-md opacity-0 group-hover/img:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {editError && (
                <p className="text-[11px] text-rose-500 mt-1.5">{editError}</p>
              )}
              <button
                type="button"
                onClick={() => void handleEditSubmit()}
                disabled={!editPrompt.trim() || isEditing}
                className="w-full mt-2 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.workspace.generating}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    {t.workspace.applyEdit}
                  </>
                )}
              </button>
            </div>

            {/* Status + Save retry */}
            {saveStatus === "failed" && editedKieTempUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg">
                  <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-[11px] text-amber-700 font-medium">
                    {t.library.editedNotSaved}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (editedKieTempUrl && editedPromptText) {
                      void saveEditedImage(editedKieTempUrl, editedPromptText);
                    }
                  }}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t.workspace.saving}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      {t.workspace.saveToLibrary}
                    </>
                  )}
                </button>
              </div>
            )}
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span className="text-xs font-semibold text-primary">{t.workspace.savingToLibrary}</span>
              </div>
            )}
            {(saveStatus === "saved" || (saveStatus === "idle" && !editedKieTempUrl)) && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">{t.workspace.savedToLibrary}</span>
              </div>
            )}

            {/* Info */}
            <div>
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.details}
              </label>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-foreground-subtle">{t.library.created}</span>
                  <span className="text-foreground-muted font-medium">
                    {formatDate(ad.name)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground-subtle">{t.library.filename}</span>
                  <span className="text-foreground-muted font-medium truncate max-w-[180px]">
                    {ad.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground-subtle">{t.library.format}</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full uppercase">
                    {ad.name.split(".").pop()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={onDownload}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                {t.workspace.downloadImage}
              </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-3 border-t border-border-subtle">
              <label className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider block mb-2">
                {t.workspace.dangerZone}
              </label>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="w-full py-2 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {t.library.deleteFromLibrary}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

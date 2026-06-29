"use client";
// Client Component: main dashboard layout with collapsible sidebar navigation + i18n

import { useApp } from "@/features/app/context";
import { useAuth } from "@/features/auth/context";
import { isAdmin } from "@/features/auth/types";
import { useT } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import {
  BookOpen,
  ChevronDown,
  EyeOff,
  Film,
  FolderOpen,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  Mic,
  MoreHorizontal,
  Music,
  Palette,
  Pencil,
  Plus,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBrands, useCreateBrand, useRenameBrand, useDeleteBrand } from "@/hooks/api/useBrands";

const SIDEBAR_STORAGE_KEY_PREFIX = "sidebar-open-";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath: string;
}

type ModalState =
  | { type: "new" }
  | { type: "rename"; brandId: string; currentName: string }
  | { type: "delete"; brandId: string; brandName: string }
  | null;

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  match: (path: string) => boolean;
}

interface NavSection {
  key: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
}

interface SidebarNavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

function SidebarNavLink({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: SidebarNavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
        isActive
          ? "bg-primary/10 font-semibold text-primary"
          : "text-foreground-muted hover:bg-black/[0.04] hover:text-foreground"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
          isActive
            ? "bg-primary/15 shadow-sm shadow-primary/10"
            : "bg-background-elevated/50 group-hover:bg-background-elevated"
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-foreground-subtle group-hover:text-foreground-muted"}`} />
      </div>
      <span>{label}</span>
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(262_83%_65%/0.6)]" />
      )}
    </Link>
  );
}

interface SidebarSectionProps {
  sectionKey: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
  activePath: string;
  onItemClick?: () => void;
}

function SidebarSection({
  sectionKey,
  label,
  defaultOpen,
  items,
  activePath,
  onItemClick,
}: SidebarSectionProps) {
  const storageKey = `${SIDEBAR_STORAGE_KEY_PREFIX}${sectionKey}`;
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setIsOpen(stored === "true");
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  function handleToggle() {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // ignore storage quota / privacy errors
    }
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={handleToggle}
        className="group flex w-full items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle/70 transition-colors hover:text-foreground-muted"
      >
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
            isOpen ? "" : "-rotate-90"
          }`}
        />
        {label}
      </button>
      {isOpen && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={item.match(activePath)}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Brand modal (create / rename) ── */
function BrandModal({
  mode,
  initialName,
  onClose,
  onSave,
}: {
  mode: "new" | "rename";
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const { t } = useT();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          {mode === "new" ? t.nav.newBrand : t.nav.rename}
        </h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.nav.brandSelector}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            {t.workspace.cancel}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "new" ? t.nav.newBrand : t.nav.rename}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Delete confirmation ── */
function DeleteConfirm({
  brandName,
  onClose,
  onConfirm,
}: {
  brandName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useT();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border-strong/30 bg-background-elevated p-6 shadow-2xl"
      >
        <h3 className="mb-2 text-lg font-semibold text-foreground">{t.nav.delete}</h3>
        <p className="mb-5 text-sm text-foreground-muted">
          {`"${brandName}"`}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            {t.workspace.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="cursor-pointer rounded-lg bg-danger px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.nav.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main layout ── */
export function DashboardLayout({ children, activePath }: DashboardLayoutProps) {
  const { selectedBrandId, setSelectedBrandId } = useApp();
  const { profile, loading: authLoading, signOut } = useAuth();
  const { t } = useT();
  const { data: brands = [], isLoading: loading } = useBrands();
  const createBrand = useCreateBrand();
  const renameBrand = useRenameBrand();
  const deleteBrand = useDeleteBrand();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brandActionsOpen, setBrandActionsOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId, setSelectedBrandId]);

  useEffect(() => {
    if (!dropdownOpen && !userMenuOpen && !brandActionsOpen) return;
    function handleClick() {
      setDropdownOpen(false);
      setUserMenuOpen(false);
      setBrandActionsOpen(false);
    }
    const id = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => { clearTimeout(id); document.removeEventListener("click", handleClick); };
  }, [dropdownOpen, userMenuOpen, brandActionsOpen]);

  async function handleCreateBrand(name: string) {
    const { brand } = await createBrand.mutateAsync(name);
    setSelectedBrandId(brand.id);
    setModal(null);
  }

  async function handleRenameBrand(brandId: string, name: string) {
    await renameBrand.mutateAsync({ brandId, name });
    setModal(null);
  }

  async function handleDeleteBrand(brandId: string) {
    await deleteBrand.mutateAsync(brandId);
    if (selectedBrandId === brandId) setSelectedBrandId(null);
    setModal(null);
  }

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  const userInitials = profile
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const NAV_SECTIONS: NavSection[] = [
    {
      key: "image",
      label: t.nav.imageSection,
      defaultOpen: true,
      items: [
        {
          href: "/app",
          icon: Sparkles,
          label: t.nav.createAds,
          match: (p) => p === "/app",
        },
        {
          href: "/app/stealth-ads",
          icon: EyeOff,
          label: t.nav.stealth,
          match: (p) => p === "/app/stealth-ads",
        },
        {
          href: "/app/library",
          icon: FolderOpen,
          label: t.nav.library,
          match: (p) => p === "/app/library",
        },
      ],
    },
    {
      key: "video",
      label: t.nav.videoSection,
      defaultOpen: true,
      items: [
        {
          href: "/app/video",
          icon: Film,
          label: t.nav.competitorVideos,
          match: (p) =>
            p === "/app/video" ||
            (p.startsWith("/app/video/") &&
              p !== "/app/video/audio" &&
              p !== "/app/video/voice-config"),
        },
        {
          href: "/app/video/audio",
          icon: Music,
          label: t.nav.audioLibrary,
          match: (p) => p === "/app/video/audio",
        },
        {
          href: "/app/video/voice-config",
          icon: Mic,
          label: t.nav.voiceConfig,
          match: (p) => p === "/app/video/voice-config",
        },
      ],
    },
    {
      key: "setup",
      label: t.nav.setupSection,
      defaultOpen: false,
      items: [
        {
          href: "/app/brands",
          icon: Palette,
          label: t.nav.brand,
          match: (p) => p === "/app/brands",
        },
        {
          href: "/app/concepts",
          icon: Lightbulb,
          label: t.nav.concepts,
          match: (p) => p === "/app/concepts",
        },
        {
          href: "/app/settings",
          icon: Settings,
          label: t.nav.settings,
          match: (p) => p === "/app/settings",
        },
      ],
    },
  ];

  const sidebarContent = (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-16 -right-8 h-24 w-24 rounded-full bg-violet-500/[0.03] blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative flex h-16 items-center gap-3 border-b border-border/40 px-5">
        <Link href="/app" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-dark.svg" alt="Ladospice" className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight text-foreground">Ladospice</span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto cursor-pointer rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-black/[0.05] hover:text-foreground lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-3">
          {NAV_SECTIONS.map((section) => (
            <SidebarSection
              key={section.key}
              sectionKey={section.key}
              label={section.label}
              defaultOpen={section.defaultOpen}
              items={section.items}
              activePath={activePath}
              onItemClick={() => setSidebarOpen(false)}
            />
          ))}
        </div>

        {/* Account section — always visible, not collapsible */}
        <div className="mt-6">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle/70">
            {t.nav.account}
          </p>
          <div className="space-y-0.5">
            <SidebarNavLink
              href="/app/guide"
              icon={BookOpen}
              label={t.nav.guide}
              isActive={activePath === "/app/guide"}
              onClick={() => setSidebarOpen(false)}
            />
            {profile && isAdmin(profile.role) && (
              <SidebarNavLink
                href="/app/admin"
                icon={ShieldAlert}
                label={t.nav.admin}
                isActive={activePath === "/app/admin"}
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Brand selector */}
        <div className="mt-6">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle/70">
            {t.nav.brandSelector}
          </p>
          <div className="relative px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
                className="flex h-9 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border/40 bg-background-elevated/30 px-3 text-sm font-medium text-foreground-muted transition-colors duration-200 hover:bg-black/[0.04] hover:text-foreground"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-subtle" />
                ) : (
                  <span className="flex-1 truncate text-left">
                    {selectedBrand ? selectedBrand.name : t.nav.brandSelector}
                  </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-foreground-subtle transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setBrandActionsOpen((o) => !o); }}
                disabled={!selectedBrandId}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border/40 bg-background-elevated/30 transition-colors duration-200 hover:bg-black/[0.04] disabled:opacity-30"
                title={t.nav.brandActions}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-foreground-subtle" />
              </button>
            </div>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-border-strong/50 bg-background-elevated py-1 shadow-2xl">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => { setSelectedBrandId(brand.id); setDropdownOpen(false); }}
                    className={`w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors duration-200 ${
                      brand.id === selectedBrandId
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground-muted hover:bg-black/[0.05] hover:text-foreground"
                    }`}
                  >
                    {brand.name}
                  </button>
                ))}
                <div className={brands.length > 0 ? "mt-1 border-t border-border pt-1" : ""}>
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); setModal({ type: "new" }); }}
                    className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.nav.newBrand}
                  </button>
                </div>
              </div>
            )}

            {brandActionsOpen && selectedBrand && (
              <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-border-strong/50 bg-background-elevated py-1 shadow-2xl">
                <button
                  type="button"
                  onClick={() => { setBrandActionsOpen(false); setModal({ type: "rename", brandId: selectedBrand.id, currentName: selectedBrand.name }); }}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground-muted hover:bg-black/[0.05] hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5 text-foreground-subtle" />
                  {t.nav.rename}
                </button>
                <button
                  type="button"
                  onClick={() => { setBrandActionsOpen(false); setModal({ type: "delete", brandId: selectedBrand.id, brandName: selectedBrand.name }); }}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.nav.delete}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* User section at bottom */}
      <div className="relative border-t border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-violet-700/30 text-xs font-bold text-primary ring-2 ring-primary/20">
            {authLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {profile?.full_name ?? "User"}
            </p>
            <p className="truncate text-[11px] text-foreground-subtle">
              {profile?.email ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="cursor-pointer rounded-lg p-1.5 text-foreground-subtle transition-colors hover:bg-black/[0.05] hover:text-danger"
            title={t.nav.signOut}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border-strong/20 bg-background-subtle transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/30 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-foreground-muted transition-colors hover:bg-black/[0.05] hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block" />
          <div className="flex-1 lg:hidden" />

          <div className="flex items-center gap-2">
            <LanguageToggle />

            {/* Mobile user menu */}
            <div className="relative lg:hidden">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setUserMenuOpen((o) => !o); }}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-violet-700/30 text-xs font-bold text-primary ring-2 ring-primary/30 transition-all duration-200 hover:ring-primary/50"
                title={profile?.full_name ?? "User"}
              >
                {authLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : userInitials}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border-strong/50 bg-background-elevated py-1 shadow-2xl">
                  {profile && (
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-foreground">{profile.full_name}</p>
                      <p className="truncate text-xs text-foreground-subtle">{profile.email}</p>
                    </div>
                  )}
                  <Link href="/app/guide" onClick={() => setUserMenuOpen(false)} className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground-muted transition-colors hover:bg-black/[0.05] hover:text-foreground">
                    <BookOpen className="h-4 w-4 text-foreground-subtle" />
                    {t.nav.guide}
                  </Link>
                  <Link href="/app/settings" onClick={() => setUserMenuOpen(false)} className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground-muted transition-colors hover:bg-black/[0.05] hover:text-foreground">
                    <Settings className="h-4 w-4 text-foreground-subtle" />
                    {t.nav.settings}
                  </Link>
                  <div className="mt-1 border-t border-border">
                    <button type="button" onClick={() => { setUserMenuOpen(false); void signOut(); }} className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger/5">
                      <LogOut className="h-4 w-4" />
                      {t.nav.signOut}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Modals */}
      {modal?.type === "new" && (
        <BrandModal
          mode="new"
          initialName=""
          onClose={() => setModal(null)}
          onSave={(name) => handleCreateBrand(name)}
        />
      )}
      {modal?.type === "rename" && (
        <BrandModal
          mode="rename"
          initialName={modal.currentName}
          onClose={() => setModal(null)}
          onSave={(name) => handleRenameBrand(modal.brandId, name)}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteConfirm
          brandName={modal.brandName}
          onClose={() => setModal(null)}
          onConfirm={() => handleDeleteBrand(modal.brandId)}
        />
      )}
    </div>
  );
}

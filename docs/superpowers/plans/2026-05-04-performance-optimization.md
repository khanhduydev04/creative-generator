# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Vercel RES from 80 → 90+ by reducing client JS bundle on landing page, deferring third-party scripts, and scoping auth/font loading to app routes only.

**Architecture:** Convert all pure-content landing components from `"use client"` to RSC by reading locale server-side from a cookie. `LanguageToggle` triggers `router.refresh()` so RSC components re-render with new locale. `AuthProvider` moves from root layout to `/app` layout, eliminating an unnecessary API call on public pages.

**Tech Stack:** Next.js 16 App Router, React 19, `next/dynamic`, `React.cache()`, `next/headers` cookies, `sonner` Toaster, `next/font/google`, Vercel Analytics/SpeedInsights

---

## File Map

| File | Action |
|---|---|
| `src/lib/i18n/server.ts` | **Create** — server-only `getServerTranslations()` with `React.cache()` |
| `src/lib/i18n/context.tsx` | **Modify** — write cookie on locale change + add inline hydration script |
| `src/components/ui/LanguageToggle.tsx` | **Modify** — call `router.refresh()` after locale change |
| `src/components/landing/HeroSection.tsx` | **Modify** — remove `"use client"` + `useT()`, accept `t: Dictionary` prop |
| `src/components/landing/StatsSection.tsx` | **Modify** — same |
| `src/components/landing/HowItWorks.tsx` | **Modify** — same |
| `src/components/landing/ByokExplainer.tsx` | **Modify** — same |
| `src/components/landing/CtaSection.tsx` | **Modify** — same |
| `src/components/landing/Footer.tsx` | **Modify** — same |
| `src/components/landing/PublicNavbar.tsx` | **Modify** — same |
| `src/components/landing/ShowcaseSection.tsx` | **Modify** — keep `"use client"`, replace `useT()` with `t: Dictionary` prop |
| `src/components/landing/BentoFeatures.tsx` | **Modify** — keep `"use client"` (IntersectionObserver), replace `useT()` with `t: Dictionary` prop |
| `src/app/page.tsx` | **Modify** — make `async`, call `getServerTranslations()`, use `dynamic()` for below-fold |
| `src/app/layout.tsx` | **Modify** — defer Analytics/SpeedInsights, remove `AuthProvider`, extract `Toaster`, remove `JetBrains_Mono` |
| `src/app/app/layout.tsx` | **Modify** — add `AuthProvider`, add `JetBrains_Mono` font variable |
| `src/app/app/loading.tsx` | **Create** — dashboard skeleton for app routes |
| `src/components/layout/DashboardSkeleton.tsx` | **Create** — skeleton shimmer UI matching DashboardLayout shell |

---

## Task 1: Create i18n Server Bridge

**Files:**
- Create: `src/lib/i18n/server.ts`

- [ ] **Step 1: Create `src/lib/i18n/server.ts`**

```ts
import { cache } from "react";
import { cookies } from "next/headers";
import { vi } from "./vi";
import { en } from "./en";
import type { Dictionary, Locale } from "./types";

export const getServerTranslations = cache(async (): Promise<Dictionary> => {
  const store = await cookies();
  const locale = (store.get("adlance-locale")?.value ?? "vi") as Locale;
  return locale === "en" ? en : vi;
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `server.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/server.ts
git commit -m "feat(i18n): add server-side translation bridge with React.cache"
```

---

## Task 2: Cookie-sync in LocaleProvider + Hydration Script

**Files:**
- Modify: `src/lib/i18n/context.tsx`

- [ ] **Step 1: Update `setLocale` to write cookie and add inline hydration script**

Replace the entire file content:

```tsx
"use client";
// Client Component: manages locale state with localStorage + cookie persistence

import { createContext, useCallback, useEffect, useState } from "react";
import type { Locale } from "./types";
import { DEFAULT_LOCALE } from "./types";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem("adlance-locale");
    if (saved === "vi" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("adlance-locale", l);
    document.cookie = `adlance-locale=${l};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {/* Sync localStorage → cookie before React hydrates to prevent locale flicker */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var l=localStorage.getItem('adlance-locale');if(l)document.cookie='adlance-locale='+l+';path=/;max-age=31536000;SameSite=Lax';}catch(e){}`,
        }}
      />
      {children}
    </LocaleContext.Provider>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/context.tsx
git commit -m "feat(i18n): sync locale to cookie for server-side reading, fix hydration flicker"
```

---

## Task 3: LanguageToggle — add router.refresh()

**Files:**
- Modify: `src/components/ui/LanguageToggle.tsx`

The `LanguageToggle` must call `router.refresh()` after changing locale so Next.js re-fetches RSC components (which will now read the new locale from cookie).

- [ ] **Step 1: Update `LanguageToggle.tsx`**

```tsx
// Client Component: requires i18n context for language switching
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { t, locale, setLocale } = useT();
  const router = useRouter();

  function handleToggle() {
    const next = locale === "vi" ? "en" : "vi";
    setLocale(next);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground-muted transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
      title={locale === "vi" ? t.nav.switchToEnglish : t.nav.switchToVietnamese}
    >
      <Globe className="h-3.5 w-3.5" />
      {locale === "vi" ? "EN" : "VI"}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/LanguageToggle.tsx
git commit -m "feat(i18n): trigger router.refresh on locale change to re-render RSC components"
```

---

## Task 4: Convert Pure Landing Components to RSC

These 7 components only use `useT()` with no other client needs. Remove `"use client"` and `useT()`, add `t: Dictionary` prop.

**Files:**
- Modify: `src/components/landing/HeroSection.tsx`
- Modify: `src/components/landing/StatsSection.tsx`
- Modify: `src/components/landing/HowItWorks.tsx`
- Modify: `src/components/landing/ByokExplainer.tsx`
- Modify: `src/components/landing/CtaSection.tsx`
- Modify: `src/components/landing/Footer.tsx`
- Modify: `src/components/landing/PublicNavbar.tsx`

The pattern is identical for all 7. For each file:
1. Delete the `// Client Component: ...` comment and `"use client";` line
2. Delete `import { useT } from "@/lib/i18n/useTranslation";`
3. Add `import type { Dictionary } from "@/lib/i18n/types";`
4. Add a props interface: `interface [Name]Props { t: Dictionary }`
5. Change the function signature to accept `{ t }: [Name]Props`
6. Delete `const { t } = useT();`

- [ ] **Step 1: Update `HeroSection.tsx`**

Remove lines 1–2 (`// Client Component...` and `"use client";`).
Replace `import { useT } from "@/lib/i18n/useTranslation";` with `import type { Dictionary } from "@/lib/i18n/types";`.
Add interface and update signature:

```tsx
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface HeroSectionProps {
  t: Dictionary;
}

export function HeroSection({ t }: HeroSectionProps) {
  // rest of component unchanged — remove `const { t } = useT();`
```

- [ ] **Step 2: Update `StatsSection.tsx`**

```tsx
import type { Dictionary } from "@/lib/i18n/types";

interface StatsSectionProps {
  t: Dictionary;
}

export function StatsSection({ t }: StatsSectionProps) {
  const STATS = [
    { value: t.stats.freeValue, label: t.stats.freeLabel },
    { value: t.stats.featuresValue, label: t.stats.featuresLabel },
    { value: t.stats.stepsValue, label: t.stats.stepsLabel },
    { value: t.stats.limitValue, label: t.stats.limitLabel },
  ];
  // rest of JSX unchanged
```

- [ ] **Step 3: Update `HowItWorks.tsx`**

```tsx
import { UserPlus, KeyRound, Wand2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface HowItWorksProps {
  t: Dictionary;
}

export function HowItWorks({ t }: HowItWorksProps) {
  // remove const { t } = useT(); rest unchanged
```

- [ ] **Step 4: Update `ByokExplainer.tsx`**

```tsx
import { Shield, KeyRound, Zap } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface ByokExplainerProps {
  t: Dictionary;
}

export function ByokExplainer({ t }: ByokExplainerProps) {
  // remove const { t } = useT(); rest unchanged
```

- [ ] **Step 5: Update `CtaSection.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface CtaSectionProps {
  t: Dictionary;
}

export function CtaSection({ t }: CtaSectionProps) {
  // remove const { t } = useT(); rest unchanged
```

- [ ] **Step 6: Update `Footer.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { BRANDING } from "@/lib/branding";
import type { Dictionary } from "@/lib/i18n/types";

interface FooterProps {
  t: Dictionary;
}

export function Footer({ t }: FooterProps) {
  // remove const { t } = useT(); rest unchanged
```

- [ ] **Step 7: Update `PublicNavbar.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { BRANDING } from "@/lib/branding";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import type { Dictionary } from "@/lib/i18n/types";

interface PublicNavbarProps {
  t: Dictionary;
}

export function PublicNavbar({ t }: PublicNavbarProps) {
  // remove const { t } = useT(); rest unchanged — LanguageToggle stays as-is (client child)
```

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: errors only about `t` prop not passed yet in `page.tsx` — fix in Task 6. Or if errors appear now in these files, fix them.

- [ ] **Step 9: Commit**

```bash
git add src/components/landing/HeroSection.tsx src/components/landing/StatsSection.tsx src/components/landing/HowItWorks.tsx src/components/landing/ByokExplainer.tsx src/components/landing/CtaSection.tsx src/components/landing/Footer.tsx src/components/landing/PublicNavbar.tsx
git commit -m "perf(landing): convert 7 pure-content landing components to RSC"
```

---

## Task 5: Update ShowcaseSection and BentoFeatures

These keep `"use client"` (tab state / IntersectionObserver) but replace `useT()` with `t: Dictionary` prop for consistency with the server-rendered parent.

**Files:**
- Modify: `src/components/landing/ShowcaseSection.tsx`
- Modify: `src/components/landing/BentoFeatures.tsx`

- [ ] **Step 1: Update `ShowcaseSection.tsx`**

Remove `import { useT } from "@/lib/i18n/useTranslation";`.
Add import and props:

```tsx
// Client Component: requires useState for tab switching
"use client";

import { useT } from "@/lib/i18n/useTranslation";
import { useState } from "react";
import { Sparkles, EyeOff, Languages, ArrowRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
```

Wait — `ShowcaseSection` needs `t` to react to locale changes when `LanguageToggle` is clicked (before `router.refresh()` completes). Because `router.refresh()` is async, there's a brief moment where the client-side locale state has changed but the server hasn't re-rendered. To avoid a flash, `ShowcaseSection` should STILL use `useT()` for reactive updates.

Change plan for `ShowcaseSection`: **keep `useT()`**. The `t` prop approach would cause a flash during locale switch.

- [ ] **Step 1: Leave `ShowcaseSection.tsx` unchanged** (it already uses `useT()` correctly for reactive locale updates)

- [ ] **Step 2: Update `BentoFeatures.tsx`**

Same reasoning — `BentoFeatures` also uses `useT()` for reactive locale text. **Leave it unchanged.**

> Note: `ShowcaseSection` and `BentoFeatures` are below the fold and will be lazy-loaded via `next/dynamic` in `page.tsx`. This still reduces their impact on LCP since they don't block initial paint.

- [ ] **Step 3: Commit (no-op if no changes needed)**

```bash
git status
# If no changes, skip commit. ShowcaseSection and BentoFeatures stay as-is.
```

---

## Task 6: Update `src/app/page.tsx`

Make the landing page an `async` server component. Call `getServerTranslations()` and pass `t` to RSC components. Lazy-load below-fold sections with `next/dynamic`.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getServerTranslations } from "@/lib/i18n/server";
import { PublicNavbar } from "@/components/landing/PublicNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";

const ShowcaseSection = dynamic(() =>
  import("@/components/landing/ShowcaseSection").then((m) => m.ShowcaseSection),
);
const BentoFeatures = dynamic(() =>
  import("@/components/landing/BentoFeatures").then((m) => m.BentoFeatures),
);
const HowItWorks = dynamic(() =>
  import("@/components/landing/HowItWorks").then((m) => m.HowItWorks),
);
const ByokExplainer = dynamic(() =>
  import("@/components/landing/ByokExplainer").then((m) => m.ByokExplainer),
);
const CtaSection = dynamic(() =>
  import("@/components/landing/CtaSection").then((m) => m.CtaSection),
);
const Footer = dynamic(() =>
  import("@/components/landing/Footer").then((m) => m.Footer),
);

export const metadata: Metadata = {
  title: {
    absolute:
      "Adlance — Free AI Ad Generator | Create Professional Ads with AI",
  },
  description:
    "Create professional static ads in minutes with AI. Bring your own API keys — completely free. No subscriptions, no hidden fees.",
  openGraph: {
    title: "Adlance — Free AI Ad Generator | Create Professional Ads with AI",
    description:
      "Create professional static ads in minutes with AI. Bring your own API keys — completely free. No subscriptions, no hidden fees.",
    type: "website",
  },
};

export default async function HomePage() {
  const t = await getServerTranslations();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNavbar t={t} />
      <HeroSection t={t} />
      <ShowcaseSection />
      <StatsSection t={t} />
      <BentoFeatures />
      <HowItWorks t={t} />
      <ByokExplainer t={t} />
      <CtaSection t={t} />
      <Footer t={t} />
    </main>
  );
}
```

> `ShowcaseSection` and `BentoFeatures` keep using `useT()` internally so they don't need the `t` prop.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "perf(landing): make page.tsx async RSC, lazy-load below-fold sections"
```

---

## Task 7: Defer Analytics/SpeedInsights + Remove JetBrains_Mono from Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx`**

Replace the file:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context";
import { AppProvider } from "@/features/app/context";
import { LocaleProvider } from "@/lib/i18n/context";
import { QueryProvider } from "@/lib/query/provider";
import { BRANDING } from "@/lib/branding";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { Toaster } from "sonner";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((m) => m.Analytics),
  { ssr: false },
);

const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: BRANDING.appName, template: `%s | ${BRANDING.appName}` },
  description: BRANDING.appDescription,
  openGraph: {
    title: BRANDING.appName,
    description: BRANDING.appDescription,
    type: "website",
    images: [
      {
        url: BRANDING.socialPreview,
        width: 1200,
        height: 630,
        alt: BRANDING.appName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRANDING.appName,
    description: BRANDING.appDescription,
    images: [BRANDING.socialPreview],
  },
  icons: {
    icon: BRANDING.favicon,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="vi"
      className={`dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <LocaleProvider>
            <AuthProvider>
              <AppProvider>
                {children}
                <PageViewTracker />
                <Toaster richColors position="top-right" />
                <SpeedInsights />
                <Analytics />
              </AppProvider>
            </AuthProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

> `JetBrains_Mono` removed from root. `Toaster` added directly here so login/signup pages still show toasts (currently it lives inside `AuthProvider` — it will be extracted in Task 8 Step 1). `AuthProvider` intentionally kept in root layout for this task — it moves to app layout in Task 8.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "perf(layout): defer SpeedInsights/Analytics, remove JetBrains_Mono from root"
```

---

## Task 8: Scope AuthProvider to App Routes

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/app/layout.tsx`

`AuthProvider` fires `fetch("/api/user/me")` on mount. It belongs only in the `/app` subtree.

**Important:** `Toaster` is currently rendered inside `AuthProvider` (in `src/features/auth/context.tsx`). We already moved `Toaster` to root layout in Task 7. Now we also need to remove the `Toaster` that's inside `AuthProvider`.

- [ ] **Step 1: Remove `Toaster` from `AuthProvider` in `src/features/auth/context.tsx`**

Open `src/features/auth/context.tsx`. Find the `return` block of `AuthProvider`. Remove `<Toaster richColors position="top-right" />` from inside it:

```tsx
return (
  <AuthContext.Provider
    value={{ profile, loading, signOut, refreshProfile: loadProfile }}
  >
    {children}
    {/* Toaster moved to root layout */}
  </AuthContext.Provider>
);
```

Also remove the `import { Toaster } from "sonner";` line if it's only used for the removed Toaster.

- [ ] **Step 2: Remove `AuthProvider` from root layout**

In `src/app/layout.tsx`, remove the `import { AuthProvider }` line and the `<AuthProvider>` wrapper. The final layout body becomes:

```tsx
<body className="min-h-screen bg-background font-sans antialiased">
  <QueryProvider>
    <LocaleProvider>
      <AppProvider>
        {children}
        <PageViewTracker />
        <Toaster richColors position="top-right" />
        <SpeedInsights />
        <Analytics />
      </AppProvider>
    </LocaleProvider>
  </QueryProvider>
</body>
```

- [ ] **Step 3: Add `AuthProvider` to `src/app/app/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/features/auth/context";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-mono",
  display: "swap",
});

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={jetbrainsMono.variable}>
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
```

> `JetBrains_Mono` is declared here so `--font-mono` CSS variable is only loaded for app routes. The `<div>` scopes the variable to the app subtree.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify no console errors**

```bash
npm run dev
```

Open `http://localhost:3000` in browser. Check:
- [ ] Landing page renders correctly in Vietnamese (default locale)
- [ ] Language toggle switches to English and back — text updates on all sections
- [ ] No hydration errors in browser console (F12 → Console)
- [ ] Login page at `http://localhost:3000/login` renders correctly
- [ ] App at `http://localhost:3000/app` loads correctly (auth works)

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/app/layout.tsx src/features/auth/context.tsx
git commit -m "perf(auth): scope AuthProvider to app routes, move JetBrains_Mono to app layout"
```

---

## Task 9: App Routes Loading Skeleton

Add a `loading.tsx` so users see a skeleton immediately instead of a blank screen while `WorkspaceViewClient` hydrates.

**Files:**
- Create: `src/components/layout/DashboardSkeleton.tsx`
- Create: `src/app/app/loading.tsx`

- [ ] **Step 1: Create `src/components/layout/DashboardSkeleton.tsx`**

```tsx
export function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background-subtle p-4 md:flex">
        <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-background-elevated" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-lg bg-background-elevated"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <div className="mt-auto space-y-2">
          <div className="h-9 animate-pulse rounded-lg bg-background-elevated" />
          <div className="h-9 animate-pulse rounded-lg bg-background-elevated" />
        </div>
      </aside>

      {/* Main area skeleton */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-background-elevated" />
          <div className="h-8 w-24 animate-pulse rounded-lg bg-background-elevated" />
        </div>

        {/* Content skeleton */}
        <div className="flex flex-1 gap-6 overflow-auto p-6">
          {/* Left panel */}
          <div className="hidden w-80 shrink-0 space-y-4 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-background-elevated" />
                <div
                  className="h-9 animate-pulse rounded-lg bg-background-elevated"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              </div>
            ))}
            <div className="h-10 animate-pulse rounded-xl bg-primary/20" />
          </div>

          {/* Right panel */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-xl bg-background-elevated"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/app/loading.tsx`**

```tsx
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";

export default function AppLoading() {
  return <DashboardSkeleton />;
}
```

- [ ] **Step 3: Verify in dev server**

Navigate to `http://localhost:3000/app`. On first load or after hard refresh you should briefly see the skeleton before the dashboard appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/DashboardSkeleton.tsx src/app/app/loading.tsx
git commit -m "perf(app): add dashboard skeleton loading state for app routes"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run existing tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 3: Production build check**

```bash
npm run build
```

Expected: build succeeds. Check output for bundle size changes — the landing page JS chunk should be noticeably smaller.

- [ ] **Step 4: Manual smoke test**

With `npm run dev`:
- `http://localhost:3000` — landing renders, language toggle works, no console errors
- `http://localhost:3000/login` — login page renders, toast notifications work (try wrong password)
- `http://localhost:3000/app` — dashboard loads with skeleton flash, auth redirects work

- [ ] **Step 5: Deploy to Vercel**

```bash
git push origin main
```

Monitor Vercel Speed Insights after deploy — FCP and LCP should improve within 24–48h of real traffic.

---

## Success Criteria

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — completes successfully
- [ ] Landing page renders in correct locale on first load (no flash)
- [ ] Language toggle updates all sections (RSC via `router.refresh()`, client components via context)
- [ ] No hydration errors in browser console on any page
- [ ] `/login` page still shows toast notifications
- [ ] `/app` routes show skeleton loading state
- [ ] Vercel RES trending toward 90+ (check Speed Insights 24–48h post-deploy)

# Performance Optimization — Design Spec
**Date:** 2026-05-04
**Goal:** Improve Vercel RES from 80 → 90+ by fixing FCP (2.75s) and LCP (3.95s)
**Scope:** Landing page first, then app routes

---

## Root Cause Summary

| Cause | Impact |
|---|---|
| All 9 landing components are `"use client"` (only need `useT()`) | Large client JS bundle, delayed hydration |
| `LocaleProvider` reads localStorage in `useEffect` | Hydration flicker on locale |
| `AuthProvider` in root layout fetches `/api/user/me` on every page | Unnecessary API call on public pages |
| `SpeedInsights` + `Analytics` in root layout | Block initial bundle |
| `JetBrains_Mono` loaded on all pages | Extra font payload on public pages |
| No `loading.tsx` for app routes | Blank screen until `WorkspaceViewClient` hydrates |

---

## Section 1: i18n Server Bridge

**Rules applied:** `rendering-hydration-no-flicker`, `server-cache-react`

### 1.1 — Cookie-sync in `LocaleProvider`

Update `setLocale` in `src/lib/i18n/context.tsx` to write a cookie alongside localStorage:

```ts
const setLocale = useCallback((l: Locale) => {
  setLocaleState(l);
  localStorage.setItem("adlance-locale", l);
  document.cookie = `adlance-locale=${l};path=/;max-age=31536000`;
}, []);
```

Add an inline script to sync localStorage → cookie before hydration (prevents flicker on first load when cookie doesn't exist yet):

```tsx
<script dangerouslySetInnerHTML={{ __html: `
  try {
    var l = localStorage.getItem('adlance-locale');
    if (l) document.cookie = 'adlance-locale=' + l + ';path=/;max-age=31536000';
  } catch(e) {}
` }} />
```

Place this script as the **first child** of `<LocaleProvider>` so it runs synchronously before React hydrates.

### 1.2 — Server translation function

New file: `src/lib/i18n/server.ts`

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

`React.cache()` ensures at most one `cookies()` call per request even if multiple components call this function.

---

## Section 2: Landing Components → RSC

**Rules applied:** `bundle-dynamic-imports`

### 2.1 — Components that become RSC

Remove `"use client"` and `useT()`. Accept `t: Dictionary` prop instead.

| Component | Change |
|---|---|
| `HeroSection` | RSC — prop `t` |
| `StatsSection` | RSC — prop `t` |
| `BentoFeatures` | RSC — prop `t` |
| `HowItWorks` | RSC — prop `t` |
| `ByokExplainer` | RSC — prop `t` |
| `CtaSection` | RSC — prop `t` |
| `Footer` | RSC — prop `t` |
| `PublicNavbar` | RSC — prop `t` (child `LanguageToggle` stays client) |

### 2.2 — Components that stay client

- `ShowcaseSection` — keeps `"use client"` for `useState` (tab switching). Remove `useT()`, accept `t: Dictionary` prop.
- `LanguageToggle` — keeps `"use client"` for `onClick` + context write.

### 2.3 — `src/app/page.tsx` becomes async server component

```tsx
import { getServerTranslations } from "@/lib/i18n/server";

export default async function HomePage() {
  const t = await getServerTranslations();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicNavbar t={t} />
      <HeroSection t={t} />
      <ShowcaseSection t={t} />
      <StatsSection t={t} />
      <BentoFeatures t={t} />
      <HowItWorks t={t} />
      <ByokExplainer t={t} />
      <CtaSection t={t} />
      <Footer t={t} />
    </main>
  );
}
```

### 2.4 — Lazy load below-fold sections

`ShowcaseSection`, `BentoFeatures`, `HowItWorks`, `ByokExplainer`, `CtaSection`, `Footer` are below the fold. Wrap with `next/dynamic` in `page.tsx`:

```tsx
const ShowcaseSection = dynamic(() =>
  import("@/components/landing/ShowcaseSection").then(m => m.ShowcaseSection)
);
// ... same for other below-fold sections
```

`HeroSection`, `PublicNavbar`, `StatsSection` are above the fold — import statically (no dynamic).

---

## Section 3: Bundle & Third-party Deferral

**Rules applied:** `bundle-defer-third-party`

In `src/app/layout.tsx`, replace static imports of `SpeedInsights` and `Analytics` with dynamic imports:

```tsx
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then(m => m.SpeedInsights),
  { ssr: false }
);
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then(m => m.Analytics),
  { ssr: false }
);
```

Move `JetBrains_Mono` font declaration from `src/app/layout.tsx` to `src/app/app/layout.tsx`. Public pages (landing, login, signup) don't use monospace font. In `src/app/app/layout.tsx`, apply `jetbrainsMono.variable` as a className on a wrapper `<div>` (or directly on `<body>` via a client trick). Since the CSS variable scopes to the element it's applied on, any component inside the app subtree that references `var(--font-mono)` will still work correctly.

---

## Section 4: Auth Provider Scope Reduction

`AuthProvider` fetches `/api/user/me` on mount. Currently in root layout, this runs on every page including landing and login.

**Changes:**
- `src/app/layout.tsx`: remove `<AuthProvider>`. Keep `<Toaster>` as a standalone import (move out of `AuthProvider`, place directly in root layout body).
- `src/app/app/layout.tsx`: wrap children with `<AuthProvider>`.

Result: landing, login, signup, forgot-password, reset-password pages no longer trigger an auth API call.

**Note:** `Toaster` from `sonner` is currently rendered inside `AuthProvider`. It must be extracted and placed directly in the root layout body so toast notifications still work on login/signup pages.

---

## Section 5: App Routes Suspense Shell

**Rules applied:** `async-suspense-boundaries`, `server-after-nonblocking`

### 5.1 — `src/app/app/loading.tsx`

Create a `DashboardSkeleton` component and export it as the loading file:

```tsx
export default function AppLoading() {
  return <DashboardSkeleton />;
}
```

`DashboardSkeleton` mirrors the `DashboardLayout` shell (sidebar + main area) with Tailwind skeleton shimmer classes. This shows instantly while `WorkspaceViewClient` hydrates.

### 5.2 — `PageViewTracker` → `after()`

`src/components/analytics/PageViewTracker` currently tracks page views as a side effect. If it fires API calls synchronously, wrap with `after()` from `next/server` so it doesn't block the response:

```tsx
import { after } from "next/server";

after(async () => {
  await trackPageView(...);
});
```

---

## Out of Scope

- App sub-route skeletons (`/app/brands`, `/app/library`, etc.) — can be added later
- Changing the i18n architecture beyond cookie-sync (no full server i18n rewrite)
- WorkspaceViewClient internal optimization — separate task

---

## Success Criteria

- Vercel RES for landing page (`/`) improves from current baseline toward 95+
- Overall RES improves from 80 → 90+
- FCP < 1.8s, LCP < 2.5s on desktop P75
- No hydration errors in browser console
- Language toggle still works correctly (client → cookie → next server render picks up)

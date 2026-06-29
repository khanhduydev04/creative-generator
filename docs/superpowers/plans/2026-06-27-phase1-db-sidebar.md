# Phase 1: DB Schema + Sidebar Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply all database migrations to the new Supabase project and restructure the sidebar into 3 collapsible sections (Image, Video, Setup) with placeholder pages for the new Video module routes.

**Architecture:** The existing SQL migration files in `supabase/adlance-snapshot/` and `supabase/byok-pivot/` are applied in order to the new Supabase project, then a new `08_video_module.sql` adds the 6 new Video module tables. The `DashboardLayout` sidebar is refactored to use a `SidebarSection` component that stores open/closed state in `localStorage`.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), Tailwind CSS, TypeScript, Vitest, lucide-react

---

## File Map

**Create:**
- `supabase/migrations/08_video_module.sql` — 6 new video tables + RLS policies
- `src/app/app/video/page.tsx` — placeholder Competitor Videos page
- `src/app/app/video/[id]/page.tsx` — placeholder Video Detail page
- `src/app/app/video/audio/page.tsx` — placeholder Audio Library page
- `src/app/app/video/voice-config/page.tsx` — placeholder Voice Config page

**Modify:**
- `src/lib/i18n/vi.ts` — add 6 new `nav.*` keys for Video module sections
- `src/lib/i18n/en.ts` — same 6 keys in English
- `src/components/layout/DashboardLayout.tsx` — add `SidebarSection` component, replace flat `NAV_ITEMS` with collapsible `NAV_SECTIONS`

---

## Task 1: Create Video Module SQL Migration

**Files:**
- Create: `supabase/migrations/08_video_module.sql`

- [ ] **Step 1: Create the migration file with full schema**

```sql
-- supabase/migrations/08_video_module.sql
-- Video Module tables: competitor_videos, transcripts, brand_scripts,
-- voice_presets, voice_ratings, generated_audios (in FK-safe order)

BEGIN;

-- ── set_updated_at trigger function (idempotent) ────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── competitor_videos ───────────────────────────────────────────────────────
CREATE TABLE public.competitor_videos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  tiktok_url    TEXT        NOT NULL,
  video_id      TEXT,
  views         BIGINT,
  likes         BIGINT,
  shares        BIGINT,
  comments      BIGINT,
  author_handle TEXT,
  cover_url     TEXT,
  scraped_at    TIMESTAMPTZ,
  apify_run_id  TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'winner', 'rejected')),
  scrape_status TEXT        NOT NULL DEFAULT 'success'
                CHECK (scrape_status IN ('success', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, tiktok_url)
);
CREATE INDEX competitor_videos_brand_status_idx
  ON public.competitor_videos(brand_id, status);

ALTER TABLE public.competitor_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY competitor_videos_all ON public.competitor_videos
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── transcripts ─────────────────────────────────────────────────────────────
CREATE TABLE public.transcripts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       UUID        NOT NULL UNIQUE
                             REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
  whisper_status TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (whisper_status IN ('pending', 'processing', 'done', 'failed')),
  raw_text       TEXT,
  edited_text    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS transcripts_set_updated_at ON public.transcripts;
CREATE TRIGGER transcripts_set_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY transcripts_all ON public.transcripts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.competitor_videos cv
    JOIN public.brands b ON b.id = cv.brand_id
    WHERE cv.id = video_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.competitor_videos cv
    JOIN public.brands b ON b.id = cv.brand_id
    WHERE cv.id = video_id AND b.owner_user_id = auth.uid()
  ));

-- ── brand_scripts ────────────────────────────────────────────────────────────
CREATE TABLE public.brand_scripts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID        NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  brand_id      UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  prompt_config JSONB       NOT NULL DEFAULT '{}',
  raw_text      TEXT,
  final_text    TEXT,
  llm_model     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX brand_scripts_transcript_idx ON public.brand_scripts(transcript_id);
CREATE INDEX brand_scripts_brand_idx      ON public.brand_scripts(brand_id);

DROP TRIGGER IF EXISTS brand_scripts_set_updated_at ON public.brand_scripts;
CREATE TRIGGER brand_scripts_set_updated_at
  BEFORE UPDATE ON public.brand_scripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.brand_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_scripts_all ON public.brand_scripts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── voice_presets ────────────────────────────────────────────────────────────
-- Created before generated_audios (FK dependency)
CREATE TABLE public.voice_presets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL,
  voice_code   TEXT        NOT NULL,
  speed        NUMERIC     NOT NULL DEFAULT 1.0,
  pitch        NUMERIC     NOT NULL DEFAULT 1.0,
  pause_config JSONB,
  is_default   BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_presets_brand_idx ON public.voice_presets(brand_id);

ALTER TABLE public.voice_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_presets_all ON public.voice_presets
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── voice_ratings ────────────────────────────────────────────────────────────
CREATE TABLE public.voice_ratings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  vbee_voice_code TEXT        NOT NULL,
  score           SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
  note            TEXT,
  rated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_ratings_brand_voice_idx
  ON public.voice_ratings(brand_id, vbee_voice_code);

ALTER TABLE public.voice_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_ratings_all ON public.voice_ratings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── generated_audios ─────────────────────────────────────────────────────────
-- After voice_presets (FK dependency)
CREATE TABLE public.generated_audios (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id       UUID        NOT NULL REFERENCES public.brand_scripts(id) ON DELETE CASCADE,
  brand_id        UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  voice_preset_id UUID        REFERENCES public.voice_presets(id) ON DELETE SET NULL,
  storage_path    TEXT,
  vbee_audio_url  TEXT,
  duration_secs   NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX generated_audios_script_idx ON public.generated_audios(script_id);
CREATE INDEX generated_audios_brand_idx  ON public.generated_audios(brand_id);

ALTER TABLE public.generated_audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY generated_audios_all ON public.generated_audios
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

COMMIT;
```

---

## Task 2: Apply All Migrations to New Supabase Project

**Files:** (none created/modified — SQL is pasted into Supabase SQL editor)

Run each file in the Supabase SQL editor **in order**. Open: Supabase Dashboard → SQL Editor → New query.

- [ ] **Step 1: Apply adlance-snapshot files (01 → 09)**

Run these files one at a time, in order:
```
supabase/adlance-snapshot/01_adlance_drop_alter_v3.sql
supabase/adlance-snapshot/02_adlance_create_tables.sql
supabase/adlance-snapshot/03_adlance_rls_policies_v2.sql
supabase/adlance-snapshot/04_adlance_storage_rls.sql
supabase/adlance-snapshot/05_adlance_trigger_handle_new_user.sql
supabase/adlance-snapshot/06_adlance_seed_system_concepts.sql
supabase/adlance-snapshot/07_adlance_phase1_fixup.sql
supabase/adlance-snapshot/08_adlance_transfer_ownership.sql
supabase/adlance-snapshot/09_adlance_phase2_member_security_fixup.sql
```

- [ ] **Step 2: Apply byok-pivot files (01 → 09)**

```
supabase/byok-pivot/01_drop_pati_tables.sql
supabase/byok-pivot/02_alter_profiles_brands.sql
supabase/byok-pivot/03_create_user_tables.sql
supabase/byok-pivot/04_rls_policies.sql
supabase/byok-pivot/05_storage_rls.sql
supabase/byok-pivot/06_trigger_handle_new_user.sql
supabase/byok-pivot/07_security_hardening.sql
supabase/byok-pivot/08_handle_new_user_oauth_fallback.sql
supabase/byok-pivot/09_fix_profiles_recursion.sql
```

- [ ] **Step 3: Apply the new Video module migration**

Paste and run the full content of `supabase/migrations/08_video_module.sql`.

- [ ] **Step 4: Verify tables exist**

Run in SQL editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'competitor_videos','transcripts','brand_scripts',
    'voice_presets','voice_ratings','generated_audios'
  )
ORDER BY table_name;
```

Expected: 6 rows returned — one for each new table.

- [ ] **Step 5: Verify RLS is enabled on new tables**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'competitor_videos','transcripts','brand_scripts',
    'voice_presets','voice_ratings','generated_audios'
  );
```

Expected: all 6 rows have `rowsecurity = true`.

---

## Task 3: Add i18n Strings for Video Module Nav

**Files:**
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

- [ ] **Step 1: Add 6 keys to the `nav` object in `vi.ts`**

In `src/lib/i18n/vi.ts`, inside the `nav: { ... }` object (after the `admin` key), add:

```typescript
    imageSection: "Ảnh",
    videoSection: "Video",
    setupSection: "Cài đặt",
    competitorVideos: "Video Đối Thủ",
    audioLibrary: "Thư Viện Audio",
    voiceConfig: "Cấu Hình Giọng",
```

- [ ] **Step 2: Add the same 6 keys to `en.ts`**

In `src/lib/i18n/en.ts`, inside the `nav: { ... }` object (after the `admin` key), add:

```typescript
    imageSection: "Image",
    videoSection: "Video",
    setupSection: "Setup",
    competitorVideos: "Competitor Videos",
    audioLibrary: "Audio Library",
    voiceConfig: "Voice Config",
```

- [ ] **Step 3: Verify TypeScript is satisfied**

Run:
```
npx tsc --noEmit
```

Expected: no errors. The `Dictionary` type is derived from `typeof vi`, so `en.ts` will type-check against it automatically.

---

## Task 4: Refactor DashboardLayout — Collapsible Sidebar Sections

**Files:**
- Modify: `src/components/layout/DashboardLayout.tsx`

- [ ] **Step 1: Add `Film`, `Music`, `Mic` to lucide-react imports**

Find the existing import line at the top of `DashboardLayout.tsx`:
```typescript
import {
  BookOpen,
  ChevronDown,
  EyeOff,
  FolderOpen,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
```

Replace with:
```typescript
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
```

- [ ] **Step 2: Add `NavItem` and `NavSection` interfaces after the imports**

After all import statements and before the `SidebarNavLink` function, add:

```typescript
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
```

- [ ] **Step 3: Add `SidebarSection` component after `SidebarNavLink`**

Insert this component definition after the closing `}` of the `SidebarNavLink` function (before the `/* ── Brand modal ... */` comment):

```typescript
function SidebarSection({
  sectionKey,
  label,
  defaultOpen,
  items,
  activePath,
  onItemClick,
}: {
  sectionKey: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
  activePath: string;
  onItemClick?: () => void;
}) {
  const storageKey = `sidebar-open-${sectionKey}`;
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultOpen : stored === "true";
    } catch {
      return defaultOpen;
    }
  });

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
```

- [ ] **Step 4: Replace `NAV_ITEMS` with `NAV_SECTIONS` inside `DashboardLayout`**

Inside `DashboardLayout`, find:
```typescript
  const NAV_ITEMS = [
    { href: "/app", icon: Sparkles, label: t.nav.createAds, match: (p: string) => p === "/app" },
    { href: "/app/stealth-ads", icon: EyeOff, label: t.nav.stealth, match: (p: string) => p === "/app/stealth-ads" },
    { href: "/app/library", icon: FolderOpen, label: t.nav.library, match: (p: string) => p === "/app/library" },
    { href: "/app/brands", icon: Palette, label: t.nav.brand, match: (p: string) => p === "/app/brands" },
    { href: "/app/concepts", icon: Lightbulb, label: t.nav.concepts, match: (p: string) => p === "/app/concepts" },
  ];
```

Replace with:
```typescript
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
      ],
    },
  ];
```

- [ ] **Step 5: Replace the main nav JSX block inside `sidebarContent`**

Find the `<nav ...>` block inside `sidebarContent` (starting at `{/* Navigation */}`). It currently contains the `{/* Navigation */}` comment and goes until the brand selector section. Replace only the contents of `<nav className="relative flex-1 overflow-y-auto px-3 py-5">`:

```tsx
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
            <SidebarNavLink
              href="/app/settings"
              icon={Settings}
              label={t.nav.settings}
              isActive={activePath === "/app/settings"}
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        </div>

        {profile && isAdmin(profile.role) && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle/70">
              {t.admin.title}
            </p>
            <div className="space-y-0.5">
              <SidebarNavLink
                href="/app/admin"
                icon={ShieldAlert}
                label={t.nav.admin}
                isActive={activePath === "/app/admin"}
                onClick={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Brand selector — unchanged from original */}
        <div className="mt-6">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground-subtle/70">
            {t.nav.brandSelector}
          </p>
          {/* ... keep the existing brand selector JSX unchanged ... */}
        </div>
      </nav>
```

> **Note:** Keep the brand selector `<div>` block (dropdown, add brand, actions menu) exactly as it is — only the nav items above it are changing.

- [ ] **Step 6: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: Create Placeholder Pages for Video Routes

**Files:**
- Create: `src/app/app/video/page.tsx`
- Create: `src/app/app/video/[id]/page.tsx`
- Create: `src/app/app/video/audio/page.tsx`
- Create: `src/app/app/video/voice-config/page.tsx`

- [ ] **Step 1: Create `src/app/app/video/page.tsx`**

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Đối Thủ",
  description: "Xem và chọn video TikTok đối thủ để đưa vào pipeline.",
};

export default function CompetitorVideosPage() {
  return (
    <DashboardLayout activePath="/app/video">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-foreground-muted text-sm">
          Video Đối Thủ — đang phát triển.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Create `src/app/app/video/[id]/page.tsx`**

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chi tiết Video",
};

interface VideoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { id } = await params;

  return (
    <DashboardLayout activePath="/app/video">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-foreground-muted text-sm">
          Chi tiết video <code>{id}</code> — đang phát triển.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 3: Create `src/app/app/video/audio/page.tsx`**

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thư Viện Audio",
  description: "Tất cả audio đã tạo từ kịch bản thương hiệu.",
};

export default function AudioLibraryPage() {
  return (
    <DashboardLayout activePath="/app/video/audio">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-foreground-muted text-sm">
          Thư Viện Audio — đang phát triển.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 4: Create `src/app/app/video/voice-config/page.tsx`**

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cấu Hình Giọng",
  description: "Thử nghiệm, đánh giá và quản lý voice presets Vbee.",
};

export default function VoiceConfigPage() {
  return (
    <DashboardLayout activePath="/app/video/voice-config">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-foreground-muted text-sm">
          Cấu Hình Giọng — đang phát triển.
        </p>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 5: Run type check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 6: Smoke Test

- [ ] **Step 1: Start the dev server**

```
npm run dev
```

- [ ] **Step 2: Sign in and verify the sidebar**

Navigate to `http://localhost:3000/app`. Verify:
- Sidebar shows 3 collapsible sections: "Ảnh", "Video", "Cài đặt"
- "Ảnh" and "Video" sections are expanded by default
- "Cài đặt" section is collapsed by default
- All existing items (Create Ads, Stealth Ads, Library, Brands, Concepts) are visible in correct sections
- Three new Video items appear: "Video Đối Thủ", "Thư Viện Audio", "Cấu Hình Giọng"
- Account section (Guide, Settings) is still always visible below

- [ ] **Step 3: Verify collapsible behaviour**

Click each section header. Verify:
- Clicking "Ảnh" header collapses/expands the Image items
- The chevron icon rotates 90° when collapsed
- Reload the page — the section stays in the same open/closed state (localStorage persistence)

- [ ] **Step 4: Verify Video nav routes**

Navigate to each Video URL and verify correct nav item is highlighted:
- `/app/video` → "Video Đối Thủ" active
- `/app/video/some-uuid` → "Video Đối Thủ" active  
- `/app/video/audio` → "Thư Viện Audio" active
- `/app/video/voice-config` → "Cấu Hình Giọng" active

- [ ] **Step 5: Verify existing nav still works**

Navigate to `/app`, `/app/stealth-ads`, `/app/library`, `/app/brands`, `/app/concepts`, `/app/guide`, `/app/settings`. Verify each page loads and its nav item is highlighted correctly.

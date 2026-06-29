# Project Constitution — static-ads-generator

## Purpose

A Next.js App Router application that generates static advertisement assets.
Architecture: 3-Layer (Docs → Navigation/Routing → Tools)

---

## Data Schemas

[To be defined in Blueprint Phase — see gemini.md]

---

## Architectural Invariants

- 3-Layer Architecture:
  1. Layer 1: Docs — planning, schemas, research markdown files (`/architecture`, `*.md`)
  2. Layer 2: Navigation — Next.js pages, layouts, routing logic (`src/app/`)
  3. Layer 3: Tools — deterministic utility functions, data transformers, generators (`src/features/`)
- Next.js App Router ONLY. Never use Pages Router.
- React Server Components are the default. Every component is a Server Component unless explicitly justified.
- Client Components require a written justification comment above the `"use client"` directive.

---

## React & Next.js Rules — Enforced Every Session

### Component Model

- Default: React Server Component (RSC). No `"use client"` unless the component needs: browser APIs, event handlers, `useState`, `useEffect`, or third-party client-only libraries.
- When adding `"use client"`, add a comment above it: `// Client Component: [reason]`
- Never convert a Server Component to a Client Component just to pass a callback prop — lift the callback or use a server action instead.
- Functional components ONLY. No class components, ever.
- Component files export exactly one primary component matching the filename in PascalCase.

### TypeScript

- Every function, component prop, API response, and utility must have an explicit TypeScript type or interface.
- No `any`. Use `unknown` and narrow with type guards.
- No type assertions (`as X`) unless accompanied by a comment explaining why it is safe.
- Props interfaces are named `[ComponentName]Props` and defined in the same file or a co-located `types.ts`.
- Enums are forbidden — use `as const` objects or string literal unions instead.
- No barrel `index.ts` files — import directly from the source file.

### Data Fetching

- Fetch data in Server Components using `async/await` directly in the component body.
- Never use `useEffect` for data fetching. `useEffect` is for side effects that cannot be done server-side.
- Use Next.js `fetch()` with explicit cache options:
  - `{ cache: 'force-cache' }` — static (build-time)
  - `{ next: { revalidate: N } }` — ISR
  - `{ cache: 'no-store' }` — always dynamic
- Data fetching functions live in `src/services/` or `src/features/[name]/services/` with explicit return types.
- Never fetch in a layout unless the data is required by every child route.

### State Management

- Local state first: `useState` inside the component.
- Shared state within a feature: React Context scoped to that feature's folder.
- No global state libraries (Redux, Zustand, Jotai, etc.) unless approved in `findings.md`.
- Never derive state that can be computed from props or existing state.

### Performance Rules

- Use `next/dynamic` for any component over ~10KB that is not above the fold.
- Always use `next/image` for images. Never use raw `<img>` tags.
- Never import an entire library when a single function suffices — use named/destructured imports.
- Avoid anonymous arrow functions as props on frequently re-rendered components — extract and name them.
- Memoization (`useMemo`, `useCallback`, `React.memo`) only when a profiler shows a problem. Never preemptively.

### Styling

- Tailwind CSS utility classes are the primary styling mechanism.
- No inline `style` objects except for dynamic values that cannot be expressed as Tailwind classes.
- Component-level CSS Modules are allowed for complex animations only.

### File & Folder Rules

- Feature-based folder structure under `src/features/[feature-name]/`.
- Each feature folder may contain: `components/`, `hooks/`, `services/`, `utils/`, `types.ts`.
- Shared/cross-feature code lives in `src/components/`, `src/hooks/`, `src/services/`, `src/utils/`.
- Route files live in `src/app/` following App Router conventions.
- No barrel `index.ts` files anywhere — import directly from the source file.
- One component per file. File name matches the exported component name in PascalCase.

### Code Style

- Self-documenting names. No abbreviations except universally known ones (`id`, `url`, `api`).
- Functions do one thing. If a function needs a comment to explain what it does, split it.
- No commented-out code in committed files.
- Magic numbers and strings extracted to named constants in a `constants.ts` file.

---

## Behavioral Rules

- Priority: Reliability over speed.
- Never guess at business logic — ask or check `findings.md`.
- Before creating a new component, check if an existing one in `src/components/` can be composed.
- Before adding a new dependency, check if the native Next.js/React API already handles it.
- All new features must map to one of the 3 layers. If unsure which layer, document the decision.
- When generating or refactoring code: briefly explain architectural decisions and suggest improvements aligned with Vercel/Next.js best practices.
- Refactor code that violates the rules above when encountered.

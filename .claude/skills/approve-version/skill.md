---
name: approve-version
description: Approve current changes, auto-update docs + guide + version, commit and push. Use when user is satisfied with code changes and wants to finalize a version. Args: "major" to bump major version, otherwise auto-determines minor vs patch.
argument-hint: "[major] (optional — omit for auto minor/patch)"
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# Approve Version — Auto-update Docs, Guide, Commit & Push

When the user runs `/aprovel-version`, perform ALL of these steps in order:

## Arguments

- `$ARGUMENTS` = optional version bump type
  - `major` → bump MAJOR version (e.g. 1.2.3 → 2.0.0). Only when user explicitly requests.
  - No argument → auto-determine MINOR vs PATCH based on change scope:
    - **MINOR**: new feature, new page, new API endpoint, new component, significant UI change
    - **PATCH**: bug fix, refactor, style tweak, docs-only change, dependency update, small optimization

## Step 1: Analyze Changes

1. Run `git diff --stat` and `git diff --name-only` to see all changed files
2. Run `git log --oneline -5` to understand recent commit context
3. Read the changed files to understand WHAT was added/modified/fixed
4. Determine a short summary of changes (1-2 sentences)
5. Auto-determine if this is a MINOR or PATCH change (unless user specified `major`)

## Step 2: Bump Version in package.json

1. Read current version from `package.json`
2. Parse as MAJOR.MINOR.PATCH
3. Apply the bump:
   - `major` → MAJOR+1, reset MINOR and PATCH to 0
   - auto-minor → MINOR+1, reset PATCH to 0
   - auto-patch → PATCH+1
4. Edit `package.json` with new version
5. Also update the version badge in `src/features/guide/components/GuideView.tsx` (the `v1.0.0` text) to match

## Step 3: Update Technical Docs (`docs/`)

Based on the changes detected in Step 1, update the RELEVANT docs files. Do NOT update files that aren't affected by the changes.

**Mapping of changes → docs files:**

| Change Area | Docs File |
|---|---|
| New/changed API routes | `docs/04-API-REFERENCE.md` |
| Generation pipeline changes | `docs/05-GENERATION-PIPELINE.md` |
| Service layer changes | `docs/06-SERVICES-LAYER.md` |
| New/changed UI components | `docs/07-FRONTEND-COMPONENTS.md` |
| New/changed env vars | `docs/09-ENVIRONMENT-VARIABLES.md` |
| Database schema changes | `docs/03-DATABASE-SCHEMA.md` |
| Getting started changes | `docs/02-GETTING-STARTED.md` |
| Architecture changes | `docs/01-OVERVIEW.md` |
| Deployment changes | `docs/10-DEPLOYMENT.md` |

**Rules:**
- Only update sections that are directly affected
- Add new sections if a wholly new feature was added
- Keep existing formatting style and Vietnamese language if the doc is in Vietnamese
- Don't rewrite entire files — surgically update the relevant sections

## Step 4: Update User Guide (`docs/USER_GUIDE.md`)

1. Read `docs/USER_GUIDE.md`
2. Based on the changes, update relevant sections:
   - New UI feature → add/update the corresponding section
   - Removed feature → remove the section
   - Changed workflow → update the step-by-step instructions
   - New troubleshooting → add to section 11
3. Keep the same markdown formatting style

## Step 5: Update Interactive Guide Data (`src/features/guide/guide-data.ts`)

1. Read `src/features/guide/guide-data.ts`
2. Sync it with the updated `docs/USER_GUIDE.md`:
   - Add/remove/update sections and subsections
   - Add/remove/update content blocks (paragraphs, steps, tables, tips, warnings, lists)
   - Update the setup checklist items if first-time setup changed
3. Ensure types match `src/features/guide/types.ts`

## Step 6: Verify Build

Run `npx tsc --noEmit` to verify no type errors. If errors found, fix them before proceeding.

## Step 7: Commit & Push

1. Run `git add -A` to stage all changes
2. Run `git status` to review what will be committed
3. Create a commit with this format:
   ```
   <type>: <short description>

   <bullet list of key changes>

   Version: <old> → <new>

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```
   Where `<type>` is one of: `feat`, `fix`, `refactor`, `style`, `docs`, `perf`, `chore`
4. Push to the current branch: `git push`

## Important Notes

- ALWAYS read files before editing them
- NEVER skip Step 6 (build verification) — if build fails, fix errors first
- If there are no meaningful changes to a docs file, don't touch it
- The guide-data.ts update must faithfully reflect USER_GUIDE.md content
- Commit message should be concise but informative
- If push fails (e.g., no upstream), set upstream: `git push -u origin <branch>`

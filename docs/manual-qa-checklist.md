# Adlance — Manual QA Checklist

Run before each release / major milestone. All steps must pass.

## 1. Functional E2E (signup → first generated ad)

1. ☐ Anonymous → `/` → landing renders correctly (Hero + Bento + How + BYOK + CTA + Footer).
2. ☐ Click "Try free" → `/signup` → submit valid form (email, name, password ≥8 chars) → redirected to `/verify-pending`.
3. ☐ Click email verification link → Supabase callback → redirect to `/login`.
4. ☐ Log in → redirected to `/app`.
5. ☐ `MissingKeyBanner` shows missing providers (since no keys yet) with a link to `/app/settings#api-keys`.
6. ☐ Navigate `/app/onboarding` directly (or via Settings) → 1-step BYOK form. "Skip for now" returns to `/app`.
7. ☐ Add a brand → `/app/brands` → create brand → setup identity, kit, add a product.
8. ☐ Try to generate without keys → `MissingKeyEmptyState` rendered with link back to Settings.
9. ☐ Add Anthropic + Google + KIE keys via `/app/settings` → `UserApiKeysCard`. `MissingKeyBanner` disappears after refresh / fetch.
10. ☐ Generate ad → SSE stream completes → first ad shown.
11. ☐ Save to library → `/app/library` → ad appears with thumbnail.
12. ☐ Logout → log back in → keys still active (no banner).
13. ☐ In a private/incognito browser, sign up a second user — confirm user 2 cannot see user 1's brand.
14. ☐ `/app/settings` → DELETE account (type email to confirm) → cascade verified (brands, saved_ads, keys all gone).

## 2. Performance / accessibility

15. ☐ Lighthouse on `/` → Accessibility ≥ 90, Performance ≥ 80.
16. ☐ Smoke at responsive widths: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
17. ☐ Tab navigation works through landing CTAs + signup form (focus rings visible).
18. ☐ `prefers-reduced-motion` respected (DevTools Rendering → Emulate CSS media feature).

## 3. Error handling

19. ☐ Invalid Anthropic key → generation fails → banner reads `Your Anthropic key was rejected — update in Settings`.
20. ☐ Provider quota exceeded (or simulate via revoking the key) → banner reads `Your <provider> key hit its quota`.
21. ☐ DB unreachable (kill local Supabase / unplug network during a generate request) → 500 with generic toast, no stack trace leaked to client.
22. ☐ Submitting invalid email format on `/signup` → inline error from `/api/auth/signup` validation.
23. ☐ Signing up with a duplicate email → 400 from Supabase with the relayed `signup_failed` message.

## 4. Tenancy isolation (re-verify after every schema change)

24. ☐ Run `npx vitest run src/__tests__/user-isolation.test.ts` — 4/4 must pass against the real DB.
25. ☐ Optionally run `docs/byok-tenancy-isolation-test.sql` in Supabase Studio for the manual RLS-context check.

## 5. Security gate

26. ☐ `mcp__supabase__get_advisors --type=security` — review remaining warnings; document any newly introduced ones.
27. ☐ `grep -rnE "sk-ant-|AIza[0-9A-Za-z_-]{30,}" src/` — must return zero hits in committed code.
28. ☐ `git diff main..HEAD -- '*.env*'` — must show no committed secrets.

## 6. Build sanity

29. ☐ `npx tsc --noEmit` → 0 errors.
30. ☐ `rm -rf .next && npm run build` → ✓ Compiled successfully.
31. ☐ `npm test` → no NEW failures vs. main (the 6 pre-existing `prompt-assembler.test.ts` failures are tracked tech debt; everything else green).

If any step fails, file an issue / block release until resolved.

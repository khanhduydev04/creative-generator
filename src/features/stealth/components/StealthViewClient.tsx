// Client Component: wrapper needed so next/dynamic with ssr:false can be used.
// StealthView has no SSR data needs; disabling SSR eliminates hydration
// mismatches caused by browser/extension attribute injection on form inputs.
"use client";

import dynamic from "next/dynamic";

const StealthView = dynamic(
  () =>
    import("@/features/stealth/components/StealthView").then(
      (m) => m.StealthView,
    ),
  { ssr: false },
);

export function StealthViewClient() {
  return <StealthView />;
}

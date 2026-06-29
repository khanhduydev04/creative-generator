// Client Component: wrapper needed so next/dynamic with ssr:false can be used.
// WorkspaceView has no SSR data needs; disabling SSR eliminates hydration
// mismatches caused by browser/extension attribute injection on form inputs.
"use client";

import dynamic from "next/dynamic";

const WorkspaceView = dynamic(
  () =>
    import("@/features/workspace/components/WorkspaceView").then(
      (m) => m.WorkspaceView,
    ),
  { ssr: false },
);

export function WorkspaceViewClient() {
  return <WorkspaceView />;
}

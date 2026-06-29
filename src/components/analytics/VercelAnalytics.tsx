// Client Component: next/dynamic with ssr: false is only allowed in Client Components
"use client";

import dynamic from "next/dynamic";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((m) => m.Analytics),
  { ssr: false },
);

export function VercelAnalytics() {
  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}

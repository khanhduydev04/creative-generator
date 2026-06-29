import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StealthViewClient } from "@/features/stealth/components/StealthViewClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stealth Ads",
  description:
    "Create native-style stealth ads that blend into social media feeds.",
};

export default function StealthAdsPage() {
  return (
    <DashboardLayout activePath="/app/stealth-ads">
      <StealthViewClient />
    </DashboardLayout>
  );
}

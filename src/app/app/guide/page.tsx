import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GuideView } from "@/features/guide/components/GuideView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide",
};

export default function GuidePage() {
  return (
    <DashboardLayout activePath="/app/guide">
      <GuideView />
    </DashboardLayout>
  );
}

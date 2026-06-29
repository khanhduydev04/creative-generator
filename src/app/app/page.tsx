import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WorkspaceViewClient } from "@/features/workspace/components/WorkspaceViewClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Ads",
  description: "Generate professional static ads with AI in minutes.",
};

export default function HomePage() {
  return (
    <DashboardLayout activePath="/app">
      <WorkspaceViewClient />
    </DashboardLayout>
  );
}

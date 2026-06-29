import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LibraryView } from "@/features/workspace/components/LibraryView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ad Library",
  description: "Browse and manage your saved ad creatives.",
};

export default function LibraryPage() {
  return (
    <DashboardLayout activePath="/app/library">
      <LibraryView />
    </DashboardLayout>
  );
}

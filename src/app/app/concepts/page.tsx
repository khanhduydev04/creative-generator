import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ConceptsTab } from "@/features/brand/components/ConceptsTab";
import { ConceptsPageHeader } from "@/components/pages/ConceptsPageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Concepts",
  description:
    "Manage ad concepts and creative templates for your campaigns.",
};

export default function ConceptsPage() {
  return (
    <DashboardLayout activePath="/app/concepts">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <ConceptsPageHeader />
        <ConceptsTab />
      </div>
    </DashboardLayout>
  );
}

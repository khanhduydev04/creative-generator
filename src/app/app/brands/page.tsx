import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BrandSetupForm } from "@/features/brand/components/BrandSetupForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Setup",
  description:
    "Configure your brand identity, colors, and fonts for consistent ad generation.",
};

export default function BrandSetupPage() {
  return (
    <DashboardLayout activePath="/app/brands">
      <BrandSetupForm />
    </DashboardLayout>
  );
}

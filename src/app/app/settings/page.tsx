import type { Metadata } from "next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SettingsClient } from "@/components/auth/SettingsClient";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <DashboardLayout activePath="/app/settings">
      <SettingsClient />
    </DashboardLayout>
  );
}

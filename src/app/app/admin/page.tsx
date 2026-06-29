import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <DashboardLayout activePath="/app/admin">
      <AdminDashboard />
    </DashboardLayout>
  );
}

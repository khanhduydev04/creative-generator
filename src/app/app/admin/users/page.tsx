import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UserManagement } from "@/features/admin/components/UserManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users",
};

export default function AdminUsersPage() {
  return (
    <DashboardLayout activePath="/app/admin/users">
      <UserManagement />
    </DashboardLayout>
  );
}

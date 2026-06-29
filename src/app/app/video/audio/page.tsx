import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thư Viện Audio",
  description: "Tất cả audio đã tạo từ kịch bản thương hiệu.",
};

export default function AudioLibraryPage() {
  return (
    <DashboardLayout activePath="/app/video/audio">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-foreground-muted text-sm">
          Thư Viện Audio — đang phát triển.
        </p>
      </div>
    </DashboardLayout>
  );
}

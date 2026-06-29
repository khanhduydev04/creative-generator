import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cấu Hình Giọng",
  description: "Thử nghiệm, đánh giá và quản lý voice presets Vbee.",
};

export default function VoiceConfigPage() {
  return (
    <DashboardLayout activePath="/app/video/voice-config">
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-foreground-muted text-sm">
          Cấu Hình Giọng — đang phát triển.
        </p>
      </div>
    </DashboardLayout>
  );
}

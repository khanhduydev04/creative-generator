import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      <OnboardingWizard />
    </main>
  );
}

"use client";
// Client Component: redirects to /app — onboarding no longer requires API key setup

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function OnboardingWizard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
    </div>
  );
}

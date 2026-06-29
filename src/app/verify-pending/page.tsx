import type { Metadata } from "next";
import { VerifyPendingActions } from "@/components/auth/VerifyPendingActions";

export const metadata: Metadata = { title: "Verify Your Email" };

export default function VerifyPendingPage() {
  return (
    <main className="min-h-screen bg-background pt-20 text-foreground">
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Check your email</h1>
        <p className="mt-4 text-foreground-muted">
          We sent you a verification link. Click it to activate your account.
        </p>
        <div className="mt-8">
          <VerifyPendingActions />
        </div>
      </div>
    </main>
  );
}

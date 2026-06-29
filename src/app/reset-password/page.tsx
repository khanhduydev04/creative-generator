import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set New Password",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-radial">
      <div className="w-full max-w-md">
        {/* Brand mark above card */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg shadow-primary/20">
            A
          </div>
          <p className="text-sm text-foreground-muted">{BRANDING.appTagline}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-background-subtle border border-border-subtle p-8 shadow-2xl shadow-black/20">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Set new password
            </h1>
            <p className="text-sm text-foreground-muted">
              Choose a strong password for your account.
            </p>
          </div>

          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}

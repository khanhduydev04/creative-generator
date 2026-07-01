import type { Metadata } from "next";
import Image from "next/image";
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
          <Image src={BRANDING.logoLight} alt={BRANDING.appName} width={56} height={56} className="h-14 w-14 object-contain drop-shadow-lg" />
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

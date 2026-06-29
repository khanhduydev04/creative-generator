import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { BRANDING } from "@/lib/branding";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Ladospice to create AI-powered creative assets.",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-radial">
      <div className="w-full max-w-md">
        {/* Brand mark above card */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg shadow-primary/20">
            L
          </div>
          <p className="text-sm text-foreground-muted">{BRANDING.appTagline}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-background-subtle border border-border-subtle p-8 shadow-2xl shadow-black/20">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-foreground-muted">
              Sign in to continue to {BRANDING.appName}
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-foreground-muted">
            Need access?{" "}
            <span className="text-foreground-subtle">
              Contact your admin.
            </span>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-6 text-center text-xs text-foreground-subtle">
          <Link
            href="/forgot-password"
            className="hover:text-foreground-muted cursor-pointer transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";
// Client Component: uses useRouter for navigation, Supabase auth, and local form state

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BRANDING } from "@/lib/branding";
import { isValidEmail } from "@/features/auth/types";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useT } from "@/lib/i18n/useTranslation";

export function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deactivatedError = searchParams.get("error") === "deactivated";

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!isValidEmail(trimmedEmail)) {
      setError(t.auth.invalidEmail);
      return;
    }

    if (password.length < 8) {
      setError(t.auth.passwordMinLength);
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(t.auth.invalidCredentials);
        return;
      }

      const verifyRes = await fetch("/api/auth/verify-login", {
        method: "POST",
      });
      const verifyData = (await verifyRes.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!verifyRes.ok || !verifyData.success) {
        if (verifyData.error === "deactivated") {
          await supabase.auth.signOut();
          setError(t.auth.accountDeactivated);
        } else {
          await supabase.auth.signOut();
          setError(t.auth.accountNotFound);
        }
        return;
      }

      router.push("/app");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton redirectTo="/app" />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-foreground-subtle">{t.auth.or}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <form className="space-y-4" onSubmit={handleSignIn}>
      {(error || deactivatedError) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/8 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-sm text-danger">
            {error ?? t.auth.accountDeactivated}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          {t.auth.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            {t.auth.passwordLabel}
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-foreground-muted hover:text-primary cursor-pointer transition-colors"
          >
            {t.auth.forgot}
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-border-strong bg-background px-3 pr-10 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            placeholder={t.auth.passwordPlaceholder}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground cursor-pointer transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.auth.signingIn}
          </>
        ) : (
          `${t.auth.signInTo} ${BRANDING.appName}`
        )}
      </button>
      </form>
    </div>
  );
}

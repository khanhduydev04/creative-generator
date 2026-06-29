"use client";
// Client Component: form state + fetch API for password reset

import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/useTranslation";

export function ForgotPasswordForm() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          {t.auth.checkYourEmail}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted max-w-[280px]">
          {t.auth.resetEmailSent}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
          className="h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.auth.sending}
          </>
        ) : (
          t.auth.sendResetEmail
        )}
      </button>
    </form>
  );
}

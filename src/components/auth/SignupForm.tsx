// Client Component: form state + submit to /api/auth/signup
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useT } from "@/lib/i18n/useTranslation";

export function SignupForm() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/verify-pending");
    } else {
      const body = await res.json().catch(() => ({}));
      const message =
        (body?.details?.message as string | undefined) ??
        (body?.details?.issues?.[0] as string | undefined) ??
        (typeof body?.error === "string" ? body.error : null) ??
        t.auth.signupFailed;
      setErr(message);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">{t.auth.createYourAccount}</h1>
        <p className="mt-2 text-foreground-muted">{t.auth.freeForever}</p>
      </header>

      <GoogleSignInButton redirectTo="/app" />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-foreground-subtle">{t.auth.or}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {t.auth.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium">
          {t.auth.nameLabel}
        </label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {t.auth.passwordLabel}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="mt-1 text-xs text-foreground-subtle">{t.auth.minCharsHint}</p>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full cursor-pointer rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-colors duration-200 hover:bg-violet-500 disabled:opacity-50"
      >
        {busy ? t.auth.creating : t.auth.createAccount}
      </button>

      <p className="text-center text-sm text-foreground-muted">
        {t.auth.alreadyHaveAccount}{" "}
        <Link
          href="/login"
          className="cursor-pointer text-accent transition-colors duration-200 hover:text-violet-400"
        >
          {t.auth.signIn}
        </Link>
      </p>
      </form>
    </div>
  );
}

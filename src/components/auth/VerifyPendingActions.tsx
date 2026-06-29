"use client";
// Client Component: resend verification email requires Supabase browser client + loading state

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/useTranslation";

export function VerifyPendingActions() {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.auth.resend({
          type: "signup",
          email: user.email,
        });
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-foreground-muted">
        {t.auth.verificationResent}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={loading}
      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.auth.sending}
        </>
      ) : (
        t.auth.resendVerification
      )}
    </button>
  );
}

"use client";
// Client Component: form state for password change using Supabase client

import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/context";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/useTranslation";

export function ChangePasswordForm() {
  const { t } = useT();
  const { profile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error(t.auth.newPasswordMinLength);
      return;
    }

    if (newPassword === currentPassword) {
      toast.error(t.auth.newPasswordMustDiffer);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email ?? "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error(t.auth.currentPasswordIncorrect);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(t.auth.passwordChangedSuccess);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <label
          htmlFor="currentPassword"
          className="block text-sm font-medium text-foreground"
        >
          {t.auth.currentPasswordLabel}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle h-4 w-4" strokeWidth={1.5} />
          <input
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background text-foreground h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium text-foreground"
        >
          {t.auth.newPasswordLabel}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle h-4 w-4" strokeWidth={1.5} />
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background text-foreground h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder={t.auth.newPasswordPlaceholder}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-foreground"
        >
          {t.auth.confirmNewPasswordLabel}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle h-4 w-4" strokeWidth={1.5} />
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background text-foreground h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.auth.changing}
          </>
        ) : (
          t.auth.changePassword
        )}
      </button>
    </form>
  );
}

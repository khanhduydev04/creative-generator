"use client";
// Client Component: admin-only form to provision new accounts + list of existing users

import { useAuth } from "@/features/auth/context";
import { DEPARTMENTS, USER_ROLES, isAdmin, type UserRole } from "@/features/auth/types";
import { useAdminUsers, useCreateUser } from "@/hooks/api/useAdminUsers";
import { ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/useTranslation";
import type { Dictionary } from "@/lib/i18n/types";
import { Check, Copy, Loader2, RefreshCw, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

function generatePassword(): string {
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

function roleLabel(role: UserRole, t: Dictionary): string {
  if (role === "ceo") return t.settings.roleCeo;
  if (role === "super_admin") return t.settings.roleSuperAdmin;
  return t.settings.roleMember;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UserManagement() {
  const { t } = useT();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const usersQuery = useAdminUsers();
  const createUser = useCreateUser();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [department, setDepartment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && (!profile || !isAdmin(profile.role))) {
      router.replace("/app");
    }
  }, [authLoading, profile, router]);

  if (authLoading || !profile || !isAdmin(profile.role)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    try {
      await createUser.mutateAsync({
        email: trimmedEmail,
        full_name: trimmedName,
        password,
        role,
        department: department || null,
      });
      setCreated({ email: trimmedEmail, password });
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("member");
      setDepartment("");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === "email_taken") setFormError(t.adminUsers.errorEmailTaken);
        else if (err.message === "validation") setFormError(t.adminUsers.errorInvalidEmail);
        else setFormError(t.adminUsers.errorGeneric);
      } else {
        setFormError(t.adminUsers.errorGeneric);
      }
    }
  }

  async function handleCopy() {
    if (!created) return;
    await navigator.clipboard.writeText(`${created.email}\n${created.password}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{t.adminUsers.pageTitle}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t.adminUsers.pageSubtitle}</p>
      </div>

      {created && (
        <div className="mb-6 rounded-2xl border border-success/30 bg-success/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t.adminUsers.createdSuccessTitle}</p>
              <p className="mt-1 text-xs text-foreground-muted">{t.adminUsers.createdSuccessHint}</p>
              <div className="mt-3 space-y-1 rounded-lg bg-background px-3 py-2 font-mono text-sm text-foreground">
                <p>{created.email}</p>
                <p>{created.password}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t.adminUsers.copied : t.adminUsers.copy}
              </button>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                {t.adminUsers.dismiss}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create user form */}
      <div className="mb-8 rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t.adminUsers.createTitle}</h2>
        </div>

        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          {formError && (
            <p className="sm:col-span-2 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="full_name" className="block text-sm font-medium text-foreground">
              {t.settings.fullName}
            </label>
            <input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.adminUsers.fullNamePlaceholder}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              {t.settings.email}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.adminUsers.emailPlaceholder}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              {t.auth.passwordLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.adminUsers.passwordPlaceholder}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                title={t.adminUsers.generatePassword}
                className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs font-medium text-foreground-muted transition-colors hover:border-foreground-muted hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="block text-sm font-medium text-foreground">
              {t.settings.role}
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r, t)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="department" className="block text-sm font-medium text-foreground">
              {t.settings.department}
            </label>
            <select
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">{t.adminUsers.departmentNone}</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.adminUsers.creating}
                </>
              ) : (
                t.adminUsers.createButton
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Existing users */}
      <div className="rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6">
        <h2 className="mb-4 text-sm font-bold text-foreground">{t.adminUsers.existingUsersTitle}</h2>
        {usersQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-foreground-subtle" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  <th className="pb-2 pr-4">{t.adminUsers.columnName}</th>
                  <th className="pb-2 pr-4">{t.adminUsers.columnEmail}</th>
                  <th className="pb-2 pr-4">{t.adminUsers.columnRole}</th>
                  <th className="pb-2 pr-4">{t.adminUsers.columnDepartment}</th>
                  <th className="pb-2 pr-4">{t.adminUsers.columnStatus}</th>
                  <th className="pb-2">{t.adminUsers.columnCreated}</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data?.users.map((u) => (
                  <tr key={u.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 pr-4 text-sm font-medium text-foreground">{u.full_name || "—"}</td>
                    <td className="py-2.5 pr-4 text-sm text-foreground-muted">{u.email}</td>
                    <td className="py-2.5 pr-4 text-sm text-foreground-muted">{roleLabel(u.role, t)}</td>
                    <td className="py-2.5 pr-4 text-sm text-foreground-muted">{u.department ?? t.settings.notAssigned}</td>
                    <td className="py-2.5 pr-4 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          u.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}
                      >
                        {u.is_active ? t.adminUsers.statusActive : t.adminUsers.statusInactive}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-foreground-subtle">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
// Client Component: settings page showing profile info + change password

import { useAuth } from "@/features/auth/context";
import { useT } from "@/lib/i18n/useTranslation";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { UserApiKeysCard } from "@/components/settings/UserApiKeysCard";
import {
  Building2,
  Calendar,
  Loader2,
  Mail,
  Shield,
  User,
} from "lucide-react";

function formatDate(dateStr: string | null, neverLabel: string): string {
  if (!dateStr) return neverLabel;
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SettingsClient() {
  const { t } = useT();
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-[860px] mx-auto p-6 sm:p-8 space-y-8">
      {/* Profile Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 backdrop-blur-sm">
        {/* Banner */}
        <div className="relative h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-violet-900/20">
          <div className="absolute inset-0 dot-pattern opacity-40" />
        </div>

        <div className="relative -mt-12 px-8 pb-8">
          {/* Avatar */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-primary/20 to-violet-700/20 shadow-lg">
            <span className="text-2xl font-black text-primary">{initials}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {profile.full_name}
              </h1>
              <p className="text-foreground-muted text-sm mt-0.5">{profile.email}</p>
              <div className="mt-3">
                <RoleBadge role={profile.role} />
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              icon={User}
              label={t.settings.fullName}
              value={profile.full_name}
            />
            <InfoCard icon={Mail} label={t.settings.email} value={profile.email} />
            <InfoCard
              icon={Building2}
              label={t.settings.department}
              value={profile.department ?? t.settings.notAssigned}
            />
            <InfoCard icon={Shield} label={t.settings.role} value={profile.role === "ceo" ? t.settings.roleCeo : profile.role === "super_admin" ? t.settings.roleSuperAdmin : t.settings.roleMember} />
          </div>

          {/* Account details */}
          <div className="mt-6 pt-6 border-t border-border-subtle flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex items-center gap-2 text-xs text-foreground-subtle">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {t.settings.joined}{" "}
                <span className="text-foreground-muted font-medium">
                  {formatDate(profile.created_at, t.settings.never)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground-subtle">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {t.settings.lastLogin}{" "}
                <span className="text-foreground-muted font-medium">
                  {formatDate(profile.last_login_at, t.settings.never)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <ChangePasswordForm />

      {/* BYOK API Keys */}
      <UserApiKeysCard />
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-background-subtle/80 border border-border-subtle">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-foreground-subtle" />
        <span className="text-[11px] font-semibold text-foreground-subtle uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

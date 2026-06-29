import type { UserRole } from "@/features/auth/types";

interface RoleBadgeProps {
  role: UserRole;
}

const ROLE_STYLES: Record<UserRole, string> = {
  ceo: "bg-amber-100 text-amber-800 border-amber-200",
  super_admin: "bg-purple-100 text-purple-800 border-purple-200",
  member: "bg-background-elevated text-foreground-muted border-border",
};

const ROLE_LABELS: Record<UserRole, string> = {
  ceo: "CEO",
  super_admin: "Super Admin",
  member: "Member",
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

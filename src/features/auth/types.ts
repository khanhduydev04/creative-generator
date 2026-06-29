export const USER_ROLES = ['ceo', 'super_admin', 'member'] as const
export type UserRole = typeof USER_ROLES[number]

export const DEPARTMENTS = [
  'Executive',
  'Performance Marketing',
  'Creative',
  'HR',
  'CRO',
  'CS',
] as const
export type Department = typeof DEPARTMENTS[number]

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  last_login_at: string | null
}

export interface ActivityLogEntry {
  id: string
  actor_id: string
  action: string
  target_user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  actor_name?: string
  target_name?: string
}

export const ADMIN_ROLES: UserRole[] = ['ceo', 'super_admin']

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role)
}

export const EMAIL_DOMAIN = '@patigroup.com'

export function isValidEmail(email: string): boolean {
  return email.endsWith(EMAIL_DOMAIN)
}

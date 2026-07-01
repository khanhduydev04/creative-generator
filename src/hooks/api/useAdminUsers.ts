import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { Profile, UserRole } from "@/features/auth/types";

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => apiFetch<{ users: Profile[] }>("/api/admin/users"),
  });
}

export interface CreateUserInput {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  department: string | null;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiFetch<{ user: Profile }>("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
    },
  });
}

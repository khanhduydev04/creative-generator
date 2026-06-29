import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

interface DailyCount {
  date: string;
  views: number;
  visitors: number;
}

interface AdminStats {
  totalPageViews: number;
  totalVisitors: number;
  totalAccounts: number;
  totalAdsSaved: number;
  daily: DailyCount[];
  topPages: { path: string; views: number }[];
}

export function useAdminStats(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.stats(days),
    queryFn: () =>
      apiFetch<AdminStats>(`/api/admin/stats?days=${days}`),
  });
}

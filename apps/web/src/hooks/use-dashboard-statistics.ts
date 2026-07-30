"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStatistics } from "@/lib/api/statistics";

export const dashboardStatisticsKeys = {
  all: ["dashboard-statistics"] as const,
};

export function useDashboardStatistics() {
  return useQuery({
    queryKey: dashboardStatisticsKeys.all,
    queryFn: getDashboardStatistics,
  });
}

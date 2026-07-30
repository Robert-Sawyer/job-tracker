"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ListApplicationsQuery } from "@job-tracker/shared";
import { listApplications } from "@/lib/api/applications";

export const applicationKeys = {
  all: ["applications"] as const,
  lists: () => [...applicationKeys.all, "list"] as const,
  list: (filters: ListApplicationsQuery) => [...applicationKeys.lists(), filters] as const,
  detail: (id: string) => [...applicationKeys.all, "detail", id] as const,
};

export function useApplications(filters: ListApplicationsQuery) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => listApplications(filters),
    placeholderData: keepPreviousData,
  });
}

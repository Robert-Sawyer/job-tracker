"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { listApplicationsQuerySchema, type ListApplicationsQuery } from "@job-tracker/shared";

const DEFAULTS: ListApplicationsQuery = {
  page: 1,
  limit: 20,
  sort: "createdAt",
  order: "desc",
  status: undefined,
  search: undefined,
};

function parse(params: URLSearchParams): ListApplicationsQuery {
  const raw: Record<string, unknown> = {
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    search: params.get("search") ?? undefined,
    sort: params.get("sort") ?? undefined,
    order: params.get("order") ?? undefined,
  };

  const statuses = params.getAll("status");
  if (statuses.length) raw.status = statuses;

  const parsed = listApplicationsQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULTS;
}

export function useApplicationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parse(new URLSearchParams(searchParams)), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<ListApplicationsQuery>, options: { resetPage?: boolean } = {}) => {
      const next = { ...filters, ...patch };
      if (options.resetPage !== false && !("page" in patch)) next.page = 1;

      const params = new URLSearchParams();
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 20) params.set("limit", String(next.limit));
      if (next.search) params.set("search", next.search);
      if (next.sort !== "createdAt") params.set("sort", next.sort);
      if (next.order !== "desc") params.set("order", next.order);
      for (const s of next.status ?? []) params.append("status", s);

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const isFiltered = Boolean(filters.search) || Boolean(filters.status?.length);

  return { filters, setFilters, reset, isFiltered };
}

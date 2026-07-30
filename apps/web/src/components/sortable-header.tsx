"use client";

import type { ListApplicationsQuery } from "@job-tracker/shared";
import { useApplicationFilters } from "@/hooks/use-application-filters";

type SortField = ListApplicationsQuery["sort"];

export function SortableHeader({
  field,
  children,
  className = "",
}: {
  field: SortField;
  children: React.ReactNode;
  className?: string;
}) {
  const { filters, setFilters } = useApplicationFilters();
  const active = filters.sort === field;
  const direction = active ? filters.order : undefined;

  function onClick() {
    setFilters({
      sort: field,
      order: active && filters.order === "desc" ? "asc" : "desc",
    });
  }

  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 ${className}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-slate-900"
      >
        {children}
        <span aria-hidden className={active ? "text-slate-900" : "text-slate-300"}>
          {active && direction === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </th>
  );
}

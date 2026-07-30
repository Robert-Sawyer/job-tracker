"use client";

import { useEffect, useState } from "react";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@job-tracker/shared";
import { useApplicationFilters } from "@/hooks/use-application-filters";

export function ApplicationFilters() {
  const { filters, setFilters, reset, isFiltered } = useApplicationFilters();
  const [term, setTerm] = useState(filters.search ?? "");

  // synchronizacja z adresem przy nawigacji wstecz
  useEffect(() => {
    setTerm(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const current = filters.search ?? "";
    if (term === current) return;

    const timeout = setTimeout(() => {
      setFilters({ search: term.trim() || undefined });
    }, 350);

    return () => clearTimeout(timeout);
  }, [term, filters.search, setFilters]);

  function toggleStatus(status: ApplicationStatus) {
    const active = new Set(filters.status ?? []);
    if (active.has(status)) {
      active.delete(status);
    } else {
      active.add(status);
    }
    setFilters({ status: active.size ? [...active] : undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search company or position"
          aria-label="Search applications"
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {APPLICATION_STATUSES.map((status) => {
          const active = filters.status?.includes(status) ?? false;
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1 ring-inset transition ${
                active
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>

      {isFiltered && (
        <button
          type="button"
          onClick={reset}
          className="text-sm text-slate-500 underline hover:text-slate-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

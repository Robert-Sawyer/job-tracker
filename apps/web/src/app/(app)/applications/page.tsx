"use client";

import { Suspense } from "react";
import { useApplicationFilters } from "@/hooks/use-application-filters";
import { useApplications } from "@/hooks/use-applications";
import { ApplicationFilters } from "@/components/application-filters";
import { ApplicationsTable } from "@/components/applications-table";
import { Pagination } from "@/components/pagination";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/table-states";

function ApplicationsView() {
  const { filters, setFilters, reset, isFiltered } = useApplicationFilters();
  const { data, isPending, isPlaceholderData, error, refetch } = useApplications(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Applications</h1>
      </div>

      <ApplicationFilters />

      <p aria-live="polite" className="sr-only">
        {data ? `${data.meta.total} applications found` : "Loading applications"}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState filtered={isFiltered} onClear={reset} />
        ) : (
          <>
            <ApplicationsTable items={data.items} stale={isPlaceholderData} />
            <Pagination
              meta={data.meta}
              disabled={isPlaceholderData}
              onPageChange={(page) => setFilters({ page })}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ApplicationsView />
    </Suspense>
  );
}

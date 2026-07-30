"use client";

import type { PaginationMeta } from "@job-tracker/shared";

export function Pagination({
                             meta,
                             onPageChange,
                             disabled = false,
                           }: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm"
    >
      <p className="text-slate-500">
        Showing <span className="font-medium text-slate-900">{from}–{to}</span> of{" "}
        <span className="font-medium text-slate-900">{meta.total}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={!meta.hasPrev || disabled}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-slate-500" aria-current="page">
          Page {meta.page} of {meta.totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={!meta.hasNext || disabled}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

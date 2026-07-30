export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading applications">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="px-4 py-16 text-center">
      <p className="font-medium text-slate-900">
        {filtered ? "No applications match your filters" : "No applications yet"}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {filtered
          ? "Try a different search term or clear the filters."
          : "Add your first application to start tracking."}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="px-4 py-16 text-center">
      <p className="font-medium text-red-700">Could not load applications</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Try again
      </button>
    </div>
  );
}

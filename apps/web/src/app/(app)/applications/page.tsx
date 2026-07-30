"use client";

import { Suspense, useMemo, useState } from "react";
import type { ApplicationDto } from "@job-tracker/shared";
import { useApplicationFilters } from "@/hooks/use-application-filters";
import { useApplications } from "@/hooks/use-applications";
import {
  useCreateApplication,
  useChangeStatus,
  useDeleteApplication,
  useUpdateApplication,
} from "@/hooks/use-application-mutations";
import { ApplicationKanban } from "@/components/application-kanban";
import { ApplicationFilters } from "@/components/application-filters";
import { ApplicationsTable } from "@/components/applications-table";
import { ApplicationForm } from "@/components/application-form";
import { DeleteApplicationDialog } from "@/components/delete-application-dialog";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/table-states";
import { emptyApplicationForm, toFormInput } from "@/lib/application-form";

function ApplicationsView() {
  const { filters, setFilters, reset, isFiltered } = useApplicationFilters();
  const [view, setView] = useState<"table" | "kanban">("table");
  const query = useMemo(
    () => (view === "kanban" ? { ...filters, page: 1, limit: 100 } : filters),
    [filters, view],
  );
  const { data, isPending, isPlaceholderData, error, refetch } = useApplications(query);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApplicationDto | null>(null);
  const [deleting, setDeleting] = useState<ApplicationDto | null>(null);

  const create = useCreateApplication();
  const update = useUpdateApplication();
  const changeStatus = useChangeStatus();
  const remove = useDeleteApplication();

  const mutationError = create.error ?? update.error ?? changeStatus.error ?? remove.error;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Button
          onClick={() => {
            create.reset();
            setCreating(true);
          }}
        >
          Add application
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ApplicationFilters />
        <div
          className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
          role="group"
          aria-label="Application view"
        >
          <Button
            type="button"
            size="sm"
            variant={view === "table" ? "primary" : "ghost"}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            Table
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "kanban" ? "primary" : "ghost"}
            aria-pressed={view === "kanban"}
            onClick={() => setView("kanban")}
          >
            Kanban
          </Button>
        </div>
      </div>

      {mutationError !== null ? (
        <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {mutationError.message}
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {data ? `${data.meta.total} applications found` : "Loading applications"}
      </p>

      <div
        className={
          view === "table"
            ? "overflow-hidden rounded-lg border border-slate-200 bg-white"
            : undefined
        }
      >
        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState filtered={isFiltered} onClear={reset} />
        ) : view === "table" ? (
          <>
            <ApplicationsTable
              items={data.items}
              stale={isPlaceholderData}
              onEdit={(application) => {
                update.reset();
                setEditing(application);
              }}
              onDelete={setDeleting}
            />
            <Pagination
              meta={data.meta}
              disabled={isPlaceholderData}
              onPageChange={(page) => setFilters({ page })}
            />
          </>
        ) : (
          <ApplicationKanban
            items={data.items}
            disabled={isPlaceholderData || changeStatus.isPending}
            onStatusChange={(id, status) => changeStatus.mutate({ id, input: { status } })}
            onEdit={(application) => {
              update.reset();
              setEditing(application);
            }}
            onDelete={setDeleting}
          />
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add application">
        {creating ? (
          <ApplicationForm
            defaultValues={emptyApplicationForm}
            submitLabel="Create"
            serverError={create.error?.message}
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              await create.mutateAsync(values);
              setCreating(false);
            }}
          />
        ) : null}
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit application">
        {editing !== null ? (
          <ApplicationForm
            defaultValues={toFormInput(editing)}
            submitLabel="Save changes"
            serverError={update.error?.message}
            onCancel={() => setEditing(null)}
            onSubmit={async (values) => {
              await update.mutateAsync({ id: editing.id, input: values });
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>

      <DeleteApplicationDialog
        application={deleting}
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={(id) => {
          remove.mutate(id);
          setDeleting(null);
        }}
      />
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

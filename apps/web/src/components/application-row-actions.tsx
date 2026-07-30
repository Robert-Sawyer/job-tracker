"use client";

import { APPLICATION_STATUSES, type ApplicationDto } from "@job-tracker/shared";
import { Button } from "./ui/button";
import { Select } from "./ui/input";
import { useChangeStatus } from "@/hooks/use-application-mutations";

export function ApplicationRowActions({
  application,
  onEdit,
  onDelete,
}: {
  application: ApplicationDto;
  onEdit: (application: ApplicationDto) => void;
  onDelete: (application: ApplicationDto) => void;
}) {
  const changeStatus = useChangeStatus();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <label className="sr-only" htmlFor={`status-${application.id}`}>
        Change status for {application.company}
      </label>
      <Select
        id={`status-${application.id}`}
        value={application.status}
        disabled={changeStatus.isPending}
        onChange={(event) => {
          changeStatus.mutate({
            id: application.id,
            input: { status: event.target.value as ApplicationDto["status"] },
          });
        }}
        className="w-32 py-1 text-xs"
      >
        {APPLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>

      <Button variant="ghost" size="sm" onClick={() => onEdit(application)}>
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:bg-rose-50"
        onClick={() => onDelete(application)}
      >
        Delete
      </Button>
    </div>
  );
}

"use client";

import type { ApplicationDto } from "@job-tracker/shared";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";

export function DeleteApplicationDialog({
  application,
  onClose,
  onConfirm,
  pending,
}: {
  application: ApplicationDto | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  pending: boolean;
}) {
  return (
    <Modal open={application !== null} onClose={onClose} title="Delete application">
      {application !== null ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete <strong>{application.position}</strong> at <strong>{application.company}</strong>
            ? Its status history will be removed as well. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" loading={pending} onClick={() => onConfirm(application.id)}>
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

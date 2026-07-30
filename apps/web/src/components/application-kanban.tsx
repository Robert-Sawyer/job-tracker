"use client";

import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  APPLICATION_STATUSES,
  type ApplicationDto,
  type ApplicationStatus,
} from "@job-tracker/shared";
import { formatSalary } from "@/lib/format";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: "border-slate-200 bg-slate-50",
  applied: "border-blue-200 bg-blue-50/50",
  interview: "border-amber-200 bg-amber-50/50",
  offer: "border-emerald-200 bg-emerald-50/50",
  rejected: "border-rose-200 bg-rose-50/50",
};

function columnId(status: ApplicationStatus) {
  return `column:${status}`;
}

function getDropStatus(
  id: string,
  applications: Map<string, ApplicationDto>,
): ApplicationStatus | undefined {
  if (id.startsWith("column:")) return id.slice("column:".length) as ApplicationStatus;
  return applications.get(id)?.status;
}

function kanbanCollisionDetection(args: Parameters<typeof closestCorners>[0]) {
  const collisions = pointerWithin(args);
  const columnCollision = collisions.find(({ id }) => String(id).startsWith("column:"));

  return columnCollision ? [columnCollision] : closestCorners(args);
}

export function ApplicationKanban({
  items,
  disabled = false,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  items: ApplicationDto[];
  disabled?: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onEdit: (application: ApplicationDto) => void;
  onDelete: (application: ApplicationDto) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const applications = new Map(items.map((item) => [item.id, item]));
  const activeApplication = activeId ? applications.get(activeId) : undefined;

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!event.over) return;

    const application = applications.get(String(event.active.id));
    const status = getDropStatus(String(event.over.id), applications);
    if (!application || !status || application.status === status) return;

    onStatusChange(application.id, status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollisionDetection}
      autoScroll
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div
        className="overflow-x-auto pb-2"
        role="region"
        aria-label="Applications kanban board"
        aria-describedby="kanban-instructions"
        tabIndex={0}
      >
        <div className="grid min-w-max grid-cols-5 gap-4">
          {APPLICATION_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={items.filter((item) => item.status === status)}
              disabled={disabled}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
      <p id="kanban-instructions" className="sr-only">
        Drag an application card to another status column to update its status. You can also use the
        keyboard drag handle.
      </p>
      <DragOverlay dropAnimation={null}>
        {activeApplication ? <KanbanCard application={activeApplication} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  items,
  disabled,
  onEdit,
  onDelete,
}: {
  status: ApplicationStatus;
  items: ApplicationDto[];
  disabled: boolean;
  onEdit: (application: ApplicationDto) => void;
  onDelete: (application: ApplicationDto) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId(status), disabled });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]} applications, ${items.length}`}
      className={`flex min-h-72 w-72 flex-col rounded-xl border p-3 transition-colors ${STATUS_STYLES[status]} ${
        isOver ? "ring-2 ring-slate-400 ring-offset-2" : ""
      }`}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-800">{STATUS_LABELS[status]}</h2>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600">
          {items.length}
        </span>
      </header>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {items.map((application) => (
            <SortableKanbanCard
              key={application.id}
              application={application}
              disabled={disabled}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-500">
              Drop applications here
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableKanbanCard({
  application,
  disabled,
  onEdit,
  onDelete,
}: {
  application: ApplicationDto;
  disabled: boolean;
  onEdit: (application: ApplicationDto) => void;
  onDelete: (application: ApplicationDto) => void;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <KanbanCard
        application={application}
        dragHandle={{ attributes, listeners, setActivatorNodeRef, disabled }}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function KanbanCard({
  application,
  dragHandle,
  onEdit,
  onDelete,
  overlay = false,
}: {
  application: ApplicationDto;
  dragHandle?: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
    disabled: boolean;
  };
  onEdit?: (application: ApplicationDto) => void;
  onDelete?: (application: ApplicationDto) => void;
  overlay?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        overlay ? "w-72 rotate-1 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{application.company}</p>
          <p className="mt-0.5 truncate text-sm text-slate-600">{application.position}</p>
        </div>
        {dragHandle ? (
          <button
            ref={dragHandle.setActivatorNodeRef}
            type="button"
            aria-label={`Drag ${application.position} at ${application.company}`}
            disabled={dragHandle.disabled}
            className="cursor-grab rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing disabled:cursor-not-allowed"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <span aria-hidden="true">⠿</span>
          </button>
        ) : null}
      </div>

      {application.location ? (
        <p className="mt-3 text-xs text-slate-500">{application.location}</p>
      ) : null}
      <p className="mt-1 text-xs tabular-nums text-slate-500">
        {formatSalary(application.salaryMin, application.salaryMax, application.currency)}
      </p>

      {onEdit && onDelete ? (
        <div className="mt-3 flex gap-1 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => onEdit(application)}
            className="rounded px-1.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(application)}
            className="rounded px-1.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}

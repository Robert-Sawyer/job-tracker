"use client";

import Link from "next/link";
import type { ApplicationDto } from "@job-tracker/shared";
import { StatusBadge } from "./status-badge";
import { SortableHeader } from "./sortable-header";
import { formatDate, formatSalary } from "@/lib/format";

export function ApplicationsTable({
                                    items,
                                    stale = false,
                                  }: {
  items: ApplicationDto[];
  stale?: boolean;
}) {
  return (
    <div className={`overflow-x-auto transition-opacity ${stale ? "opacity-60" : "opacity-100"}`}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Job applications</caption>
        <thead className="border-b border-slate-200 bg-slate-50">
        <tr>
          <SortableHeader field="company">Company</SortableHeader>
          <SortableHeader field="position">Position</SortableHeader>
          <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </th>
          <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            Salary
          </th>
          <SortableHeader field="appliedAt">Applied</SortableHeader>
          <SortableHeader field="createdAt">Added</SortableHeader>
        </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
        {items.map((a) => (
          <tr key={a.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 font-medium">
              <Link href={`/applications/${a.id}`} className="hover:underline">
                {a.company}
              </Link>
            </td>
            <td className="px-4 py-3 text-slate-600">{a.position}</td>
            <td className="px-4 py-3">
              <StatusBadge status={a.status} />
            </td>
            <td className="px-4 py-3 tabular-nums text-slate-600">
              {formatSalary(a.salaryMin, a.salaryMax, a.currency)}
            </td>
            <td className="px-4 py-3 tabular-nums text-slate-600">{formatDate(a.appliedAt)}</td>
            <td className="px-4 py-3 tabular-nums text-slate-600">{formatDate(a.createdAt)}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

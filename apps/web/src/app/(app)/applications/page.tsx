"use client";

import { useQuery } from "@tanstack/react-query";
import type { Paginated, ApplicationDto } from "@job-tracker/shared";
import { apiFetch } from "@/lib/api-client";

export default function ApplicationsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["applications", { page: 1 }],
    queryFn: () => apiFetch<Paginated<ApplicationDto>>("/applications?page=1&limit=20"),
  });

  if (isPending) return <p className="text-slate-500">Loading applications…</p>;
  if (error)
    return (
      <p role="alert" className="text-red-700">
        {error.message}
      </p>
    );

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">{data.meta.total} applications</p>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {data.items.map((a) => (
          <li key={a.id} className="px-4 py-3">
            <span className="font-medium">{a.company}</span>
            <span className="text-slate-500"> — {a.position}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

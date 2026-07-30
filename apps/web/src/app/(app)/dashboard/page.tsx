"use client";

import type { ApplicationStatus } from "@job-tracker/shared";
import { useDashboardStatistics } from "@/hooks/use-dashboard-statistics";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-slate-500",
  applied: "bg-blue-500",
  interview: "bg-amber-500",
  offer: "bg-emerald-500",
  rejected: "bg-rose-500",
};

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(`${date}T00:00:00`),
  );
}

function formatResponseTime(hours: number | null) {
  if (hours === null) return "No responses yet";

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days === 0) return `${remainingHours}h`;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

export default function DashboardPage() {
  const { data, error, isPending, refetch } = useDashboardStatistics();

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-medium text-rose-800">Could not load dashboard</p>
        <p className="mt-1 text-sm text-rose-700">{error?.message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-800 hover:bg-rose-100"
        >
          Try again
        </button>
      </div>
    );
  }

  const { applicationsOverTime, statusConversion, averageResponseTimeHours } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">A 30-day overview of your job search.</p>
      </div>

      <section
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-labelledby="timeline-title"
      >
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 id="timeline-title" className="font-semibold text-slate-900">
              Applications over time
            </h2>
            <p className="mt-1 text-sm text-slate-500">Applications created in the last 30 days.</p>
          </div>
        </div>
        <div
          className="mt-6 flex h-44 items-end gap-1"
          role="img"
          aria-label="Applications created per day"
        >
          {applicationsOverTime.map((point) => (
            <div key={point.date} className="flex h-full min-w-0 flex-1 items-end">
              <div
                className="w-full rounded-t bg-slate-800 transition-[height]"
                style={{ height: `${point.percentage}%` }}
                title={`${formatDay(point.date)}: ${point.count} applications`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{formatDay(applicationsOverTime[0]!.date)}</span>
          <span>{formatDay(applicationsOverTime.at(-1)!.date)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          aria-labelledby="conversion-title"
        >
          <h2 id="conversion-title" className="font-semibold text-slate-900">
            Status conversion
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Share of all applications in each current status.
          </p>
          <ul className="mt-5 space-y-4">
            {statusConversion.map((item) => (
              <li key={item.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{STATUS_LABELS[item.status]}</span>
                  <span className="text-slate-500">
                    {item.count} · {item.percentage}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${STATUS_STYLES[item.status]}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          aria-labelledby="response-time-title"
        >
          <h2 id="response-time-title" className="font-semibold text-slate-900">
            Average response time
          </h2>
          <p className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
            {formatResponseTime(averageResponseTimeHours)}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            From the first <strong>Applied</strong> status to the first interview, offer, or
            rejection.
          </p>
        </section>
      </div>
    </div>
  );
}

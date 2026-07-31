"use client";

import { formatDate } from "@/lib/format";
import { useFollowUpReminders, useMarkReminderRead } from "@/hooks/use-follow-up-reminders";
import { Button } from "./ui/button";

export function FollowUpReminders() {
  const { data: reminders, error, isPending } = useFollowUpReminders();
  const markRead = useMarkReminderRead();

  if (isPending) {
    return (
      <div className="h-28 animate-pulse rounded-xl bg-slate-100" aria-label="Loading reminders" />
    );
  }

  if (error) {
    return (
      <section
        className="rounded-xl border border-rose-200 bg-rose-50 p-5"
        aria-labelledby="reminders"
      >
        <h2 id="reminders" className="font-semibold text-rose-900">
          Follow-up reminders
        </h2>
        <p className="mt-1 text-sm text-rose-700">Could not load reminders.</p>
      </section>
    );
  }

  if (!reminders?.length) return null;

  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50 p-5"
      aria-labelledby="reminders"
    >
      <div>
        <h2 id="reminders" className="font-semibold text-amber-950">
          Follow-up reminders
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          These applications have had no recorded response for seven days.
        </p>
      </div>
      <ul className="mt-4 divide-y divide-amber-200">
        {reminders.map((reminder) => (
          <li
            key={reminder.id}
            className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-amber-950">
                {reminder.application.company} â€” {reminder.application.position}
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                Applied {formatDate(reminder.appliedAt)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={markRead.isPending && markRead.variables === reminder.id}
              onClick={() => markRead.mutate(reminder.id)}
            >
              Mark done
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

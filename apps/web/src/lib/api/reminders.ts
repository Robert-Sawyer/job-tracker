import type { FollowUpReminderDto } from "@job-tracker/shared";
import { apiFetch } from "../api-client.ts";

export function listFollowUpReminders() {
  return apiFetch<FollowUpReminderDto[]>("/reminders");
}

export function markReminderRead(id: string) {
  return apiFetch<void>(`/reminders/${id}/read`, { method: "PATCH" });
}

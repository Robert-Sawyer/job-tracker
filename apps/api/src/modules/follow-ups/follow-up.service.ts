import type { FollowUpJobData } from "./follow-up.job.js";
import type { ReminderRepository } from "../reminders/reminder.repository.js";

export function createFollowUpService(repo: ReminderRepository) {
  return {
    async process(job: FollowUpJobData) {
      const application = await repo.findApplicationForFollowUp(job.applicationId);

      if (!application) return { reminderCreated: false, reason: "application_missing" };
      if (application.status !== "applied") {
        return { reminderCreated: false, reason: "application_no_longer_applied" };
      }
      if (!application.appliedAt || application.appliedAt.toISOString() !== job.appliedAt) {
        return { reminderCreated: false, reason: "application_was_reapplied" };
      }

      await repo.upsertFollowUp(application.id, application.appliedAt);
      return { reminderCreated: true };
    },
  };
}

export type FollowUpService = ReturnType<typeof createFollowUpService>;

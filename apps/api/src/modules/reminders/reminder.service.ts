import type { ReminderRepository } from "./reminder.repository.js";
import { NotFoundError } from "../../lib/errors.js";

export function createReminderService(repo: ReminderRepository) {
  return {
    async listUnread(userId: string) {
      const reminders = await repo.listUnread(userId);
      return reminders.map(({ applicationAppliedAt, ...reminder }) => ({
        ...reminder,
        appliedAt: applicationAppliedAt,
      }));
    },

    async markRead(userId: string, id: string) {
      const reminder = await repo.findOwnedById(userId, id);
      if (!reminder) throw new NotFoundError("Reminder");
      if (reminder.readAt) return reminder;
      return repo.markRead(id);
    },
  };
}

export type ReminderService = ReturnType<typeof createReminderService>;

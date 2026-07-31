import type { PrismaClient } from "../../generated/prisma/client.js";

export function createReminderRepository(prisma: PrismaClient) {
  return {
    findApplicationForFollowUp(applicationId: string) {
      return prisma.application.findUnique({
        where: { id: applicationId },
        select: { id: true, status: true, appliedAt: true },
      });
    },

    upsertFollowUp(applicationId: string, applicationAppliedAt: Date) {
      return prisma.reminder.upsert({
        where: {
          applicationId_type_applicationAppliedAt: {
            applicationId,
            type: "follow_up",
            applicationAppliedAt,
          },
        },
        create: {
          applicationId,
          type: "follow_up",
          applicationAppliedAt,
        },
        update: {},
      });
    },

    listUnread(userId: string) {
      return prisma.reminder.findMany({
        where: {
          type: "follow_up",
          readAt: null,
          application: { is: { userId } },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          applicationId: true,
          applicationAppliedAt: true,
          createdAt: true,
          readAt: true,
          application: { select: { id: true, company: true, position: true } },
        },
      });
    },

    findOwnedById(userId: string, id: string) {
      return prisma.reminder.findFirst({
        where: { id, application: { is: { userId } } },
        select: { id: true, readAt: true },
      });
    },

    markRead(id: string) {
      return prisma.reminder.update({ where: { id }, data: { readAt: new Date() } });
    },
  };
}

export type ReminderRepository = ReturnType<typeof createReminderRepository>;

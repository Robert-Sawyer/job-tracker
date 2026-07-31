import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createFollowUpService } from "../src/modules/follow-ups/follow-up.service.js";
import { createReminderRepository } from "../src/modules/reminders/reminder.repository.js";
import { prisma, resetDb } from "./helpers.js";

const followUpService = createFollowUpService(createReminderRepository(prisma));

async function createAppliedApplication(appliedAt: Date) {
  const user = await prisma.user.create({
    data: { email: `worker-${crypto.randomUUID()}@example.com`, passwordHash: "hash" },
  });

  return prisma.application.create({
    data: {
      userId: user.id,
      company: "Acme",
      position: "Node Developer",
      status: "applied",
      appliedAt,
    },
  });
}

describe("follow-up worker service", () => {
  beforeEach(resetDb);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a single reminder when the application is still applied", async () => {
    const application = await createAppliedApplication(new Date("2026-07-01T12:00:00.000Z"));
    const job = { applicationId: application.id, appliedAt: application.appliedAt!.toISOString() };

    await expect(followUpService.process(job)).resolves.toEqual({ reminderCreated: true });
    await expect(followUpService.process(job)).resolves.toEqual({ reminderCreated: true });

    const reminders = await prisma.reminder.findMany({ where: { applicationId: application.id } });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      type: "follow_up",
      applicationAppliedAt: application.appliedAt,
    });
  });

  it("does not create a reminder after the application receives a response", async () => {
    const application = await createAppliedApplication(new Date("2026-07-01T12:00:00.000Z"));
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "interview" },
    });

    await expect(
      followUpService.process({
        applicationId: application.id,
        appliedAt: application.appliedAt!.toISOString(),
      }),
    ).resolves.toEqual({ reminderCreated: false, reason: "application_no_longer_applied" });

    expect(await prisma.reminder.count({ where: { applicationId: application.id } })).toBe(0);
  });

  it("does not let an old job create a reminder after reapplying", async () => {
    const originalAppliedAt = new Date("2026-07-01T12:00:00.000Z");
    const application = await createAppliedApplication(originalAppliedAt);
    await prisma.application.update({
      where: { id: application.id },
      data: { appliedAt: new Date("2026-07-10T12:00:00.000Z") },
    });

    await expect(
      followUpService.process({
        applicationId: application.id,
        appliedAt: originalAppliedAt.toISOString(),
      }),
    ).resolves.toEqual({ reminderCreated: false, reason: "application_was_reapplied" });

    expect(await prisma.reminder.count({ where: { applicationId: application.id } })).toBe(0);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authHeader,
  createTestApp,
  prisma,
  registerUser,
  resetDb,
  type TestUser,
} from "./helpers.js";

const BASE = "/api/v1/reminders";

describe("reminders", () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let user: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDb();
    user = await registerUser(ctx.api);
  });

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  async function createReminder(userId = user.userId, readAt: Date | null = null) {
    const application = await prisma.application.create({
      data: {
        userId,
        company: "Acme",
        position: "Node Developer",
        status: "applied",
        appliedAt: new Date("2026-07-01T12:00:00.000Z"),
      },
    });

    return prisma.reminder.create({
      data: {
        applicationId: application.id,
        type: "follow_up",
        applicationAppliedAt: application.appliedAt!,
        readAt,
      },
      include: { application: true },
    });
  }

  it("lists only the current user's unread reminders", async () => {
    const mine = await createReminder();
    await createReminder(user.userId, new Date());
    const other = await registerUser(ctx.api);
    await createReminder(other.userId);

    const res = await ctx.api.get(BASE).set(authHeader(user)).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: mine.id,
      applicationId: mine.applicationId,
      appliedAt: "2026-07-01T12:00:00.000Z",
      application: { company: "Acme", position: "Node Developer" },
    });
  });

  it("marks an owned reminder as read", async () => {
    const reminder = await createReminder();

    await ctx.api.patch(`${BASE}/${reminder.id}/read`).set(authHeader(user)).expect(200);

    const updated = await prisma.reminder.findUniqueOrThrow({ where: { id: reminder.id } });
    expect(updated.readAt).not.toBeNull();
    await ctx.api.get(BASE).set(authHeader(user)).expect([]);
  });

  it("does not reveal another user's reminder", async () => {
    const other = await registerUser(ctx.api);
    const reminder = await createReminder(other.userId);

    await ctx.api.patch(`${BASE}/${reminder.id}/read`).set(authHeader(user)).expect(404);
  });
});

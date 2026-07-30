import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authHeader,
  createTestApp,
  prisma,
  registerUser,
  resetDb,
  type TestUser,
} from "./helpers.js";

const BASE = "/api/v1/statistics/dashboard";

describe("dashboard statistics", () => {
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

  it("requires authentication", async () => {
    await ctx.api.get(BASE).expect(401);
  });

  it("returns SQL-aggregated timeline, status conversion, and response time", async () => {
    const appliedAt = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const respondedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await prisma.application.create({
      data: {
        userId: user.userId,
        company: "Interviewed",
        position: "Developer",
        status: "interview",
        createdAt: appliedAt,
        statusChanges: {
          create: [
            { fromStatus: null, toStatus: "saved", changedAt: appliedAt },
            { fromStatus: "saved", toStatus: "applied", changedAt: appliedAt },
            { fromStatus: "applied", toStatus: "interview", changedAt: respondedAt },
          ],
        },
      },
    });
    await prisma.application.create({
      data: {
        userId: user.userId,
        company: "Saved",
        position: "Developer",
        status: "saved",
      },
    });
    await prisma.application.create({
      data: {
        userId: user.userId,
        company: "Rejected",
        position: "Developer",
        status: "rejected",
      },
    });

    const other = await registerUser(ctx.api);
    await prisma.application.create({
      data: {
        userId: other.userId,
        company: "Hidden offer",
        position: "Developer",
        status: "offer",
      },
    });

    const res = await ctx.api.get(BASE).set(authHeader(user)).expect(200);

    expect(res.body.applicationsOverTime).toHaveLength(30);
    expect(
      res.body.applicationsOverTime.reduce(
        (total: number, point: { count: number }) => total + point.count,
        0,
      ),
    ).toBe(3);
    expect(res.body.statusConversion).toEqual([
      { status: "saved", count: 1, percentage: 33 },
      { status: "applied", count: 0, percentage: 0 },
      { status: "interview", count: 1, percentage: 33 },
      { status: "offer", count: 0, percentage: 0 },
      { status: "rejected", count: 1, percentage: 33 },
    ]);
    expect(res.body.averageResponseTimeHours).toBe(48);
  });
});

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import {
  createTestApp,
  resetDb,
  registerUser,
  authHeader,
  prisma,
  type TestUser,
} from "./helpers.js";
import type { FollowUpScheduler } from "../src/modules/follow-ups/follow-up.scheduler.js";

const BASE = "/api/v1/applications";

describe("applications", () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let user: TestUser;
  const scheduleFollowUp = vi
    .fn<(applicationId: string, appliedAt: Date) => Promise<void>>()
    .mockResolvedValue();
  const cancelFollowUp = vi.fn<(applicationId: string) => Promise<void>>().mockResolvedValue();
  const followUpScheduler: FollowUpScheduler = {
    schedule: scheduleFollowUp,
    cancel: cancelFollowUp,
  };

  beforeAll(async () => {
    ctx = await createTestApp({ followUpScheduler });
  });

  beforeEach(async () => {
    await resetDb();
    scheduleFollowUp.mockClear();
    cancelFollowUp.mockClear();
    user = await registerUser(ctx.api);
  });

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  async function create(overrides: Record<string, unknown> = {}) {
    const res = await ctx.api
      .post(BASE)
      .set(authHeader(user))
      .send({ company: "Acme", position: "Node Developer", ...overrides })
      .expect(201);
    return res.body;
  }

  it("requires authentication on every route", async () => {
    await ctx.api.get(BASE).expect(401);
    await ctx.api.post(BASE).send({ company: "A", position: "B" }).expect(401);
    await ctx.api.delete(`${BASE}/${crypto.randomUUID()}`).expect(401);
  });

  it("creates an application with an initial status change", async () => {
    const created = await create();
    expect(created.status).toBe("saved");

    const detail = await ctx.api.get(`${BASE}/${created.id}`).set(authHeader(user)).expect(200);
    expect(detail.body.statusChanges).toHaveLength(1);
    expect(detail.body.statusChanges[0].toStatus).toBe("saved");
  });

  it("rejects an inverted salary range", async () => {
    const res = await ctx.api
      .post(BASE)
      .set(authHeader(user))
      .send({ company: "A", position: "B", salaryMin: 30000, salaryMax: 10000 })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a blank company name", async () => {
    await ctx.api
      .post(BASE)
      .set(authHeader(user))
      .send({ company: "   ", position: "B" })
      .expect(400);
  });

  it("rejects a malformed id", async () => {
    const res = await ctx.api.get(`${BASE}/not-a-uuid`).set(authHeader(user)).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for a missing application", async () => {
    const res = await ctx.api
      .get(`${BASE}/${crypto.randomUUID()}`)
      .set(authHeader(user))
      .expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  describe("pagination", () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await create({ company: `Company ${String(i).padStart(2, "0")}` });
      }
    });

    it("returns correct meta on the first page", async () => {
      const res = await ctx.api.get(`${BASE}?page=1&limit=10`).set(authHeader(user)).expect(200);
      expect(res.body.items).toHaveLength(10);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it("returns a partial last page", async () => {
      const res = await ctx.api.get(`${BASE}?page=3&limit=10`).set(authHeader(user)).expect(200);
      expect(res.body.items).toHaveLength(5);
      expect(res.body.meta).toMatchObject({ hasNext: false, hasPrev: true });
    });

    it("returns an empty page beyond the range", async () => {
      const res = await ctx.api.get(`${BASE}?page=99&limit=10`).set(authHeader(user)).expect(200);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.meta.total).toBe(25);
    });

    it("caps the limit", async () => {
      await ctx.api.get(`${BASE}?limit=500`).set(authHeader(user)).expect(400);
    });

    it("does not overlap items between pages", async () => {
      const p1 = await ctx.api
        .get(`${BASE}?page=1&limit=10&sort=company&order=asc`)
        .set(authHeader(user));
      const p2 = await ctx.api
        .get(`${BASE}?page=2&limit=10&sort=company&order=asc`)
        .set(authHeader(user));
      const ids = new Set([...p1.body.items, ...p2.body.items].map((a: { id: string }) => a.id));
      expect(ids.size).toBe(20);
    });
  });

  describe("filtering", () => {
    it("filters by multiple statuses", async () => {
      const a = await create({ company: "Interviewing" });
      await create({ company: "Untouched" });
      await ctx.api
        .patch(`${BASE}/${a.id}/status`)
        .set(authHeader(user))
        .send({ status: "interview" })
        .expect(200);

      const res = await ctx.api.get(`${BASE}?status=interview`).set(authHeader(user)).expect(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.items[0].company).toBe("Interviewing");
    });

    it("searches company and position case-insensitively", async () => {
      await create({ company: "Nordcloud", position: "Backend Engineer" });
      await create({ company: "Acme", position: "React Developer" });

      const byCompany = await ctx.api
        .get(`${BASE}?search=NORDCLOUD`)
        .set(authHeader(user))
        .expect(200);
      expect(byCompany.body.meta.total).toBe(1);

      const byPosition = await ctx.api
        .get(`${BASE}?search=react`)
        .set(authHeader(user))
        .expect(200);
      expect(byPosition.body.meta.total).toBe(1);
    });
  });

  describe("status changes", () => {
    it("schedules a follow-up when an application becomes applied", async () => {
      const created = await create();

      await ctx.api
        .patch(`${BASE}/${created.id}`)
        .set(authHeader(user))
        .send({ status: "applied" })
        .expect(200);

      expect(scheduleFollowUp).toHaveBeenCalledOnce();
      expect(scheduleFollowUp).toHaveBeenCalledWith(created.id, expect.any(Date));
      expect(cancelFollowUp).not.toHaveBeenCalled();
    });

    it("cancels the follow-up when an application leaves applied", async () => {
      const created = await create();

      await ctx.api
        .patch(`${BASE}/${created.id}/status`)
        .set(authHeader(user))
        .send({ status: "applied" })
        .expect(200);
      await ctx.api
        .patch(`${BASE}/${created.id}/status`)
        .set(authHeader(user))
        .send({ status: "interview" })
        .expect(200);

      expect(scheduleFollowUp).toHaveBeenCalledOnce();
      expect(scheduleFollowUp).toHaveBeenCalledWith(created.id, expect.any(Date));
      expect(cancelFollowUp).toHaveBeenCalledOnce();
      expect(cancelFollowUp).toHaveBeenCalledWith(created.id);
    });

    it("schedules a follow-up for an application created as applied", async () => {
      const created = await create({ status: "applied" });

      expect(scheduleFollowUp).toHaveBeenCalledOnce();
      expect(scheduleFollowUp).toHaveBeenCalledWith(created.id, expect.any(Date));
    });

    it("appends history and stamps appliedAt", async () => {
      const created = await create();

      await ctx.api
        .patch(`${BASE}/${created.id}/status`)
        .set(authHeader(user))
        .send({ status: "applied", note: "sent via form" })
        .expect(200);
      await ctx.api
        .patch(`${BASE}/${created.id}/status`)
        .set(authHeader(user))
        .send({ status: "interview" })
        .expect(200);

      const detail = await ctx.api.get(`${BASE}/${created.id}`).set(authHeader(user)).expect(200);
      expect(detail.body.status).toBe("interview");
      expect(detail.body.appliedAt).not.toBeNull();
      expect(detail.body.statusChanges.map((s: { toStatus: string }) => s.toStatus)).toEqual([
        "saved",
        "applied",
        "interview",
      ]);
    });

    it("does not record a change when the status is unchanged", async () => {
      const created = await create();
      await ctx.api
        .patch(`${BASE}/${created.id}/status`)
        .set(authHeader(user))
        .send({ status: "saved" })
        .expect(200);

      const count = await prisma.statusChange.count({ where: { applicationId: created.id } });
      expect(count).toBe(1);
    });
  });

  describe("ownership isolation", () => {
    it("hides another user's applications", async () => {
      const mine = await create({ company: "Mine" });
      const other = await registerUser(ctx.api);

      const list = await ctx.api.get(BASE).set(authHeader(other)).expect(200);
      expect(list.body.meta.total).toBe(0);

      // cudzy zasób daje 404, nie 403 — nie potwierdzamy jego istnienia
      await ctx.api.get(`${BASE}/${mine.id}`).set(authHeader(other)).expect(404);
      await ctx.api
        .patch(`${BASE}/${mine.id}`)
        .set(authHeader(other))
        .send({ company: "Hijacked" })
        .expect(404);
      await ctx.api.delete(`${BASE}/${mine.id}`).set(authHeader(other)).expect(404);

      const untouched = await prisma.application.findUniqueOrThrow({ where: { id: mine.id } });
      expect(untouched.company).toBe("Mine");
    });
  });

  it("deletes an application and its history", async () => {
    const created = await create();
    await ctx.api.delete(`${BASE}/${created.id}`).set(authHeader(user)).expect(204);
    await ctx.api.get(`${BASE}/${created.id}`).set(authHeader(user)).expect(404);

    const orphans = await prisma.statusChange.count({ where: { applicationId: created.id } });
    expect(orphans).toBe(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestApp } from "./helpers.js";

describe("health endpoints", () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it("reports liveness", async () => {
    const res = await ctx.api.get("/healthz").expect(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("reports readiness with database up", async () => {
    const res = await ctx.api.get("/readyz").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.checks.database).toBe("up");
  });

  it("echoes an inbound request id", async () => {
    const res = await ctx.api.get("/healthz").set("x-request-id", "test-req-1").expect(200);
    expect(res.headers["x-request-id"]).toBe("test-req-1");
  });

  it("returns a structured 404 for unknown routes", async () => {
    const res = await ctx.api.get("/nope").expect(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(res.body.requestId).toBeTruthy();
  });
});

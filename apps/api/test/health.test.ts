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
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
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

  it("allows browser preflight requests for application mutations", async () => {
    const res = await ctx.api
      .options("/api/v1/applications/00000000-0000-0000-0000-000000000000")
      .set("origin", "http://localhost:3000")
      .set("access-control-request-method", "PATCH")
      .set("access-control-request-headers", "authorization,content-type")
      .expect(204);

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(res.headers["access-control-allow-methods"]).toContain("DELETE");
  });

  it("serves public OpenAPI documentation", async () => {
    const spec = await ctx.api.get("/docs/json").expect(200);
    expect(spec.body.info.title).toBe("Job Tracker API");
    expect(spec.body.paths).toHaveProperty("/api/v1/auth/login");

    const ui = await ctx.api.get("/docs/").expect(200);
    expect(ui.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(ui.text).toContain("swagger-ui-bundle.js");
  });

  it("applies the stricter route limit to refresh-token requests", async () => {
    const res = await ctx.api.post("/api/v1/auth/refresh").expect(401);
    expect(res.headers["x-ratelimit-limit"]).toBe("30");
  });

  it("returns a structured 404 for unknown routes", async () => {
    const res = await ctx.api.get("/nope").expect(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(res.body.requestId).toBeTruthy();
  });
});

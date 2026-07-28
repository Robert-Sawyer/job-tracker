import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createTestApp, resetDb, registerUser, prisma } from "./helpers.js";

describe("auth", () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(resetDb);

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  describe("register", () => {
    it("creates a user and sets an httpOnly refresh cookie", async () => {
      const res = await ctx.api
        .post("/api/v1/auth/register")
        .send({ email: "new@example.com", password: "Silne123haslo" })
        .expect(201);

      expect(res.body.accessToken).toBeTypeOf("string");
      expect(res.body.user.email).toBe("new@example.com");
      expect(res.body.user).not.toHaveProperty("passwordHash");

      const cookie = (res.headers["set-cookie"] as unknown as string[])[0]!;
      expect(cookie).toContain("jt_refresh=");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Path=/api/v1/auth");
    });

    it("never stores the password in plain text", async () => {
      await registerUser(ctx.api, { email: "hash@example.com", password: "Silne123haslo" });
      const user = await prisma.user.findUniqueOrThrow({ where: { email: "hash@example.com" } });
      expect(user.passwordHash).not.toContain("Silne123haslo");
      expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    });

    it("rejects a weak password", async () => {
      const res = await ctx.api
        .post("/api/v1/auth/register")
        .send({ email: "weak@example.com", password: "slabe" })
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a duplicate email", async () => {
      await registerUser(ctx.api, { email: "dup@example.com" });
      const res = await ctx.api
        .post("/api/v1/auth/register")
        .send({ email: "dup@example.com", password: "Silne123haslo" })
        .expect(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("normalises the email to lowercase", async () => {
      const res = await ctx.api
        .post("/api/v1/auth/register")
        .send({ email: "MiXeD@Example.COM", password: "Silne123haslo" })
        .expect(201);
      expect(res.body.user.email).toBe("mixed@example.com");
    });
  });

  describe("login", () => {
    it("returns a token for valid credentials", async () => {
      const user = await registerUser(ctx.api);
      const res = await ctx.api
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: user.password })
        .expect(200);
      expect(res.body.accessToken).toBeTypeOf("string");
    });

    it("gives an identical message for wrong password and unknown email", async () => {
      const user = await registerUser(ctx.api);

      const wrongPassword = await ctx.api
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "ZupelnieZle123" })
        .expect(401);

      const unknownEmail = await ctx.api
        .post("/api/v1/auth/login")
        .send({ email: "ghost@example.com", password: "ZupelnieZle123" })
        .expect(401);

      expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
      expect(wrongPassword.body.error.code).toBe(unknownEmail.body.error.code);
    });
  });

  describe("refresh rotation", () => {
    it("rotates the token on every refresh", async () => {
      const user = await registerUser(ctx.api);

      const res = await ctx.api.post("/api/v1/auth/refresh").set("Cookie", user.cookie).expect(200);
      const newCookie = (res.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;

      expect(newCookie).not.toBe(user.cookie);
      expect(res.body.accessToken).toBeTypeOf("string");
    });

    it("revokes every session when a used token is replayed", async () => {
      const user = await registerUser(ctx.api);

      const rotated = await ctx.api
        .post("/api/v1/auth/refresh")
        .set("Cookie", user.cookie)
        .expect(200);
      const currentCookie = (rotated.headers["set-cookie"] as unknown as string[])[0]!.split(
        ";",
      )[0]!;

      const replay = await ctx.api
        .post("/api/v1/auth/refresh")
        .set("Cookie", user.cookie)
        .expect(401);
      expect(replay.body.error.message).toContain("reuse");

      // token wydany chwilę wcześniej też przestaje działać
      await ctx.api.post("/api/v1/auth/refresh").set("Cookie", currentCookie).expect(401);

      const active = await prisma.refreshToken.count({
        where: { userId: user.userId, revokedAt: null },
      });
      expect(active).toBe(0);
    });

    it("rejects a missing cookie", async () => {
      await ctx.api.post("/api/v1/auth/refresh").expect(401);
    });
  });

  describe("logout", () => {
    it("invalidates the refresh token", async () => {
      const user = await registerUser(ctx.api);
      await ctx.api.post("/api/v1/auth/logout").set("Cookie", user.cookie).expect(204);
      await ctx.api.post("/api/v1/auth/refresh").set("Cookie", user.cookie).expect(401);
    });
  });

  describe("me", () => {
    it("returns the current user", async () => {
      const user = await registerUser(ctx.api);
      const res = await ctx.api
        .get("/api/v1/auth/me")
        .set("authorization", `Bearer ${user.accessToken}`)
        .expect(200);
      expect(res.body.id).toBe(user.userId);
    });

    it("rejects a missing or malformed token", async () => {
      await ctx.api.get("/api/v1/auth/me").expect(401);
      await ctx.api.get("/api/v1/auth/me").set("authorization", "Bearer nonsense").expect(401);
    });
  });
});

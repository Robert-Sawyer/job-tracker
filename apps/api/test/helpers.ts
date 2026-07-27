import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import supertest from "supertest";
import type TestAgent from "supertest/lib/agent.js";
import { buildApp } from "../src/app.js";
import { env } from "../src/config/env.js";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "status_changes", "refresh_tokens", "applications", "users" RESTART IDENTITY CASCADE`,
  );
}

export async function createTestApp() {
  const app = await buildApp();
  await app.ready();

  const api = supertest(app.server);

  return {
    app,
    api,
    close: async () => {
      await app.close();
    },
  };
}

export interface TestUser {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
  cookie: string;
}

let counter = 0;

export async function registerUser(
  api: TestAgent,
  overrides: Partial<{ email: string; password: string }> = {},
): Promise<TestUser> {
  const email = overrides.email ?? `user${++counter}-${Date.now()}@example.com`;
  const password = overrides.password ?? "Silne123haslo";

  const res = await api
    .post("/api/v1/auth/register")
    .send({ email, password, displayName: "Test User" })
    .expect(201);

  const rawCookies = res.headers["set-cookie"] as unknown as string[];
  const cookie = rawCookies.find((c) => c.startsWith("jt_refresh="))!.split(";")[0]!;

  return {
    email,
    password,
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as string,
    cookie,
  };
}

export function authHeader(user: TestUser) {
  return { authorization: `Bearer ${user.accessToken}` };
}

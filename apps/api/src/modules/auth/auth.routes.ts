import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { registerSchema, loginSchema, userDtoSchema } from "@job-tracker/shared";
import { createAuthRepository } from "./auth.repository.js";
import { createAuthService, toUserDto } from "./auth.service.js";
import { REFRESH_COOKIE, refreshCookieOptions } from "./token.service.js";
import { UnauthorizedError } from "../../lib/errors.js";
import { env } from "../../config/env.js";

const ACCESS_TTL_SECONDS = 15 * 60;
const credentialRateLimit = {
  max: env.AUTH_RATE_LIMIT_MAX,
  timeWindow: env.AUTH_RATE_LIMIT_WINDOW_MS,
  groupId: "auth-credentials",
};

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const service = createAuthService(createAuthRepository(app.prisma), app.log);

  function accessTokenFor(user: { id: string; email: string }) {
    return app.jwt.sign({ sub: user.id, email: user.email });
  }

  app.post(
    "/register",
    { config: { rateLimit: credentialRateLimit }, schema: { body: registerSchema } },
    async (request, reply) => {
      const { user, refreshToken } = await service.register(request.body);
      return reply
        .setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions)
        .code(201)
        .send({
          accessToken: accessTokenFor(user),
          expiresIn: ACCESS_TTL_SECONDS,
          user: toUserDto(user),
        });
    },
  );

  app.post(
    "/login",
    { config: { rateLimit: credentialRateLimit }, schema: { body: loginSchema } },
    async (request, reply) => {
      const { user, refreshToken } = await service.login(request.body);
      return reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions).send({
        accessToken: accessTokenFor(user),
        expiresIn: ACCESS_TTL_SECONDS,
        user: toUserDto(user),
      });
    },
  );

  app.post(
    "/refresh",
    { config: { rateLimit: { max: 30, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      const presented = request.cookies[REFRESH_COOKIE];
      if (!presented) throw new UnauthorizedError("Missing refresh token");

      const { user, refreshToken } = await service.refresh(presented);
      return reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions).send({
        accessToken: accessTokenFor(user),
        expiresIn: ACCESS_TTL_SECONDS,
        user: toUserDto(user),
      });
    },
  );

  app.post("/logout", async (request, reply) => {
    await service.logout(request.cookies[REFRESH_COOKIE]);
    return reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions).code(204).send();
  });

  app.post("/logout-all", { preHandler: [app.authenticate] }, async (request, reply) => {
    await service.logoutAll(request.userId);
    return reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions).code(204).send();
  });

  app.get(
    "/me",
    { preHandler: [app.authenticate], schema: { response: { 200: userDtoSchema } } },
    async (request) => service.me(request.userId),
  );
}

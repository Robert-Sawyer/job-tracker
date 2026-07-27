import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../lib/errors.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId: string;
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(cookie, { secret: env.JWT_SECRET });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.ACCESS_TOKEN_TTL, iss: "job-tracker-api" },
    verify: { allowedIss: "job-tracker-api" },
  });

  app.decorateRequest("userId", "");

  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
      request.userId = request.user.sub;
    } catch {
      throw new UnauthorizedError("Missing or invalid access token");
    }
  });
}, { name: "auth" });

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { loggerConfig } from "./lib/logger.js";
import { env } from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { applicationRoutes } from "./modules/applications/application.routes.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { statisticsRoutes } from "./modules/statistics/statistics.routes.js";
import type { FollowUpScheduler } from "./modules/follow-ups/follow-up.scheduler.js";
import { reminderRoutes } from "./modules/reminders/reminder.routes.js";

export interface BuildAppOptions {
  followUpScheduler: FollowUpScheduler;
}

export async function buildApp({ followUpScheduler }: BuildAppOptions) {
  const app = Fastify({
    logger: loggerConfig,
    genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
    requestIdHeader: "x-request-id",
    trustProxy: env.TRUST_PROXY,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Job Tracker API",
        description: "REST API for managing job applications and follow-up reminders.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", persistAuthorization: true },
    validatorUrl: false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", ...app.swaggerCSP.script],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https:", ...app.swaggerCSP.style],
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  const rateLimitRedis = env.RATE_LIMIT_REDIS_URL
    ? new Redis(env.RATE_LIMIT_REDIS_URL, {
        connectTimeout: 2_000,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      })
    : undefined;

  if (rateLimitRedis) {
    rateLimitRedis.on("error", (err: Error) => app.log.error({ err }, "rate-limit Redis error"));
    app.addHook("onClose", async () => {
      rateLimitRedis.disconnect();
    });
  }

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    ...(rateLimitRedis ? { redis: rateLimitRedis } : {}),
    nameSpace: "job-tracker-rate-limit-",
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1_000)} seconds.`,
      },
      requestId: request.id,
    }),
  });

  await app.register(authPlugin);

  await app.register(prismaPlugin);
  await app.register(errorHandlerPlugin);

  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  await app.register(healthRoutes);
  await app.register(applicationRoutes, {
    prefix: "/api/v1/applications",
    followUpScheduler,
  });
  await app.register(reminderRoutes, { prefix: "/api/v1/reminders" });
  await app.register(statisticsRoutes, { prefix: "/api/v1/statistics" });

  app.addHook("onSend", async (request, reply) => {
    void reply.header("x-request-id", request.id);
  });

  return app.withTypeProvider<ZodTypeProvider>();
}

import Fastify from "fastify";
import cors from "@fastify/cors";
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
    trustProxy: true,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(authPlugin);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

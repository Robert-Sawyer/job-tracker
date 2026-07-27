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

export async function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
    genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
    requestIdHeader: "x-request-id",
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(prismaPlugin);
  await app.register(errorHandlerPlugin);

  await app.register(healthRoutes);
  await app.register(applicationRoutes, { prefix: "/api/v1/applications" });  // dzień 4

  app.addHook("onSend", async (request, reply) => {
    void reply.header("x-request-id", request.id);
  });

  return app.withTypeProvider<ZodTypeProvider>();
}

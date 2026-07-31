import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
// import { z } from "zod";
import {
  createApplicationSchema,
  updateApplicationSchema,
  changeStatusSchema,
  listApplicationsQuerySchema,
  applicationIdParamSchema,
} from "@job-tracker/shared";
import { createApplicationRepository } from "./application.repository.js";
import { createApplicationService } from "./application.service.js";
import type { FollowUpScheduler } from "../follow-ups/follow-up.scheduler.js";

export interface ApplicationRoutesOptions {
  followUpScheduler: FollowUpScheduler;
}

export async function applicationRoutes(
  fastify: FastifyInstance,
  { followUpScheduler }: ApplicationRoutesOptions,
) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const service = createApplicationService(
    createApplicationRepository(app.prisma),
    followUpScheduler,
  );

  app.addHook("preHandler", app.authenticate);

  app.get("/", { schema: { querystring: listApplicationsQuerySchema } }, (request) =>
    service.list(request.userId, request.query),
  );

  app.get("/:id", { schema: { params: applicationIdParamSchema } }, (request) =>
    service.getById(request.userId, request.params.id),
  );

  app.post("/", { schema: { body: createApplicationSchema } }, async (request, reply) => {
    const created = await service.create(request.userId, request.body);
    return reply.code(201).send(created);
  });

  app.patch(
    "/:id",
    { schema: { params: applicationIdParamSchema, body: updateApplicationSchema } },
    async (request) => service.update(request.userId, request.params.id, request.body),
  );

  app.patch(
    "/:id/status",
    { schema: { params: applicationIdParamSchema, body: changeStatusSchema } },
    async (request) => service.changeStatus(request.userId, request.params.id, request.body),
  );

  app.delete("/:id", { schema: { params: applicationIdParamSchema } }, async (request, reply) => {
    await service.remove(request.userId, request.params.id);
    return reply.code(204).send();
  });
}

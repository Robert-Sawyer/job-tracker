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

// TODO(dzień 5): zastąpić realnym userId z tokenu JWT
const DEMO_USER_EMAIL = "demo@example.com";

export async function applicationRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const service = createApplicationService(createApplicationRepository(app.prisma));

  async function currentUserId(): Promise<string> {
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { email: DEMO_USER_EMAIL },
      select: { id: true },
    });
    return user.id;
  }

  app.get("/", { schema: { querystring: listApplicationsQuerySchema } }, async (request) =>
    service.list(await currentUserId(), request.query),
  );

  app.get("/:id", { schema: { params: applicationIdParamSchema } }, async (request) =>
    service.getById(await currentUserId(), request.params.id),
  );

  app.post("/", { schema: { body: createApplicationSchema } }, async (request, reply) => {
    const created = await service.create(await currentUserId(), request.body);
    return reply.code(201).send(created);
  });

  app.patch(
    "/:id",
    { schema: { params: applicationIdParamSchema, body: updateApplicationSchema } },
    async (request) => service.update(await currentUserId(), request.params.id, request.body),
  );

  app.patch(
    "/:id/status",
    { schema: { params: applicationIdParamSchema, body: changeStatusSchema } },
    async (request) => service.changeStatus(await currentUserId(), request.params.id, request.body),
  );

  app.delete("/:id", { schema: { params: applicationIdParamSchema } }, async (request, reply) => {
    await service.remove(await currentUserId(), request.params.id);
    return reply.code(204).send();
  });
}

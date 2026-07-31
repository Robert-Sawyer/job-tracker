import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { reminderIdParamSchema } from "@job-tracker/shared";
import { createReminderRepository } from "./reminder.repository.js";
import { createReminderService } from "./reminder.service.js";

export async function reminderRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const service = createReminderService(createReminderRepository(app.prisma));

  app.addHook("preHandler", app.authenticate);

  app.get("/", (request) => service.listUnread(request.userId));

  app.patch("/:id/read", { schema: { params: reminderIdParamSchema } }, (request) =>
    service.markRead(request.userId, request.params.id),
  );
}

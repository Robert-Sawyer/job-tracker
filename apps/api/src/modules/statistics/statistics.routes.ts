import type { FastifyInstance } from "fastify";
import { createStatisticsRepository } from "./statistics.repository.js";
import { createStatisticsService } from "./statistics.service.js";

export async function statisticsRoutes(app: FastifyInstance) {
  const service = createStatisticsService(createStatisticsRepository(app.prisma));

  app.addHook("preHandler", app.authenticate);

  app.get("/dashboard", (request) => service.dashboard(request.userId));
}

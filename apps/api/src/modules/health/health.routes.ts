import type { FastifyInstance } from "fastify";
import { createHealthService } from "./health.service.js";

export async function healthRoutes(app: FastifyInstance) {
  const service = createHealthService(app.prisma);

  app.get("/healthz", async () => ({ status: "ok" }));

  app.get("/readyz", async (_request, reply) => {
    const report = await service.check();
    return reply.code(report.status === "ok" ? 200 : 503).send(report);
  });
}

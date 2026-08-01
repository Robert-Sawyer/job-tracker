import type { FastifyInstance } from "fastify";
import { createHealthService } from "./health.service.js";

export async function healthRoutes(app: FastifyInstance) {
  const service = createHealthService(app.prisma);

  app.get("/healthz", { config: { rateLimit: false } }, async () => ({ status: "ok" }));

  app.get("/readyz", { config: { rateLimit: false } }, async (_request, reply) => {
    const report = await service.check();
    return reply.code(report.status === "ok" ? 200 : 503).send(report);
  });
}

import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../lib/errors.js";
import { env } from "../config/env.js";

export default fp(async (app: FastifyInstance) => {
  app.setNotFoundHandler((request, reply) => {
    void reply.code(404).send({
      error: { code: "ROUTE_NOT_FOUND", message: `Route ${request.method} ${request.url} not found` },
      requestId: request.id,
    });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, "handled application error");
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
        requestId: request.id,
      });
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.issues },
        requestId: request.id,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.code(409).send({
        error: { code: "CONFLICT", message: "Resource already exists" },
        requestId: request.id,
      });
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request does not match schema",
          details: error.validation,
        },
        requestId: request.id,
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: error.message, details: error.validation },
        requestId: request.id,
      });
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      request.log.warn({ err: error, code: error.code }, "handled client error");
      return reply.code(error.statusCode).send({
        error: {
          code: error.code ?? "BAD_REQUEST",
          message: error.message,
        },
        requestId: request.id,
      });
    }

    request.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: env.NODE_ENV === "production" ? "Internal server error" : error.message,
      },
      requestId: request.id,
    });
  });
}, { name: "error-handler" });

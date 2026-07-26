import type { FastifyServerOptions } from "fastify";
import { env } from "../config/env.js";

export const loggerConfig: FastifyServerOptions["logger"] = {
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === "development"
    ? {
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
      },
    }
    : {}),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    req(req) {
      return { method: req.method, url: req.url, id: req.id };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
};

import { z } from "zod";
import type { RedisOptions } from "ioredis";

const queueEnvSchema = z.object({
  REDIS_URL: z.string().url().optional(),
  REDIS_HOST: z.string().min(1).default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_USERNAME: z.string().min(1).optional(),
  REDIS_PASSWORD: z.string().min(1).optional(),
});

const parsed = queueEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid queue environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const queueEnv = parsed.data;

function redisOptionsFromUrl(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

export const bullMqConnection: RedisOptions = queueEnv.REDIS_URL
  ? redisOptionsFromUrl(queueEnv.REDIS_URL)
  : {
      host: queueEnv.REDIS_HOST,
      port: queueEnv.REDIS_PORT,
      ...(queueEnv.REDIS_USERNAME ? { username: queueEnv.REDIS_USERNAME } : {}),
      ...(queueEnv.REDIS_PASSWORD ? { password: queueEnv.REDIS_PASSWORD } : {}),
    };

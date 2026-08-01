import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { databaseEnv } from "../config/database-env.js";

const adapter = new PrismaPg({ connectionString: databaseEnv.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: databaseEnv.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});

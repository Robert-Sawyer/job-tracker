import "dotenv/config";
import closeWithGrace from "close-with-grace";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  const app = await buildApp();

  closeWithGrace({ delay: 10_000 }, async ({ err, signal }) => {
    if (err) app.log.error({ err }, "shutting down due to error");
    else app.log.info({ signal }, "graceful shutdown started");
    await app.close();
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.fatal({ err }, "failed to start server");
    process.exit(1);
  }
}

void main();

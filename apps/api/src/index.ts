import "dotenv/config";
import closeWithGrace from "close-with-grace";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { followUpQueue } from "./modules/follow-ups/follow-up.queue.js";
import { createFollowUpScheduler } from "./modules/follow-ups/follow-up.scheduler.js";

async function main() {
  const followUpScheduler = createFollowUpScheduler(followUpQueue);
  const app = await buildApp({ followUpScheduler });

  closeWithGrace({ delay: 10_000 }, async ({ err, signal }) => {
    if (err) app.log.error({ err }, "shutting down due to error");
    else app.log.info({ signal }, "graceful shutdown started");
    await Promise.all([app.close(), followUpScheduler.close()]);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.fatal({ err }, "failed to start server");
    process.exit(1);
  }
}

void main();

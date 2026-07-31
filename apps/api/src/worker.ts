import "dotenv/config";
import closeWithGrace from "close-with-grace";
import { Worker } from "bullmq";
import { bullMqConnection } from "./config/queue-env.js";
import { prisma } from "./db/client.js";
import { FOLLOW_UP_QUEUE_NAME, type FollowUpJobData } from "./modules/follow-ups/follow-up.job.js";
import { createFollowUpService } from "./modules/follow-ups/follow-up.service.js";
import { createReminderRepository } from "./modules/reminders/reminder.repository.js";

const followUpService = createFollowUpService(createReminderRepository(prisma));

const worker = new Worker<FollowUpJobData>(
  FOLLOW_UP_QUEUE_NAME,
  async (job) => {
    const result = await followUpService.process(job.data);

    console.info("Processed follow-up reminder", {
      jobId: job.id,
      applicationId: job.data.applicationId,
      ...result,
    });
  },
  { connection: bullMqConnection },
);

worker.on("completed", (job) => {
  console.info("Follow-up reminder processed", { jobId: job.id });
});

worker.on("failed", (job, error) => {
  console.error("Follow-up reminder failed", { jobId: job?.id, error });
});

worker.on("error", (error) => {
  console.error("Follow-up worker error", { error });
});

console.info("Follow-up worker is waiting for jobs");

closeWithGrace({ delay: 10_000 }, async ({ err, signal }) => {
  if (err) console.error("Worker is shutting down because of an error", { err });
  else console.info("Worker graceful shutdown started", { signal });

  await Promise.all([worker.close(), prisma.$disconnect()]);
});

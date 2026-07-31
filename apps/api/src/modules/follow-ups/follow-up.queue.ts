import { Queue } from "bullmq";
import { bullMqConnection } from "../../config/queue-env.js";
import { FOLLOW_UP_QUEUE_NAME, type FollowUpJobData } from "./follow-up.job.js";

export const followUpQueue = new Queue<FollowUpJobData>(FOLLOW_UP_QUEUE_NAME, {
  connection: bullMqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: 1_000,
    removeOnFail: 5_000,
  },
});

import "dotenv/config";
import { FOLLOW_UP_JOB_NAME } from "../modules/follow-ups/follow-up.job.js";
import { followUpQueue } from "../modules/follow-ups/follow-up.queue.js";

const delayMs = 10_000;

try {
  const job = await followUpQueue.add(
    FOLLOW_UP_JOB_NAME,
    { applicationId: "demo-application", appliedAt: new Date().toISOString() },
    { delay: delayMs, jobId: `demo-follow-up-${Date.now()}` },
  );

  console.info("Queued demo follow-up reminder", {
    jobId: job.id,
    delayMs,
    runAt: new Date(Date.now() + delayMs).toISOString(),
  });
} finally {
  await followUpQueue.close();
}

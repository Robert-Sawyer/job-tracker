import type { Queue } from "bullmq";
import {
  FOLLOW_UP_DELAY_MS,
  FOLLOW_UP_JOB_NAME,
  getFollowUpJobId,
  type FollowUpJobData,
} from "./follow-up.job.js";

type FollowUpQueue = Pick<Queue<FollowUpJobData>, "add" | "close" | "remove">;

export interface FollowUpScheduler {
  schedule(applicationId: string, appliedAt: Date): Promise<void>;
  cancel(applicationId: string): Promise<void>;
}

export interface ManagedFollowUpScheduler extends FollowUpScheduler {
  close(): Promise<void>;
}

export function createFollowUpScheduler(queue: FollowUpQueue): ManagedFollowUpScheduler {
  return {
    async schedule(applicationId, appliedAt) {
      await queue.add(
        FOLLOW_UP_JOB_NAME,
        { applicationId, appliedAt: appliedAt.toISOString() },
        {
          delay: FOLLOW_UP_DELAY_MS,
          jobId: getFollowUpJobId(applicationId),
        },
      );
    },

    async cancel(applicationId) {
      await queue.remove(getFollowUpJobId(applicationId));
    },

    close() {
      return queue.close();
    },
  };
}

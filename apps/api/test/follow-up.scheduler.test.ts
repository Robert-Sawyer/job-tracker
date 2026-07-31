import { describe, expect, it, vi } from "vitest";
import {
  FOLLOW_UP_DELAY_MS,
  FOLLOW_UP_JOB_NAME,
  getFollowUpJobId,
} from "../src/modules/follow-ups/follow-up.job.js";
import { createFollowUpScheduler } from "../src/modules/follow-ups/follow-up.scheduler.js";

describe("follow-up scheduler", () => {
  it("creates one delayed job per application", async () => {
    const queue = {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(0),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const scheduler = createFollowUpScheduler(queue as never);
    const appliedAt = new Date("2026-07-31T12:00:00.000Z");

    await scheduler.schedule("application-123", appliedAt);

    expect(queue.add).toHaveBeenCalledWith(
      FOLLOW_UP_JOB_NAME,
      { applicationId: "application-123", appliedAt: appliedAt.toISOString() },
      {
        delay: FOLLOW_UP_DELAY_MS,
        jobId: getFollowUpJobId("application-123"),
      },
    );
  });

  it("removes the application-specific delayed job", async () => {
    const queue = {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(1),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const scheduler = createFollowUpScheduler(queue as never);

    await scheduler.cancel("application-123");

    expect(queue.remove).toHaveBeenCalledWith(getFollowUpJobId("application-123"));
  });
});

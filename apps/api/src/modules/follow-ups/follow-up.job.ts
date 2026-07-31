export const FOLLOW_UP_QUEUE_NAME = "follow-up-reminders";
export const FOLLOW_UP_JOB_NAME = "send-follow-up-reminder";
export const FOLLOW_UP_DELAY_MS = 7 * 24 * 60 * 60 * 1_000;

export type FollowUpJobData = {
  applicationId: string;
  appliedAt: string;
};

export function getFollowUpJobId(applicationId: string) {
  return `follow-up-${applicationId}`;
}

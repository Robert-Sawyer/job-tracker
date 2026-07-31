-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('follow_up');

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "type" "ReminderType" NOT NULL,
    "applicationAppliedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminders_applicationId_createdAt_idx" ON "reminders"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_applicationId_type_applicationAppliedAt_key" ON "reminders"("applicationId", "type", "applicationAppliedAt");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

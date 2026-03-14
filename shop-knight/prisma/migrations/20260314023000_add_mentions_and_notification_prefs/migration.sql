-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('NOTE_MENTION', 'TASK_ASSIGNED', 'OPPORTUNITY_ROLE_ASSIGNED', 'QUOTE_ROLE_ASSIGNED', 'SALES_ORDER_ROLE_ASSIGNED');

-- CreateTable
CREATE TABLE "NoteMention" (
  "id" TEXT NOT NULL,
  "noteId" TEXT NOT NULL,
  "mentionedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NoteMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "userId" TEXT NOT NULL,
  "event" "NotificationEvent" NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "NoteMention_noteId_mentionedUserId_key" ON "NoteMention"("noteId", "mentionedUserId");
CREATE INDEX "NoteMention_mentionedUserId_createdAt_idx" ON "NoteMention"("mentionedUserId", "createdAt");
CREATE UNIQUE INDEX "NotificationPreference_companyId_userId_event_key" ON "NotificationPreference"("companyId", "userId", "event");
CREATE INDEX "NotificationPreference_userId_event_idx" ON "NotificationPreference"("userId", "event");

-- Foreign Keys
ALTER TABLE "NoteMention" ADD CONSTRAINT "NoteMention_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteMention" ADD CONSTRAINT "NoteMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

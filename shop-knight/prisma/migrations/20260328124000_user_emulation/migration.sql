-- CreateEnum
CREATE TYPE "EmulationAuditAction" AS ENUM ('START', 'STOP');

-- CreateTable
CREATE TABLE "UserEmulationSession" (
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmulationSession_pkey" PRIMARY KEY ("actorId")
);

-- CreateTable
CREATE TABLE "UserEmulationAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" "EmulationAuditAction" NOT NULL,
    "actorRole" "UserType" NOT NULL,
    "actorCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEmulationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEmulationSession_targetUserId_idx" ON "UserEmulationSession"("targetUserId");

-- CreateIndex
CREATE INDEX "UserEmulationAudit_actorId_createdAt_idx" ON "UserEmulationAudit"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "UserEmulationAudit_targetUserId_createdAt_idx" ON "UserEmulationAudit"("targetUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserEmulationSession" ADD CONSTRAINT "UserEmulationSession_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmulationSession" ADD CONSTRAINT "UserEmulationSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmulationAudit" ADD CONSTRAINT "UserEmulationAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmulationAudit" ADD CONSTRAINT "UserEmulationAudit_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

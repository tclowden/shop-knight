-- CreateTable
CREATE TABLE "PayPeriodLock" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "lockedById" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayPeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayPeriodLock_companyId_startDate_endDate_idx" ON "PayPeriodLock"("companyId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "PayPeriodLock" ADD CONSTRAINT "PayPeriodLock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayPeriodLock" ADD CONSTRAINT "PayPeriodLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

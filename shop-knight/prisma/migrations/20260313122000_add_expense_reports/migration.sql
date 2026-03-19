-- CreateEnum
CREATE TYPE "ExpenseReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');

-- CreateTable
CREATE TABLE "ExpenseReport" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "reportNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "status" "ExpenseReportStatus" NOT NULL DEFAULT 'DRAFT',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "notes" TEXT,
  "amexLinked" BOOLEAN NOT NULL DEFAULT false,
  "amexLastSyncAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "reimbursedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExpenseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
  "id" TEXT NOT NULL,
  "expenseReportId" TEXT NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL,
  "merchant" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "paymentMethod" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "taxAmount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "receiptRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReport_companyId_reportNumber_key" ON "ExpenseReport"("companyId", "reportNumber");

-- CreateIndex
CREATE INDEX "ExpenseReport_companyId_status_createdAt_idx" ON "ExpenseReport"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExpenseLine_expenseReportId_expenseDate_idx" ON "ExpenseLine"("expenseReportId", "expenseDate");

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_expenseReportId_fkey" FOREIGN KEY ("expenseReportId") REFERENCES "ExpenseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

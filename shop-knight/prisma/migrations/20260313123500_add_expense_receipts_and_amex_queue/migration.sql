-- CreateEnum
CREATE TYPE "AmexTransactionStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'IGNORED');

-- CreateTable
CREATE TABLE "ExpenseReceipt" (
  "id" TEXT NOT NULL,
  "expenseLineId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExpenseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmexTransaction" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "postedAt" TIMESTAMP(3) NOT NULL,
  "merchant" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "reference" TEXT,
  "source" TEXT DEFAULT 'manual',
  "status" "AmexTransactionStatus" NOT NULL DEFAULT 'UNMATCHED',
  "expenseLineId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AmexTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseReceipt_expenseLineId_createdAt_idx" ON "ExpenseReceipt"("expenseLineId", "createdAt");

-- CreateIndex
CREATE INDEX "AmexTransaction_companyId_status_postedAt_idx" ON "AmexTransaction"("companyId", "status", "postedAt");

-- AddForeignKey
ALTER TABLE "ExpenseReceipt" ADD CONSTRAINT "ExpenseReceipt_expenseLineId_fkey" FOREIGN KEY ("expenseLineId") REFERENCES "ExpenseLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmexTransaction" ADD CONSTRAINT "AmexTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmexTransaction" ADD CONSTRAINT "AmexTransaction_expenseLineId_fkey" FOREIGN KEY ("expenseLineId") REFERENCES "ExpenseLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

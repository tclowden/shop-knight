-- AlterTable
ALTER TABLE "ExpenseReport" ADD COLUMN "employeeUserId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseReport_employeeUserId_idx" ON "ExpenseReport"("employeeUserId");

-- AddForeignKey
ALTER TABLE "ExpenseReport" ADD CONSTRAINT "ExpenseReport_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

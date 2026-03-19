-- AlterTable
ALTER TABLE "Job" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Job" ADD COLUMN "salesOrderId" TEXT;
ALTER TABLE "Job" ADD COLUMN "salesOrderLineId" TEXT;

-- CreateIndex
CREATE INDEX "Job_companyId_salesOrderId_idx" ON "Job"("companyId", "salesOrderId");
CREATE INDEX "Job_salesOrderLineId_idx" ON "Job"("salesOrderLineId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "SalesOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

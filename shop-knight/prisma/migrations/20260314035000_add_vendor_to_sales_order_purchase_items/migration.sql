-- AlterTable
ALTER TABLE "SalesOrderPurchaseItem" ADD COLUMN "vendorId" TEXT;

-- CreateIndex
CREATE INDEX "SalesOrderPurchaseItem_vendorId_idx" ON "SalesOrderPurchaseItem"("vendorId");

-- AddForeignKey
ALTER TABLE "SalesOrderPurchaseItem" ADD CONSTRAINT "SalesOrderPurchaseItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

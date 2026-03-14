-- AlterTable
ALTER TABLE "SalesOrderPurchaseItem" ADD COLUMN "receiptRef" TEXT;

-- CreateTable
CREATE TABLE "SalesOrderPurchaseReceipt" (
  "id" TEXT NOT NULL,
  "purchaseItemId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SalesOrderPurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesOrderPurchaseReceipt_purchaseItemId_createdAt_idx" ON "SalesOrderPurchaseReceipt"("purchaseItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "SalesOrderPurchaseReceipt" ADD CONSTRAINT "SalesOrderPurchaseReceipt_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "SalesOrderPurchaseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

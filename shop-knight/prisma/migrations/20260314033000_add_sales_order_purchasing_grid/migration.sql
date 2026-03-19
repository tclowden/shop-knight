-- CreateEnum
CREATE TYPE "PurchaseMethod" AS ENUM ('CREDIT_CARD', 'ON_ACCOUNT');

-- CreateTable
CREATE TABLE "SalesOrderPurchaseItem" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "item" TEXT NOT NULL,
  "description" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "itemCost" DECIMAL(12,2) NOT NULL,
  "totalCost" DECIMAL(12,2) NOT NULL,
  "purchasedBy" "PurchaseMethod" NOT NULL DEFAULT 'CREDIT_CARD',
  "poNumber" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesOrderPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "SalesOrderPurchaseItem_salesOrderId_sortOrder_idx" ON "SalesOrderPurchaseItem"("salesOrderId", "sortOrder");
CREATE INDEX "SalesOrderPurchaseItem_salesOrderId_purchasedBy_idx" ON "SalesOrderPurchaseItem"("salesOrderId", "purchasedBy");

-- Foreign key
ALTER TABLE "SalesOrderPurchaseItem" ADD CONSTRAINT "SalesOrderPurchaseItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

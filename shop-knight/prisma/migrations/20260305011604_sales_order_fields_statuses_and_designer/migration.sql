-- AlterEnum
ALTER TYPE "UserType" ADD VALUE 'DESIGNER';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "paymentTerms" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingAttentionTo" TEXT,
ADD COLUMN     "customerInvoiceContact" TEXT,
ADD COLUMN     "designerId" TEXT,
ADD COLUMN     "downPaymentType" TEXT,
ADD COLUMN     "downPaymentValue" DECIMAL(12,2),
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "installAddress" TEXT,
ADD COLUMN     "installDate" TIMESTAMP(3),
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "primaryCustomerContact" TEXT,
ADD COLUMN     "projectManagerId" TEXT,
ADD COLUMN     "salesOrderDate" TIMESTAMP(3),
ADD COLUMN     "salesRepId" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingAttentionTo" TEXT,
ADD COLUMN     "shippingDate" TIMESTAMP(3),
ADD COLUMN     "shippingMethod" TEXT,
ADD COLUMN     "shippingTracking" TEXT,
ADD COLUMN     "statusId" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "SalesOrderStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderStatus_name_key" ON "SalesOrderStatus"("name");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "SalesOrderStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

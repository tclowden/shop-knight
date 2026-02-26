-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "customerPoDate" TIMESTAMP(3),
ADD COLUMN     "customerPoNumber" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "estimatedValue" DECIMAL(12,2),
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "inHandDate" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "probability" DECIMAL(5,2),
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "QuoteLine" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN     "productId" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

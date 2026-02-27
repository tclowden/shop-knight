-- CreateEnum
CREATE TYPE "AttributeInputType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "pricingFormula" TEXT;

-- AlterTable
ALTER TABLE "QuoteLine" ADD COLUMN     "attributeValues" JSONB;

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN     "attributeValues" JSONB;

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" "AttributeInputType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "defaultValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_code_key" ON "ProductAttribute"("productId", "code");

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

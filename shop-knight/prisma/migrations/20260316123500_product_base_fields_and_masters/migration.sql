-- AlterTable
ALTER TABLE "Product"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "gpmPercent" DECIMAL(5,2),
  ADD COLUMN "incomeAccountId" TEXT,
  ADD COLUMN "type" TEXT;

-- CreateTable
CREATE TABLE "ProductCategory" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeAccount" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncomeAccount_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "ProductCategory_companyId_name_key" ON "ProductCategory"("companyId", "name");
CREATE UNIQUE INDEX "IncomeAccount_companyId_code_key" ON "IncomeAccount"("companyId", "code");
CREATE INDEX "Product_companyId_categoryId_idx" ON "Product"("companyId", "categoryId");
CREATE INDEX "Product_companyId_incomeAccountId_idx" ON "Product"("companyId", "incomeAccountId");
CREATE INDEX "Product_companyId_departmentId_idx" ON "Product"("companyId", "departmentId");

-- Foreign keys
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncomeAccount" ADD CONSTRAINT "IncomeAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_incomeAccountId_fkey" FOREIGN KEY ("incomeAccountId") REFERENCES "IncomeAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

import { prisma } from '@/lib/prisma';

let ensured = false;

export async function ensureProductAdminSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProductCategory" (
      "id" TEXT NOT NULL,
      "companyId" TEXT,
      "name" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "IncomeAccount" (
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

    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "incomeAccountId" TEXT;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "type" TEXT;
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gpmPercent" DECIMAL(5,2);

    CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_companyId_name_key" ON "ProductCategory"("companyId", "name");
    CREATE UNIQUE INDEX IF NOT EXISTS "IncomeAccount_companyId_code_key" ON "IncomeAccount"("companyId", "code");
    CREATE INDEX IF NOT EXISTS "Product_companyId_categoryId_idx" ON "Product"("companyId", "categoryId");
    CREATE INDEX IF NOT EXISTS "Product_companyId_incomeAccountId_idx" ON "Product"("companyId", "incomeAccountId");
    CREATE INDEX IF NOT EXISTS "Product_companyId_departmentId_idx" ON "Product"("companyId", "departmentId");
  `);

  ensured = true;
}

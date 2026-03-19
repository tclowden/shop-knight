-- Reconcile sales-order schema drift across environments

-- SalesOrder missing columns
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "earlyBirdDiscountDate" TIMESTAMP(3);
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "advancedReceivingDeadline" TIMESTAMP(3);
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "shipFromRoarkDate" TIMESTAMP(3);
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "travelToSiteStart" TIMESTAMP(3);
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "travelToSiteEnd" TIMESTAMP(3);
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "outboundShippingFromShowDate" TIMESTAMP(3);
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "estimatedInvoiceDate" TIMESTAMP(3);

-- Backfill SalesOrder.companyId from Opportunity when missing
UPDATE "SalesOrder" so
SET "companyId" = o."companyId"
FROM "Opportunity" o
WHERE so."opportunityId" = o.id
  AND so."companyId" IS NULL;

-- Align unique index shape to Prisma schema (@@unique([companyId, orderNumber]))
DROP INDEX IF EXISTS "SalesOrder_orderNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_companyId_orderNumber_key" ON "SalesOrder"("companyId", "orderNumber");

-- SalesOrder foreign keys (safe create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SalesOrder_companyId_fkey'
  ) THEN
    ALTER TABLE "SalesOrder"
      ADD CONSTRAINT "SalesOrder_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SalesOrder_departmentId_fkey'
  ) THEN
    ALTER TABLE "SalesOrder"
      ADD CONSTRAINT "SalesOrder_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- SalesOrderStatus missing multi-tenant column
ALTER TABLE "SalesOrderStatus" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- Backfill status company from linked sales orders where available
UPDATE "SalesOrderStatus" s
SET "companyId" = x."companyId"
FROM (
  SELECT "statusId", MAX("companyId") AS "companyId"
  FROM "SalesOrder"
  WHERE "statusId" IS NOT NULL AND "companyId" IS NOT NULL
  GROUP BY "statusId"
) x
WHERE s.id = x."statusId"
  AND s."companyId" IS NULL;

-- Replace old global unique status name with tenant-scoped unique
DROP INDEX IF EXISTS "SalesOrderStatus_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrderStatus_companyId_name_key" ON "SalesOrderStatus"("companyId", "name");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SalesOrderStatus_companyId_fkey'
  ) THEN
    ALTER TABLE "SalesOrderStatus"
      ADD CONSTRAINT "SalesOrderStatus_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- SalesOrderLine drift (older DBs missing this column)
ALTER TABLE "SalesOrderLine" ADD COLUMN IF NOT EXISTS "priceLocked" BOOLEAN NOT NULL DEFAULT false;

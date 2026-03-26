CREATE TABLE IF NOT EXISTS "ProductInventoryRequirement" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "productId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "qtyPerUnit" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductInventoryRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductInventoryRequirement_companyId_productId_inventoryItemId_key"
  ON "ProductInventoryRequirement"("companyId", "productId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "ProductInventoryRequirement_companyId_productId_idx"
  ON "ProductInventoryRequirement"("companyId", "productId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductInventoryRequirement_companyId_fkey') THEN
    ALTER TABLE "ProductInventoryRequirement"
      ADD CONSTRAINT "ProductInventoryRequirement_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductInventoryRequirement_productId_fkey') THEN
    ALTER TABLE "ProductInventoryRequirement"
      ADD CONSTRAINT "ProductInventoryRequirement_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductInventoryRequirement_inventoryItemId_fkey') THEN
    ALTER TABLE "ProductInventoryRequirement"
      ADD CONSTRAINT "ProductInventoryRequirement_inventoryItemId_fkey"
      FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

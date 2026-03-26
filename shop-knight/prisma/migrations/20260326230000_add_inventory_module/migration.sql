-- Inventory module: items + time-window reservations
CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "itemNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "location" TEXT,
  "totalQty" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_companyId_itemNumber_key" ON "InventoryItem"("companyId", "itemNumber");
CREATE INDEX IF NOT EXISTS "InventoryItem_companyId_active_name_idx" ON "InventoryItem"("companyId", "active", "name");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_companyId_fkey') THEN
    ALTER TABLE "InventoryItem"
      ADD CONSTRAINT "InventoryItem_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "InventoryReservation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "inventoryItemId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "salesOrderLineId" TEXT,
  "quantity" INTEGER NOT NULL,
  "reservedFrom" TIMESTAMP(3) NOT NULL,
  "reservedTo" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryReservation_companyId_inventoryItemId_reservedFrom_reservedTo_idx"
  ON "InventoryReservation"("companyId", "inventoryItemId", "reservedFrom", "reservedTo");
CREATE INDEX IF NOT EXISTS "InventoryReservation_companyId_salesOrderId_active_idx"
  ON "InventoryReservation"("companyId", "salesOrderId", "active");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReservation_companyId_fkey') THEN
    ALTER TABLE "InventoryReservation"
      ADD CONSTRAINT "InventoryReservation_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReservation_inventoryItemId_fkey') THEN
    ALTER TABLE "InventoryReservation"
      ADD CONSTRAINT "InventoryReservation_inventoryItemId_fkey"
      FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReservation_salesOrderId_fkey') THEN
    ALTER TABLE "InventoryReservation"
      ADD CONSTRAINT "InventoryReservation_salesOrderId_fkey"
      FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryReservation_salesOrderLineId_fkey') THEN
    ALTER TABLE "InventoryReservation"
      ADD CONSTRAINT "InventoryReservation_salesOrderLineId_fkey"
      FOREIGN KEY ("salesOrderLineId") REFERENCES "SalesOrderLine"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

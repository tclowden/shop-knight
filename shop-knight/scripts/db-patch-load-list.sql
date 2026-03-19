-- Idempotent patch for Sales Order Load Lists (dev-safe)

CREATE TABLE IF NOT EXISTS "LoadList" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Load List',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoadList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoadListItem" (
  "id" TEXT NOT NULL,
  "loadListId" TEXT NOT NULL,
  "salesOrderLineId" TEXT,
  "item" TEXT NOT NULL,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoadListItem_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoadList_salesOrderId_fkey') THEN
    ALTER TABLE "LoadList"
      ADD CONSTRAINT "LoadList_salesOrderId_fkey"
      FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoadListItem_loadListId_fkey') THEN
    ALTER TABLE "LoadListItem"
      ADD CONSTRAINT "LoadListItem_loadListId_fkey"
      FOREIGN KEY ("loadListId") REFERENCES "LoadList"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoadListItem_salesOrderLineId_fkey') THEN
    ALTER TABLE "LoadListItem"
      ADD CONSTRAINT "LoadListItem_salesOrderLineId_fkey"
      FOREIGN KEY ("salesOrderLineId") REFERENCES "SalesOrderLine"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LoadListItem_loadListId_sortOrder_idx" ON "LoadListItem"("loadListId", "sortOrder");

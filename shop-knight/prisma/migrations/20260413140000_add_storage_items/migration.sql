CREATE TABLE "StorageItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "itemNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rackId" TEXT,
    "spaceId" TEXT,
    "binId" TEXT,
    "photoFileName" TEXT,
    "photoMimeType" TEXT,
    "photoFileData" BYTEA,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageItem_companyId_itemNumber_key" ON "StorageItem"("companyId", "itemNumber");
CREATE INDEX "StorageItem_companyId_active_name_idx" ON "StorageItem"("companyId", "active", "name");
CREATE INDEX "StorageItem_companyId_rackId_spaceId_binId_idx" ON "StorageItem"("companyId", "rackId", "spaceId", "binId");

ALTER TABLE "StorageItem" ADD CONSTRAINT "StorageItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageItem" ADD CONSTRAINT "StorageItem_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "StorageRack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorageItem" ADD CONSTRAINT "StorageItem_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "StorageSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorageItem" ADD CONSTRAINT "StorageItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "StorageBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "StorageRack" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageRack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageSpace" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "rackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageBin" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageBin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItemStorageAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "inventoryItemId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "notes" TEXT,
    "photoFileName" TEXT,
    "photoMimeType" TEXT,
    "photoFileData" BYTEA,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "movedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItemStorageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageRack_companyId_name_key" ON "StorageRack"("companyId", "name");
CREATE INDEX "StorageRack_companyId_active_name_idx" ON "StorageRack"("companyId", "active", "name");

CREATE UNIQUE INDEX "StorageSpace_companyId_rackId_name_key" ON "StorageSpace"("companyId", "rackId", "name");
CREATE INDEX "StorageSpace_companyId_rackId_active_name_idx" ON "StorageSpace"("companyId", "rackId", "active", "name");

CREATE UNIQUE INDEX "StorageBin_companyId_spaceId_name_key" ON "StorageBin"("companyId", "spaceId", "name");
CREATE INDEX "StorageBin_companyId_spaceId_active_name_idx" ON "StorageBin"("companyId", "spaceId", "active", "name");

CREATE INDEX "InventoryItemStorageAssignment_companyId_inventoryItemId_startedAt_idx" ON "InventoryItemStorageAssignment"("companyId", "inventoryItemId", "startedAt");
CREATE INDEX "InventoryItemStorageAssignment_companyId_endedAt_idx" ON "InventoryItemStorageAssignment"("companyId", "endedAt");

-- AddForeignKey
ALTER TABLE "StorageRack" ADD CONSTRAINT "StorageRack_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageSpace" ADD CONSTRAINT "StorageSpace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageSpace" ADD CONSTRAINT "StorageSpace_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "StorageRack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageBin" ADD CONSTRAINT "StorageBin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageBin" ADD CONSTRAINT "StorageBin_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "StorageSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItemStorageAssignment" ADD CONSTRAINT "InventoryItemStorageAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItemStorageAssignment" ADD CONSTRAINT "InventoryItemStorageAssignment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItemStorageAssignment" ADD CONSTRAINT "InventoryItemStorageAssignment_binId_fkey" FOREIGN KEY ("binId") REFERENCES "StorageBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemStorageAssignment" ADD CONSTRAINT "InventoryItemStorageAssignment_movedById_fkey" FOREIGN KEY ("movedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StorageItem"
  ADD COLUMN "ownerCustomerId" TEXT,
  ADD COLUMN "pointOfContact" TEXT,
  ADD COLUMN "pointOfContactEmail" TEXT,
  ADD COLUMN "pointOfContactPhone" TEXT,
  ADD COLUMN "dateEnteredStorage" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StorageItem_companyId_ownerCustomerId_idx" ON "StorageItem"("companyId", "ownerCustomerId");

-- AddForeignKey
ALTER TABLE "StorageItem"
  ADD CONSTRAINT "StorageItem_ownerCustomerId_fkey"
  FOREIGN KEY ("ownerCustomerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

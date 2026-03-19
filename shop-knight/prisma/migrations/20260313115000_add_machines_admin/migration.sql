-- CreateTable
CREATE TABLE "Machine" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "costPerMinute" DECIMAL(12,4) NOT NULL,
  "setupMinutes" INTEGER,
  "hourlyCapacity" INTEGER,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_companyId_name_key" ON "Machine"("companyId", "name");

-- CreateIndex
CREATE INDEX "Machine_companyId_active_name_idx" ON "Machine"("companyId", "active", "name");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

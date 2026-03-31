-- CreateEnum
CREATE TYPE "PricingFormulaType" AS ENUM ('AREA', 'CYL_VOL', 'CYLINDRICAL_SURFACE_AREA', 'FIXED', 'HEIGHT', 'LENGTH', 'NORECALC', 'NONE', 'PBASE', 'PERMITER', 'TOTAL_AREA', 'UNIT', 'VOLUME', 'WIDTH');

-- CreateEnum
CREATE TYPE "PricingRateUnit" AS ENUM ('CU_IN', 'CU_FT', 'FEET', 'INCHES', 'SQ_IN', 'SQ_FT', 'UNIT');

-- CreateEnum
CREATE TYPE "PricingRatePer" AS ENUM ('HR', 'MIN', 'UNIT');

-- CreateEnum
CREATE TYPE "ModifierType" AS ENUM ('BOOLEAN', 'NUMERIC', 'RANGE');

-- CreateEnum
CREATE TYPE "ModifierUnit" AS ENUM ('PERCENT', 'CU_FT', 'DAYS', 'FEET', 'HOUR', 'INCHES', 'KM', 'METERS', 'MILES', 'SQ_FT', 'SQ_M', 'UNIT', 'YARD', 'CM', 'MM');

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "cost" DECIMAL(12,4) NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "markup" DECIMAL(12,4) NOT NULL,
    "setupCharge" DECIMAL(12,4) NOT NULL,
    "machineCharge" DECIMAL(12,4) NOT NULL,
    "otherCharge" DECIMAL(12,4) NOT NULL,
    "formula" "PricingFormulaType" NOT NULL,
    "productionRate" DECIMAL(12,4) NOT NULL,
    "units" "PricingRateUnit" NOT NULL,
    "per" "PricingRatePer" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineRate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "cost" DECIMAL(12,4) NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "markup" DECIMAL(12,4) NOT NULL,
    "units" TEXT NOT NULL,
    "setupCharge" DECIMAL(12,4) NOT NULL,
    "laborCharge" DECIMAL(12,4) NOT NULL,
    "otherCharge" DECIMAL(12,4) NOT NULL,
    "formula" "PricingFormulaType" NOT NULL,
    "productionRate" DECIMAL(12,4) NOT NULL,
    "rateUnit" "PricingRateUnit" NOT NULL,
    "per" "PricingRatePer" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "systemLookupName" TEXT NOT NULL,
    "type" "ModifierType" NOT NULL,
    "units" "ModifierUnit" NOT NULL,
    "showInternally" BOOLEAN NOT NULL DEFAULT true,
    "showCustomer" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LaborRate_companyId_name_key" ON "LaborRate"("companyId", "name");

-- CreateIndex
CREATE INDEX "LaborRate_companyId_active_name_idx" ON "LaborRate"("companyId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MachineRate_companyId_name_key" ON "MachineRate"("companyId", "name");

-- CreateIndex
CREATE INDEX "MachineRate_companyId_active_name_idx" ON "MachineRate"("companyId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Modifier_companyId_name_key" ON "Modifier"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Modifier_companyId_systemLookupName_key" ON "Modifier"("companyId", "systemLookupName");

-- CreateIndex
CREATE INDEX "Modifier_companyId_active_name_idx" ON "Modifier"("companyId", "active", "name");

-- AddForeignKey
ALTER TABLE "LaborRate" ADD CONSTRAINT "LaborRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineRate" ADD CONSTRAINT "MachineRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

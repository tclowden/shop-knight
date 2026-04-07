-- CreateEnum
CREATE TYPE "PricingComponentType" AS ENUM ('INK', 'OVERHEAD', 'LABOR', 'SUBSTRATE', 'MACHINE', 'MODIFIER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PricingValueType" AS ENUM ('FIXED', 'RATE', 'PERCENT');

-- CreateTable
CREATE TABLE "PricingProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingProfileComponent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentType" "PricingComponentType" NOT NULL,
    "valueType" "PricingValueType" NOT NULL DEFAULT 'RATE',
    "formulaType" "PricingFormulaType",
    "rateUnit" "PricingRateUnit",
    "ratePer" "PricingRatePer",
    "amount" DECIMAL(12,4) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingProfileComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPricingProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "productId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachinePricingProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "machineId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachinePricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstratePricingRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "substrateId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "valueType" "PricingValueType" NOT NULL DEFAULT 'FIXED',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstratePricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierPricingRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "modifierId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "valueType" "PricingValueType" NOT NULL DEFAULT 'RATE',
    "formulaType" "PricingFormulaType",
    "rateUnit" "PricingRateUnit",
    "ratePer" "PricingRatePer",
    "minValue" DECIMAL(12,4),
    "maxValue" DECIMAL(12,4),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLinePricingSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "salesOrderLineId" TEXT NOT NULL,
    "pricingProfileId" TEXT,
    "machineId" TEXT,
    "substrateId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2),
    "breakdown" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesOrderLinePricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingProfile_companyId_name_key" ON "PricingProfile"("companyId", "name");

-- CreateIndex
CREATE INDEX "PricingProfile_companyId_active_name_idx" ON "PricingProfile"("companyId", "active", "name");

-- CreateIndex
CREATE INDEX "PricingProfileComponent_companyId_componentType_active_idx" ON "PricingProfileComponent"("companyId", "componentType", "active");

-- CreateIndex
CREATE INDEX "PricingProfileComponent_profileId_sortOrder_idx" ON "PricingProfileComponent"("profileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPricingProfile_companyId_productId_profileId_key" ON "ProductPricingProfile"("companyId", "productId", "profileId");

-- CreateIndex
CREATE INDEX "ProductPricingProfile_companyId_productId_isDefault_idx" ON "ProductPricingProfile"("companyId", "productId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "MachinePricingProfile_companyId_machineId_profileId_key" ON "MachinePricingProfile"("companyId", "machineId", "profileId");

-- CreateIndex
CREATE INDEX "MachinePricingProfile_companyId_machineId_isDefault_idx" ON "MachinePricingProfile"("companyId", "machineId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "SubstratePricingRule_companyId_substrateId_profileId_key" ON "SubstratePricingRule"("companyId", "substrateId", "profileId");

-- CreateIndex
CREATE INDEX "SubstratePricingRule_companyId_profileId_active_idx" ON "SubstratePricingRule"("companyId", "profileId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierPricingRule_companyId_modifierId_profileId_key" ON "ModifierPricingRule"("companyId", "modifierId", "profileId");

-- CreateIndex
CREATE INDEX "ModifierPricingRule_companyId_profileId_active_idx" ON "ModifierPricingRule"("companyId", "profileId", "active");

-- CreateIndex
CREATE INDEX "SalesOrderLinePricingSnapshot_companyId_salesOrderLineId_computedAt_idx" ON "SalesOrderLinePricingSnapshot"("companyId", "salesOrderLineId", "computedAt");

-- CreateIndex
CREATE INDEX "SalesOrderLinePricingSnapshot_pricingProfileId_idx" ON "SalesOrderLinePricingSnapshot"("pricingProfileId");

-- AddForeignKey
ALTER TABLE "PricingProfile" ADD CONSTRAINT "PricingProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingProfileComponent" ADD CONSTRAINT "PricingProfileComponent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingProfileComponent" ADD CONSTRAINT "PricingProfileComponent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricingProfile" ADD CONSTRAINT "ProductPricingProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricingProfile" ADD CONSTRAINT "ProductPricingProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricingProfile" ADD CONSTRAINT "ProductPricingProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachinePricingProfile" ADD CONSTRAINT "MachinePricingProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachinePricingProfile" ADD CONSTRAINT "MachinePricingProfile_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachinePricingProfile" ADD CONSTRAINT "MachinePricingProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstratePricingRule" ADD CONSTRAINT "SubstratePricingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstratePricingRule" ADD CONSTRAINT "SubstratePricingRule_substrateId_fkey" FOREIGN KEY ("substrateId") REFERENCES "Substrate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstratePricingRule" ADD CONSTRAINT "SubstratePricingRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierPricingRule" ADD CONSTRAINT "ModifierPricingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierPricingRule" ADD CONSTRAINT "ModifierPricingRule_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierPricingRule" ADD CONSTRAINT "ModifierPricingRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PricingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLinePricingSnapshot" ADD CONSTRAINT "SalesOrderLinePricingSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLinePricingSnapshot" ADD CONSTRAINT "SalesOrderLinePricingSnapshot_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "SalesOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLinePricingSnapshot" ADD CONSTRAINT "SalesOrderLinePricingSnapshot_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "PricingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLinePricingSnapshot" ADD CONSTRAINT "SalesOrderLinePricingSnapshot_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLinePricingSnapshot" ADD CONSTRAINT "SalesOrderLinePricingSnapshot_substrateId_fkey" FOREIGN KEY ("substrateId") REFERENCES "Substrate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

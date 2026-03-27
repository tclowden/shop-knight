-- CreateEnum
CREATE TYPE "ProductPricingType" AS ENUM ('BASIC', 'FORMULA', 'GRID');

-- AlterEnum
ALTER TYPE "AttributeInputType" ADD VALUE IF NOT EXISTS 'MULTI_SELECT';

-- CreateEnum
CREATE TYPE "PricingEffectType" AS ENUM ('NONE', 'ADD', 'MULTIPLY', 'OVERRIDE', 'FORMULA_VAR');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "pricingType" "ProductPricingType" NOT NULL DEFAULT 'BASIC';

-- CreateTable
CREATE TABLE "ProductAttributeOption" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "priceEffectType" "PricingEffectType" NOT NULL DEFAULT 'NONE',
    "priceEffectValue" DECIMAL(12,4),
    "costEffectValue" DECIMAL(12,4),
    "formulaVarName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPricingGrid" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "xAxisLabel" TEXT,
    "yAxisLabel" TEXT,
    "xBreaks" JSONB NOT NULL,
    "yBreaks" JSONB NOT NULL,
    CONSTRAINT "ProductPricingGrid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPricingGridCell" (
    "id" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "xIndex" INTEGER NOT NULL,
    "yIndex" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    CONSTRAINT "ProductPricingGridCell_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ProductAttributeOption_attributeId_sortOrder_idx" ON "ProductAttributeOption"("attributeId", "sortOrder");
CREATE UNIQUE INDEX "ProductPricingGrid_productId_key" ON "ProductPricingGrid"("productId");
CREATE UNIQUE INDEX "ProductPricingGridCell_gridId_xIndex_yIndex_key" ON "ProductPricingGridCell"("gridId", "xIndex", "yIndex");

-- FKs
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPricingGrid" ADD CONSTRAINT "ProductPricingGrid_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPricingGridCell" ADD CONSTRAINT "ProductPricingGridCell_gridId_fkey"
  FOREIGN KEY ("gridId") REFERENCES "ProductPricingGrid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill legacy options JSON arrays into ProductAttributeOption
INSERT INTO "ProductAttributeOption" (
  "id", "attributeId", "label", "sortOrder", "priceEffectType", "priceEffectValue", "costEffectValue", "active"
)
SELECT
  concat('cao_', substr(md5(pa."id" || '_' || opt.idx::text || '_' || coalesce(opt.item, '')), 1, 24)) AS "id",
  pa."id" AS "attributeId",
  nullif(trim(split_part(opt.item, '|', 1)), '') AS "label",
  (opt.idx - 1) AS "sortOrder",
  CASE
    WHEN trim(split_part(opt.item, '|', 2)) ~ '^[-+]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$' THEN 'ADD'::"PricingEffectType"
    ELSE 'NONE'::"PricingEffectType"
  END AS "priceEffectType",
  CASE
    WHEN trim(split_part(opt.item, '|', 2)) ~ '^[-+]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
      THEN (trim(split_part(opt.item, '|', 2)))::DECIMAL(12,4)
    ELSE NULL
  END AS "priceEffectValue",
  CASE
    WHEN trim(split_part(opt.item, '|', 3)) ~ '^[-+]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$'
      THEN (trim(split_part(opt.item, '|', 3)))::DECIMAL(12,4)
    ELSE NULL
  END AS "costEffectValue",
  true AS "active"
FROM "ProductAttribute" pa
CROSS JOIN LATERAL (
  SELECT elem.value AS item, elem.ordinality AS idx
  FROM jsonb_array_elements_text(COALESCE(pa."options", '[]'::jsonb)) WITH ORDINALITY AS elem(value, ordinality)
) opt
WHERE nullif(trim(split_part(opt.item, '|', 1)), '') IS NOT NULL;

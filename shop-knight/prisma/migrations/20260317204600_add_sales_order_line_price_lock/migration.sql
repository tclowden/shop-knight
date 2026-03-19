-- Add line-level price lock for sales order lines
ALTER TABLE "SalesOrderLine"
ADD COLUMN "priceLocked" BOOLEAN NOT NULL DEFAULT false;

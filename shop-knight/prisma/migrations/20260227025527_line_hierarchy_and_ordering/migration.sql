-- AlterTable
ALTER TABLE "QuoteLine" ADD COLUMN     "collapsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentLineId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN     "collapsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentLineId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

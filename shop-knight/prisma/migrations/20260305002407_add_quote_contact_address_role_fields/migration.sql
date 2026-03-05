-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingAttentionTo" TEXT,
ADD COLUMN     "customerContactRole" TEXT,
ADD COLUMN     "installAddress" TEXT,
ADD COLUMN     "projectManagerId" TEXT,
ADD COLUMN     "quoteDate" TIMESTAMP(3),
ADD COLUMN     "salesRepId" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingAttentionTo" TEXT;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

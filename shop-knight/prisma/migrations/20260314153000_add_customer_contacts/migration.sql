CREATE TABLE "CustomerContact" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerContact_customerId_name_idx" ON "CustomerContact"("customerId", "name");

ALTER TABLE "CustomerContact"
ADD CONSTRAINT "CustomerContact_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

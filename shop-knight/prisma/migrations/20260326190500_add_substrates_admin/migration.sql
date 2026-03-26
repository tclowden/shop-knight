-- Add substrates admin model for centralized substrate pricing options
CREATE TABLE IF NOT EXISTS "Substrate" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "addOnPrice" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Substrate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Substrate_companyId_name_key" ON "Substrate"("companyId", "name");
CREATE INDEX IF NOT EXISTS "Substrate_companyId_active_name_idx" ON "Substrate"("companyId", "active", "name");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Substrate_companyId_fkey'
  ) THEN
    ALTER TABLE "Substrate"
      ADD CONSTRAINT "Substrate_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

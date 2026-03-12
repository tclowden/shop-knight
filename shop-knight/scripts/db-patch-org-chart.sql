-- Idempotent patch for org-chart/title support
-- Safe to run multiple times in dev.

CREATE TABLE IF NOT EXISTS "Title" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Title_companyId_fkey'
  ) THEN
    ALTER TABLE "Title"
      ADD CONSTRAINT "Title_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Title_companyId_name_key" ON "Title"("companyId", "name");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "titleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reportsToId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmployee" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_titleId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_titleId_fkey"
      FOREIGN KEY ("titleId") REFERENCES "Title"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_reportsToId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_reportsToId_fkey"
      FOREIGN KEY ("reportsToId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

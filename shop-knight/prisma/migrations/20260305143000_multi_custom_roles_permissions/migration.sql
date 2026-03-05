-- AlterTable
ALTER TABLE "CustomRole" ADD COLUMN "permissions" JSONB;

-- CreateTable
CREATE TABLE "UserCustomRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserCustomRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- Backfill existing single-role assignments
INSERT INTO "UserCustomRole" ("userId", "roleId")
SELECT "id", "customRoleId"
FROM "User"
WHERE "customRoleId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "UserCustomRole" ADD CONSTRAINT "UserCustomRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCustomRole" ADD CONSTRAINT "UserCustomRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old single-role relation
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_customRoleId_fkey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "customRoleId";

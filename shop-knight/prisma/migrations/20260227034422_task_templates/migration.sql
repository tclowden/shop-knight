-- CreateEnum
CREATE TYPE "TemplateAssigneeMode" AS ENUM ('UNASSIGNED', 'SPECIFIC_USER', 'PM', 'PROJECT_COORDINATOR');

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "assigneeMode" "TemplateAssigneeMode" NOT NULL DEFAULT 'UNASSIGNED',
    "specificAssigneeId" TEXT,

    CONSTRAINT "TaskTemplateStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_name_key" ON "TaskTemplate"("name");

-- AddForeignKey
ALTER TABLE "TaskTemplateStep" ADD CONSTRAINT "TaskTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplateStep" ADD CONSTRAINT "TaskTemplateStep_specificAssigneeId_fkey" FOREIGN KEY ("specificAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

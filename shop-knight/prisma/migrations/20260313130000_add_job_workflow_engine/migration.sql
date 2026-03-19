-- CreateTable
CREATE TABLE "JobWorkflowTemplate" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobWorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobWorkflowStep" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "assigneeMode" "TemplateAssigneeMode" NOT NULL DEFAULT 'UNASSIGNED',
  "specificAssigneeId" TEXT,

  CONSTRAINT "JobWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobWorkflowRun" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "workflowTemplateId" TEXT NOT NULL,
  "entityType" "EntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "currentStepSortOrder" INTEGER,
  "projectManagerUserId" TEXT,
  "projectCoordinatorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobWorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobWorkflowStepRun" (
  "id" TEXT NOT NULL,
  "workflowRunId" TEXT NOT NULL,
  "stepName" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "assigneeMode" "TemplateAssigneeMode" NOT NULL DEFAULT 'UNASSIGNED',
  "assigneeId" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "activatedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobWorkflowStepRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobWorkflowTemplate_companyId_name_key" ON "JobWorkflowTemplate"("companyId", "name");

-- CreateIndex
CREATE INDEX "JobWorkflowStep_workflowId_sortOrder_idx" ON "JobWorkflowStep"("workflowId", "sortOrder");

-- CreateIndex
CREATE INDEX "JobWorkflowRun_companyId_entityType_entityId_idx" ON "JobWorkflowRun"("companyId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "JobWorkflowStepRun_workflowRunId_sortOrder_key" ON "JobWorkflowStepRun"("workflowRunId", "sortOrder");

-- CreateIndex
CREATE INDEX "JobWorkflowStepRun_workflowRunId_status_sortOrder_idx" ON "JobWorkflowStepRun"("workflowRunId", "status", "sortOrder");

-- AddForeignKey
ALTER TABLE "JobWorkflowTemplate" ADD CONSTRAINT "JobWorkflowTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobWorkflowStep" ADD CONSTRAINT "JobWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "JobWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobWorkflowStep" ADD CONSTRAINT "JobWorkflowStep_specificAssigneeId_fkey" FOREIGN KEY ("specificAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobWorkflowRun" ADD CONSTRAINT "JobWorkflowRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobWorkflowRun" ADD CONSTRAINT "JobWorkflowRun_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "JobWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobWorkflowStepRun" ADD CONSTRAINT "JobWorkflowStepRun_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "JobWorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobWorkflowStepRun" ADD CONSTRAINT "JobWorkflowStepRun_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

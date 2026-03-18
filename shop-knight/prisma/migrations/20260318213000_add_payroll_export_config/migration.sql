-- CreateTable
CREATE TABLE "PayrollExportConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "paycomEarningCode" TEXT NOT NULL DEFAULT 'REG',
    "defaultDepartmentCode" TEXT,
    "employeeCodeField" TEXT NOT NULL DEFAULT 'USER_ID',
    "departmentMap" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollExportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollExportConfig_companyId_key" ON "PayrollExportConfig"("companyId");

-- AddForeignKey
ALTER TABLE "PayrollExportConfig" ADD CONSTRAINT "PayrollExportConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

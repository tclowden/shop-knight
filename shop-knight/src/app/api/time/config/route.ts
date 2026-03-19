import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAll } from '@/lib/time-access';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

  const config = await prisma.payrollExportConfig.findUnique({ where: { companyId } });
  return NextResponse.json(config || {
    paycomEarningCode: 'REG',
    defaultDepartmentCode: '',
    employeeCodeField: 'USER_ID',
    departmentMap: {},
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
  if (!canManageAll(session.user.permissions || [])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const updated = await prisma.payrollExportConfig.upsert({
    where: { companyId },
    create: {
      companyId,
      paycomEarningCode: String(body?.paycomEarningCode || 'REG'),
      defaultDepartmentCode: body?.defaultDepartmentCode ? String(body.defaultDepartmentCode) : null,
      employeeCodeField: String(body?.employeeCodeField || 'USER_ID'),
      departmentMap: body?.departmentMap && typeof body.departmentMap === 'object' ? body.departmentMap : {},
    },
    update: {
      paycomEarningCode: String(body?.paycomEarningCode || 'REG'),
      defaultDepartmentCode: body?.defaultDepartmentCode ? String(body.defaultDepartmentCode) : null,
      employeeCodeField: String(body?.employeeCodeField || 'USER_ID'),
      departmentMap: body?.departmentMap && typeof body.departmentMap === 'object' ? body.departmentMap : {},
    },
  });

  return NextResponse.json(updated);
}

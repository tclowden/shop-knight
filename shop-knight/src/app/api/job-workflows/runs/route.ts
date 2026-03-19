import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
  }

  const runs = await prisma.jobWorkflowRun.findMany({
    where: withCompany(companyId, { entityType: entityType as 'OPPORTUNITY' | 'QUOTE' | 'SALES_ORDER' | 'SALES_ORDER_LINE' | 'PURCHASE_ORDER' | 'PROJECT' | 'JOB' | 'CUSTOMER' | 'VENDOR' | 'PRODUCT' | 'USER', entityId }),
    include: {
      workflowTemplate: { select: { id: true, name: true } },
      steps: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(runs);
}

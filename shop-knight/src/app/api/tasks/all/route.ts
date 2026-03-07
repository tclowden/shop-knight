import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

async function getEntityLabel(entityType: string, entityId: string) {
  if (entityType === 'OPPORTUNITY') {
    const x = await prisma.opportunity.findUnique({ where: { id: entityId }, select: { name: true } });
    return x?.name || entityId;
  }
  if (entityType === 'QUOTE') {
    const x = await prisma.quote.findUnique({ where: { id: entityId }, select: { quoteNumber: true, title: true } });
    return x ? `${x.quoteNumber}${x.title ? ` • ${x.title}` : ''}` : entityId;
  }
  if (entityType === 'SALES_ORDER') {
    const x = await prisma.salesOrder.findUnique({ where: { id: entityId }, select: { orderNumber: true } });
    return x?.orderNumber || entityId;
  }
  if (entityType === 'CUSTOMER') {
    const x = await prisma.customer.findUnique({ where: { id: entityId }, select: { name: true } });
    return x?.name || entityId;
  }
  if (entityType === 'VENDOR') {
    const x = await prisma.vendor.findUnique({ where: { id: entityId }, select: { name: true } });
    return x?.name || entityId;
  }
  if (entityType === 'PRODUCT') {
    const x = await prisma.product.findUnique({ where: { id: entityId }, select: { sku: true, name: true } });
    return x ? `${x.sku} • ${x.name}` : entityId;
  }
  if (entityType === 'USER') {
    const x = await prisma.user.findUnique({ where: { id: entityId }, select: { name: true } });
    return x?.name || entityId;
  }
  return entityId;
}

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const includeDone = searchParams.get('includeDone') === 'true';

  const tasks = await prisma.task.findMany({
    where: includeDone ? undefined : { status: { not: 'DONE' } },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
  });

  const withEntity = await Promise.all(
    tasks.map(async (t) => ({
      ...t,
      entityLabel: await getEntityLabel(t.entityType, t.entityId),
    }))
  );

  return NextResponse.json(withEntity);
}

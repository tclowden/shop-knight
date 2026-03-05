import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: { customer: true, salesRep: true, projectManager: true },
  });

  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  return NextResponse.json({
    id: opportunity.id,
    name: opportunity.name,
    stage: opportunity.stage,
    customer: opportunity.customer.name,
    source: opportunity.source,
    priority: opportunity.priority,
    estimatedValue: opportunity.estimatedValue,
    probability: opportunity.probability,
    expectedCloseDate: opportunity.expectedCloseDate,
    dueDate: opportunity.dueDate,
    inHandDate: opportunity.inHandDate,
    salesRepName: opportunity.salesRep?.name ?? null,
    projectManagerName: opportunity.projectManager?.name ?? null,
    description: opportunity.description,
  });
}

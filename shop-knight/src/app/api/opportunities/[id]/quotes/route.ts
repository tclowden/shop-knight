import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function quoteNumber() {
  return `Q-${Date.now().toString().slice(-6)}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const quotes = await prisma.quote.findMany({
    where: withCompany(companyId, { opportunityId: id }),
    orderBy: { quoteNumber: 'asc' },
  });
  return NextResponse.json(quotes);
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;

  const opportunity = await prisma.opportunity.findFirst({ where: withCompany(companyId, { id }) });
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const quote = await prisma.quote.create({
    data: {
      companyId,
      opportunityId: id,
      quoteNumber: quoteNumber(),
      status: 'DRAFT',
    },
  });

  await prisma.opportunity.update({
    where: { id },
    data: { stage: 'QUOTED' },
  });

  return NextResponse.json(quote, { status: 201 });
}

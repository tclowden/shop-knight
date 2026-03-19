import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: withCompany(companyId, { id }) });
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(customer);
}

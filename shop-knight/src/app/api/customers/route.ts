import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const customers = await prisma.customer.findMany({ where: withCompany(companyId), orderBy: { name: 'asc' } });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const additionalFeePercent = body?.additionalFeePercent === undefined || body?.additionalFeePercent === null || body?.additionalFeePercent === ''
    ? 0
    : Number(body.additionalFeePercent);

  const customer = await prisma.customer.create({
    data: {
      companyId,
      name,
      email: body?.email ? String(body.email) : null,
      phone: body?.phone ? String(body.phone) : null,
      paymentTerms: body?.paymentTerms ? String(body.paymentTerms) : null,
      additionalFeePercent: Number.isFinite(additionalFeePercent) ? additionalFeePercent : 0,
    },
  });
  return NextResponse.json(customer, { status: 201 });
}

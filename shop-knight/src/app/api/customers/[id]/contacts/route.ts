import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const contacts = await prisma.customerContact.findMany({
    where: { customerId: id },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(contacts);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const contact = await prisma.customerContact.create({
    data: {
      customerId: id,
      name,
      email: body?.email ? String(body.email).trim() : null,
      phone: body?.phone ? String(body.phone).trim() : null,
      title: body?.title ? String(body.title).trim() : null,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}

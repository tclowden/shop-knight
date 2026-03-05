import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const customer = await prisma.customer.create({
    data: {
      name,
      email: body?.email ? String(body.email) : null,
      phone: body?.phone ? String(body.phone) : null,
      paymentTerms: body?.paymentTerms ? String(body.paymentTerms) : null,
    },
  });
  return NextResponse.json(customer, { status: 201 });
}

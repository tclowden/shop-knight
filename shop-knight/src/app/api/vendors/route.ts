import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const vendors = await prisma.vendor.findMany({ where: withCompany(companyId), orderBy: { name: 'asc' } });
  return NextResponse.json(vendors);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const vendor = await prisma.vendor.create({
    data: {
      companyId,
      name,
      email: body?.email ? String(body.email) : null,
      phone: body?.phone ? String(body.phone) : null,
    },
  });
  return NextResponse.json(vendor, { status: 201 });
}

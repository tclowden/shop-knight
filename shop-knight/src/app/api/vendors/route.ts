import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const vendors = await prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(vendors);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const vendor = await prisma.vendor.create({
    data: {
      name,
      email: body?.email ? String(body.email) : null,
      phone: body?.phone ? String(body.phone) : null,
    },
  });
  return NextResponse.json(vendor, { status: 201 });
}

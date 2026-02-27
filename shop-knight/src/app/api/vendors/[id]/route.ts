import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(vendor);
}

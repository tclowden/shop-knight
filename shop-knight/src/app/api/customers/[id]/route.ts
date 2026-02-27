import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(customer);
}

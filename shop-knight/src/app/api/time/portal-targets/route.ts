import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

  const q = new URL(request.url).searchParams.get('q')?.trim() || '';

  const [salesOrders, quotes, jobs] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { companyId, OR: q ? [{ orderNumber: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }] : undefined },
      select: { id: true, orderNumber: true, title: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quote.findMany({
      where: { companyId, OR: q ? [{ quoteNumber: { contains: q, mode: 'insensitive' } }, { title: { contains: q, mode: 'insensitive' } }] : undefined },
      select: { id: true, quoteNumber: true, title: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.findMany({
      where: { companyId, OR: q ? [{ name: { contains: q, mode: 'insensitive' } }] : undefined },
      select: { id: true, name: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({ salesOrders, quotes, jobs });
}

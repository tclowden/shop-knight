import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET(req: Request) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const items = await prisma.amexTransaction.findMany({
    where: status && status !== 'ALL'
      ? withCompany(companyId, { status: status as 'UNMATCHED' | 'MATCHED' | 'IGNORED' })
      : withCompany(companyId),
    include: { expenseLine: { select: { id: true, merchant: true, amount: true } } },
    orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const postedAt = body?.postedAt ? new Date(String(body.postedAt)) : null;
  const merchant = String(body?.merchant || '').trim();
  const amount = toNumber(body?.amount);

  if (!postedAt || Number.isNaN(postedAt.getTime()) || !merchant || amount === null) {
    return NextResponse.json({ error: 'postedAt, merchant, and amount are required' }, { status: 400 });
  }

  const created = await prisma.amexTransaction.create({
    data: {
      companyId,
      postedAt,
      merchant,
      amount,
      currency: body?.currency ? String(body.currency) : 'USD',
      reference: body?.reference ? String(body.reference) : null,
      source: body?.source ? String(body.source) : 'manual',
      status: 'UNMATCHED',
    },
  });

  return NextResponse.json(created, { status: 201 });
}

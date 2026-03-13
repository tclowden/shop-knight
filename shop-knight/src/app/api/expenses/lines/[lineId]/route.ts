import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ lineId: string }> };

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { lineId } = await ctx.params;
  const line = await prisma.expenseLine.findFirst({
    where: { id: lineId, expenseReport: withCompany(companyId) },
  });
  if (!line) return NextResponse.json({ error: 'Line not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    expenseDate?: Date;
    merchant?: string;
    category?: string;
    description?: string | null;
    paymentMethod?: string | null;
    amount?: number;
    taxAmount?: number | null;
    currency?: string;
    receiptRef?: string | null;
  } = {};

  if (body?.expenseDate) data.expenseDate = new Date(String(body.expenseDate));
  if (typeof body?.merchant === 'string') data.merchant = body.merchant.trim();
  if (typeof body?.category === 'string') data.category = body.category.trim();
  if (body?.description !== undefined) data.description = body.description ? String(body.description) : null;
  if (body?.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod ? String(body.paymentMethod) : null;
  if (body?.amount !== undefined) {
    const n = toNumber(body.amount);
    if (n === null) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    data.amount = n;
  }
  if (body?.taxAmount !== undefined) {
    if (body.taxAmount === '') data.taxAmount = null;
    else {
      const n = toNumber(body.taxAmount);
      if (n === null) return NextResponse.json({ error: 'Invalid taxAmount' }, { status: 400 });
      data.taxAmount = n;
    }
  }
  if (typeof body?.currency === 'string') data.currency = body.currency;
  if (body?.receiptRef !== undefined) data.receiptRef = body.receiptRef ? String(body.receiptRef) : null;

  const updated = await prisma.expenseLine.update({ where: { id: lineId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { lineId } = await ctx.params;
  const line = await prisma.expenseLine.findFirst({
    where: { id: lineId, expenseReport: withCompany(companyId) },
  });
  if (!line) return NextResponse.json({ error: 'Line not found' }, { status: 404 });

  await prisma.expenseLine.delete({ where: { id: lineId } });
  return NextResponse.json({ ok: true });
}

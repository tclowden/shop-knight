import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const report = await prisma.expenseReport.findFirst({ where: withCompany(companyId, { id }) });
  if (!report) return NextResponse.json({ error: 'Expense report not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const expenseDate = body?.expenseDate ? new Date(String(body.expenseDate)) : null;
  const merchant = String(body?.merchant || '').trim();
  const category = String(body?.category || '').trim();
  const amount = toNumber(body?.amount);
  const taxAmount = body?.taxAmount === '' || body?.taxAmount === undefined ? null : toNumber(body?.taxAmount);

  if (!expenseDate || Number.isNaN(expenseDate.getTime()) || !merchant || !category || amount === null) {
    return NextResponse.json({ error: 'expenseDate, merchant, category, and amount are required' }, { status: 400 });
  }

  const created = await prisma.expenseLine.create({
    data: {
      expenseReportId: id,
      expenseDate,
      merchant,
      category,
      amount,
      taxAmount,
      description: body?.description ? String(body.description) : null,
      paymentMethod: body?.paymentMethod ? String(body.paymentMethod) : null,
      currency: body?.currency ? String(body.currency) : 'USD',
      receiptRef: body?.receiptRef ? String(body.receiptRef) : null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ itemId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { itemId } = await ctx.params;
  const purchase = await prisma.salesOrderPurchaseItem.findFirst({
    where: { id: itemId, salesOrder: withCompany(companyId) },
    include: { vendor: { select: { name: true } } },
  });
  if (!purchase) return NextResponse.json({ error: 'Purchase row not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const expenseReportId = String(body?.expenseReportId || '').trim();
  if (!expenseReportId) return NextResponse.json({ error: 'expenseReportId required' }, { status: 400 });

  const report = await prisma.expenseReport.findFirst({ where: withCompany(companyId, { id: expenseReportId }) });
  if (!report) return NextResponse.json({ error: 'Expense report not found' }, { status: 404 });

  const created = await prisma.expenseLine.create({
    data: {
      expenseReportId,
      expenseDate: new Date(),
      merchant: purchase.vendor?.name || purchase.item,
      category: 'Purchasing',
      description: purchase.description || purchase.item,
      paymentMethod: purchase.purchasedBy === 'ON_ACCOUNT' ? 'On Account / PO' : 'Credit Card',
      amount: purchase.totalCost,
      taxAmount: null,
      currency: 'USD',
      receiptRef: purchase.receiptRef,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

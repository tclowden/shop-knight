import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ lineId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { lineId } = await ctx.params;
  const line = await prisma.expenseLine.findFirst({
    where: { id: lineId, expenseReport: withCompany(companyId) },
  });
  if (!line) return NextResponse.json({ error: 'Line not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  if (!bytes.byteLength) return NextResponse.json({ error: 'file is empty' }, { status: 400 });

  const receipt = await prisma.expenseReceipt.create({
    data: {
      expenseLineId: lineId,
      fileName: file.name || 'receipt',
      mimeType: file.type || 'application/octet-stream',
      fileData: Buffer.from(bytes),
    },
  });

  await prisma.expenseLine.update({ where: { id: lineId }, data: { receiptRef: `/api/expenses/receipts/${receipt.id}` } });

  return NextResponse.json({ id: receipt.id, url: `/api/expenses/receipts/${receipt.id}` }, { status: 201 });
}

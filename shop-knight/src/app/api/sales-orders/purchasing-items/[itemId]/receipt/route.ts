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
  });
  if (!purchase) return NextResponse.json({ error: 'Purchase row not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  if (!bytes.byteLength) return NextResponse.json({ error: 'file is empty' }, { status: 400 });
  if (bytes.byteLength > 25 * 1024 * 1024) return NextResponse.json({ error: 'file too large (max 25MB)' }, { status: 400 });

  const receipt = await prisma.salesOrderPurchaseReceipt.create({
    data: {
      purchaseItemId: itemId,
      fileName: file.name || 'receipt',
      mimeType: file.type || 'application/octet-stream',
      fileData: Buffer.from(bytes),
    },
  });

  const url = `/api/sales-orders/purchasing-receipts/${receipt.id}`;
  await prisma.salesOrderPurchaseItem.update({ where: { id: itemId }, data: { receiptRef: url } });

  return NextResponse.json({ id: receipt.id, url }, { status: 201 });
}

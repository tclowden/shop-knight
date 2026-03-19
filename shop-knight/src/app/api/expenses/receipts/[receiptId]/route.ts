import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ receiptId: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requirePermissions(['expenses.view']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { receiptId } = await ctx.params;
  const receipt = await prisma.expenseReceipt.findFirst({
    where: {
      id: receiptId,
      expenseLine: {
        expenseReport: withCompany(companyId),
      },
    },
    select: { fileData: true, fileName: true, mimeType: true },
  });

  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

  return new NextResponse(new Uint8Array(receipt.fileData), {
    headers: {
      'Content-Type': receipt.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${receipt.fileName}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}

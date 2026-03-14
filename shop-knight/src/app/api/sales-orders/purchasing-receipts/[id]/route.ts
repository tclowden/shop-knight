import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'PURCHASING', 'OPERATIONS', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const receipt = await prisma.salesOrderPurchaseReceipt.findFirst({
    where: {
      id,
      purchaseItem: {
        salesOrder: withCompany(companyId),
      },
    },
    select: { fileName: true, mimeType: true, fileData: true },
  });
  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });

  return new NextResponse(new Uint8Array(receipt.fileData), {
    headers: {
      'Content-Type': receipt.mimeType,
      'Content-Disposition': `inline; filename="${receipt.fileName}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}

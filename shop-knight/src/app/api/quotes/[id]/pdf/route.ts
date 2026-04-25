import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { renderQuotePdf } from '@/lib/quote-pdf';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) {
    return NextResponse.json({ error: 'No active company' }, { status: 400 });
  }

  const { id } = await params;
  const quote = await prisma.quote.findFirst({
    where: withCompany(companyId, { id }),
    include: {
      opportunity: { include: { customer: true } },
      salesRep: true,
      projectManager: true,
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get('download') === '1';
  const pdf = await renderQuotePdf({
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    companyName: quote.companyName || quote.opportunity.customer.name,
    customerName: quote.opportunity.customer.name,
    opportunityName: quote.opportunity.name,
    quoteDate: quote.quoteDate,
    dueDate: quote.dueDate,
    expiryDate: quote.expiryDate,
    billingAddress: quote.billingAddress,
    shippingAddress: quote.shippingAddress,
    installAddress: quote.installAddress,
    customerContactRole: quote.customerContactRole,
    salesRepName: quote.salesRep?.name || null,
    projectManagerName: quote.projectManager?.name || null,
    lines: quote.lines.map((line) => ({
      description: line.description,
      qty: line.qty,
      unitPrice: Number(line.unitPrice || 0),
      taxRate: Number(line.taxRate ?? 0),
    })),
  });

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${quote.quoteNumber}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

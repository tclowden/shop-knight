import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';
import { sendSms } from '@/lib/sms';

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function buildQuoteSms(params: {
  quoteNumber: string;
  customerName: string;
  opportunityName: string;
  total: unknown;
  appUrl: string;
  quoteId: string;
}) {
  const pdfUrl = `${params.appUrl}/api/quotes/${params.quoteId}/pdf`;
  return `Quote ${params.quoteNumber} for ${params.customerName} is ready. Project: ${params.opportunityName}. Total: ${formatMoney(params.total)}. Download PDF: ${pdfUrl}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const to = String(body?.phone || '').trim();
  if (!to) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  const quote = await prisma.quote.findFirst({
    where: withCompany(companyId, { id }),
    include: {
      opportunity: { include: { customer: true } },
      lines: true,
    },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const subtotal = quote.lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitPrice || 0), 0);
  const taxTotal = quote.lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitPrice || 0) * Number(line.taxRate ?? 0), 0);
  const total = quote.totalPriceWithTaxInDollars ?? subtotal + taxTotal;
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const message = String(body?.message || '').trim() || buildQuoteSms({
    quoteNumber: quote.quoteNumber,
    customerName: quote.opportunity.customer.name,
    opportunityName: quote.opportunity.name,
    total,
    appUrl,
    quoteId: quote.id,
  });

  try {
    const result = await sendSms({ to, body: message });
    await prisma.quote.update({
      where: { id: quote.id },
      data: { lastEmailedDate: new Date() },
    });

    return NextResponse.json({ ok: true, sid: result.sid, to: result.to, body: result.body });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send SMS';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

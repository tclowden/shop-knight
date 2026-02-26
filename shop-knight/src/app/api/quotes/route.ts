import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const quotes = await prisma.quote.findMany({
    include: {
      opportunity: {
        include: {
          customer: true,
        },
      },
      lines: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    quotes.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      title: q.title,
      status: q.status,
      workflowState: q.workflowState,
      txnDate: q.txnDate,
      expiryDate: q.expiryDate,
      totalPriceInDollars: q.totalPriceInDollars,
      totalTaxInDollars: q.totalTaxInDollars,
      totalPriceWithTaxInDollars: q.totalPriceWithTaxInDollars,
      opportunity: q.opportunity.name,
      customer: q.opportunity.customer.name,
      createdAt: q.createdAt,
      lineItems: q.lines,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const opportunityId = String(body?.opportunityId || '').trim();
  const quoteNumber = String(body?.txnNumber || body?.quoteNumber || '').trim();

  if (!opportunityId || !quoteNumber) {
    return NextResponse.json({ error: 'opportunityId and txnNumber/quoteNumber are required' }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : [];

  try {
    const created = await prisma.quote.create({
      data: {
        opportunityId,
        quoteNumber,
        txnNumber: quoteNumber,
        status: body?.workflowState === 'accepted' ? 'ACCEPTED' : 'DRAFT',
        title: body?.title ? String(body.title) : null,
        description: body?.description ? String(body.description) : null,
        txnDate: toDate(body?.txnDate),
        totalPriceInDollars: toNumber(body?.totalPriceInDollars),
        totalTaxInDollars: toNumber(body?.totalTaxInDollars),
        totalPriceWithTaxInDollars: toNumber(body?.totalPriceWithTaxInDollars),
        workflowState: body?.workflowState ? String(body.workflowState) : 'draft',
        expiryDate: toDate(body?.expiryDate),
        nextContactDate: toDate(body?.nextContactDate),
        potentialClosingDate: toDate(body?.potentialClosingDate),
        closingPotential: toNumber(body?.closingPotential),
        customerPoNumber: body?.customerPoNumber ? String(body.customerPoNumber) : null,
        customerPoDate: toDate(body?.customerPoDate),
        autoExpire: Boolean(body?.autoExpire),
        downpaymentPercent: toNumber(body?.downpaymentPercent),
        shippingTracking: body?.shippingTracking ? String(body.shippingTracking) : null,
        shippingDate: toDate(body?.shippingDate),
        customerNote: body?.customerNote ? String(body.customerNote) : null,
        quoteFor: body?.quoteFor ? String(body.quoteFor) : null,
        site: body?.site ? String(body.site) : null,
        quickQuote: Boolean(body?.quickQuote),
        dueDate: toDate(body?.dueDate),
        inHandDate: toDate(body?.inHandDate),
        primaryContactName: body?.primaryContact?.name ? String(body.primaryContact.name) : null,
        primaryContactEmail: body?.primaryContact?.primaryEmail ? String(body.primaryContact.primaryEmail) : null,
        primaryContactPhoneWithExt: body?.primaryContact?.phoneWithExt ? String(body.primaryContact.phoneWithExt) : null,
        primarySalesRepName: body?.primarySalesRep?.name ? String(body.primarySalesRep.name) : null,
        companyName: body?.company?.name ? String(body.company.name) : null,
        lines: {
          create: lineItems.map((line: Record<string, unknown>) => ({
            description: String(line?.description || line?.name || 'Line item'),
            qty: Number(line?.quantity || 1),
            unitPrice: Number(line?.priceInDollars || line?.unitPrice || 0),
            productId: line?.productId ? String(line.productId) : null,
            name: line?.name ? String(line.name) : null,
            fullDescription: line?.fullDescription ? String(line.fullDescription) : null,
            uom: line?.uom ? String(line.uom) : null,
            costInDollars: toNumber(line?.costInDollars),
            suggestedPriceInDollars: toNumber(line?.suggestedPriceInDollars),
            totalPriceInDollars: toNumber(line?.totalPriceInDollars),
            totalCostInDollars: toNumber(line?.totalCostInDollars),
            totalTaxInDollars: toNumber(line?.totalTaxInDollars),
            workflowState: line?.workflowState ? String(line.workflowState) : null,
            saleType: line?.saleType ? String(line.saleType) : null,
            taxable: Boolean(line?.taxable),
            taxName: line?.taxName ? String(line.taxName) : null,
            taxRate: toNumber(line?.taxRate),
            priceOverride: Boolean(line?.priceOverride),
          })),
        },
      },
      include: { lines: true },
    });

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { stage: 'QUOTED' },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create quote (quote number may already exist)' }, { status: 409 });
  }
}

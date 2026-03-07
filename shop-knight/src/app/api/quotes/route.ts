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

function extractTrailingNumber(value: string) {
  const match = value.match(/(\d+)$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

async function generateNextQuoteNumber() {
  const latest = await prisma.quote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true },
  });

  const base = latest?.quoteNumber ? extractTrailingNumber(latest.quoteNumber) : null;
  const next = (base ?? 0) + 1;
  return `Q-${String(next).padStart(5, '0')}`;
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
      salesRep: true,
      projectManager: true,
      lines: true,
    },
    orderBy: { quoteNumber: 'asc' },
  });

  return NextResponse.json(
    quotes.map((q: any) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      title: q.title,
      status: q.status,
      workflowState: q.workflowState,
      txnDate: q.txnDate,
      quoteDate: q.quoteDate,
      dueDate: q.dueDate,
      expiryDate: q.expiryDate,
      customerContactRole: q.customerContactRole,
      billingAddress: q.billingAddress,
      billingAttentionTo: q.billingAttentionTo,
      shippingAddress: q.shippingAddress,
      shippingAttentionTo: q.shippingAttentionTo,
      installAddress: q.installAddress,
      salesRepId: q.salesRepId,
      salesRepName: q.salesRep?.name ?? null,
      projectManagerId: q.projectManagerId,
      projectManagerName: q.projectManager?.name ?? null,
      totalPriceInDollars: q.totalPriceInDollars,
      totalTaxInDollars: q.totalTaxInDollars,
      totalPriceWithTaxInDollars: q.totalPriceWithTaxInDollars,
      opportunityId: q.opportunityId,
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
  const providedQuoteNumber = String(body?.txnNumber || body?.quoteNumber || '').trim();

  if (!opportunityId) {
    return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : [];

  try {
    const quoteNumber = providedQuoteNumber || await generateNextQuoteNumber();

    const created = await prisma.quote.create({
      data: {
        opportunityId,
        quoteNumber,
        txnNumber: quoteNumber,
        status: body?.workflowState === 'accepted' ? 'ACCEPTED' : 'DRAFT',
        title: body?.title ? String(body.title) : null,
        description: body?.description ? String(body.description) : null,
        txnDate: toDate(body?.txnDate),
        quoteDate: toDate(body?.quoteDate),
        customerContactRole: body?.customerContactRole ? String(body.customerContactRole) : null,
        billingAddress: body?.billingAddress ? String(body.billingAddress) : null,
        billingAttentionTo: body?.billingAttentionTo ? String(body.billingAttentionTo) : null,
        shippingAddress: body?.shippingAddress ? String(body.shippingAddress) : null,
        shippingAttentionTo: body?.shippingAttentionTo ? String(body.shippingAttentionTo) : null,
        installAddress: body?.installAddress ? String(body.installAddress) : null,
        salesRepId: body?.salesRepId ? String(body.salesRepId) : null,
        projectManagerId: body?.projectManagerId ? String(body.projectManagerId) : null,
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
            attributeValues: line?.attributeValues && typeof line.attributeValues === 'object' ? line.attributeValues : null,
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

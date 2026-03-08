import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const quote = await prisma.quote.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const lines = await prisma.quoteLine.findMany({ where: { quoteId: id }, include: { product: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  return NextResponse.json(lines);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const quote = await prisma.quote.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const body = await req.json();

  if (!body?.description || !body?.qty || body?.unitPrice === undefined) {
    return NextResponse.json({ error: 'description, qty, unitPrice required' }, { status: 400 });
  }

  const last = await prisma.quoteLine.findFirst({ where: { quoteId: id }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });

  const line = await prisma.quoteLine.create({
    data: {
      quoteId: id,
      description: String(body.description),
      qty: Number(body.qty),
      unitPrice: Number(body.unitPrice),
      sortOrder: (last?.sortOrder || 0) + 1,
      parentLineId: body?.parentLineId ? String(body.parentLineId) : null,
      collapsed: Boolean(body?.collapsed),
      productId: body?.productId ? String(body.productId) : null,
      attributeValues: body?.attributeValues && typeof body.attributeValues === 'object' ? body.attributeValues : null,
      taxRate: body?.taxRate !== undefined ? Number(body.taxRate) : null,
      name: body?.name ? String(body.name) : null,
    },
    include: { product: true },
  });

  return NextResponse.json(line, { status: 201 });
}

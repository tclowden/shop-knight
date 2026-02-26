import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const poLines = await prisma.purchaseOrderLine.findMany({
    where: { salesOrderLineId: id },
    include: { vendor: true, purchaseOrder: true },
    orderBy: { id: 'desc' },
  });
  return NextResponse.json(poLines);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'PURCHASING', 'SALES']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const required = ['vendorName', 'poNumber', 'description', 'qty', 'unitCost'];
  for (const field of required) {
    if (!body?.[field]) {
      return NextResponse.json({ error: `${field} required` }, { status: 400 });
    }
  }

  const soLine = await prisma.salesOrderLine.findUnique({ where: { id } });
  if (!soLine) return NextResponse.json({ error: 'Sales order line not found' }, { status: 404 });

  const vendor =
    (await prisma.vendor.findFirst({ where: { name: String(body.vendorName) } })) ||
    (await prisma.vendor.create({ data: { name: String(body.vendorName) } }));

  const po =
    (await prisma.purchaseOrder.findUnique({ where: { poNumber: String(body.poNumber) } })) ||
    (await prisma.purchaseOrder.create({ data: { poNumber: String(body.poNumber) } }));

  const poLine = await prisma.purchaseOrderLine.create({
    data: {
      purchaseOrderId: po.id,
      vendorId: vendor.id,
      salesOrderLineId: id,
      description: String(body.description),
      qty: Number(body.qty),
      unitCost: Number(body.unitCost),
    },
    include: { vendor: true, purchaseOrder: true },
  });

  return NextResponse.json(poLine, { status: 201 });
}

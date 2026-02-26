import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    opportunities.map((o) => ({
      id: o.id,
      name: o.name,
      customer: o.customer.name,
      stage: o.stage,
    }))
  );
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || !body?.customer) {
    return NextResponse.json({ error: 'name and customer required' }, { status: 400 });
  }

  const customerName = String(body.customer).trim();
  const customer =
    (await prisma.customer.findFirst({ where: { name: customerName } })) ||
    (await prisma.customer.create({ data: { name: customerName } }));

  const opportunity = await prisma.opportunity.create({
    data: {
      name: String(body.name),
      customerId: customer.id,
    },
    include: { customer: true },
  });

  return NextResponse.json(
    {
      id: opportunity.id,
      name: opportunity.name,
      customer: opportunity.customer.name,
      stage: opportunity.stage,
    },
    { status: 201 }
  );
}

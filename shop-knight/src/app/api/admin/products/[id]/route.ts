import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.product.update({
    where: { id },
    data: {
      pricingFormula: body?.pricingFormula ? String(body.pricingFormula) : null,
      name: body?.name ? String(body.name) : undefined,
      description: body?.description !== undefined ? String(body.description || '') : undefined,
      category: body?.category !== undefined ? String(body.category || '') : undefined,
      uom: body?.uom !== undefined ? String(body.uom || 'EA') : undefined,
    },
  });

  return NextResponse.json(updated);
}

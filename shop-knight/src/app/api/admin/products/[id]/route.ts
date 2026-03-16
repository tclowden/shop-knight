import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.product.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, archived: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermissions(['admin.products.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'restore') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.product.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { active: true } });
  return NextResponse.json({ ok: true, restored: true });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const attrs = await prisma.productAttribute.findMany({
    where: { productId: id },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(attrs);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const code = String(body?.code || '').trim();
  const name = String(body?.name || '').trim();
  const inputType = String(body?.inputType || 'TEXT');

  if (!code || !name) {
    return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
  }

  try {
    const created = await prisma.productAttribute.create({
      data: {
        productId: id,
        code,
        name,
        inputType: inputType as 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN',
        required: Boolean(body?.required),
        sortOrder: Number(body?.sortOrder || 0),
        defaultValue: body?.defaultValue ? String(body.defaultValue) : null,
        options: Array.isArray(body?.options) ? body.options : null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Attribute code already exists for this product' }, { status: 409 });
  }
}

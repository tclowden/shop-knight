import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ModifierType, ModifierUnit } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({
  name: z.string().trim().min(1),
  systemLookupName: z.string().trim().min(1),
  type: z.nativeEnum(ModifierType),
  units: z.nativeEnum(ModifierUnit),
  showInternally: z.boolean(),
  showCustomer: z.boolean(),
  defaultValue: z.string().trim().min(1),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const item = await prisma.modifier.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!item) return NextResponse.json({ error: 'Modifier not found' }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.modifier.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!existing) return NextResponse.json({ error: 'Modifier not found' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid modifier payload' }, { status: 400 });
  }

  try {
    const updated = await prisma.modifier.update({
      where: { id },
      data: {
        ...parsed.data,
        name: parsed.data.name.trim(),
        systemLookupName: parsed.data.systemLookupName.trim(),
        defaultValue: parsed.data.defaultValue.trim(),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Modifier already exists or could not be updated' }, { status: 409 });
  }
}

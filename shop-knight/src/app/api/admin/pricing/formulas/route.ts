import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

const schema = z.object({
  name: z.string().trim().min(1),
  formula: z.string().trim().min(1),
  uom: z.string().trim().min(1),
});

const seedRows = [
  { name: 'Area', formula: 'Width*Height', uom: 'Sqft' },
  { name: 'Board_Feet', formula: '(Width_in_feet * Height * Length_in_feet) / 12', uom: 'CuFt' },
  { name: 'Total_Area', formula: 'Total_Area', uom: 'Sqft' },
];

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const rows = await prisma.pricingFormula.findMany({
    where: withCompany(companyId, { active: true }),
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  if (body?.seedDefaults === true) {
    await prisma.$transaction(
      seedRows.map((row) =>
        prisma.pricingFormula.upsert({
          where: { companyId_name: { companyId, name: row.name } },
          update: { formula: row.formula, uom: row.uom, active: true },
          create: { companyId, ...row, active: true },
        })
      )
    );

    const rows = await prisma.pricingFormula.findMany({ where: withCompany(companyId, { active: true }), orderBy: { name: 'asc' } });
    return NextResponse.json(rows);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid pricing formula payload' }, { status: 400 });

  try {
    const created = await prisma.pricingFormula.create({
      data: {
        companyId,
        name: parsed.data.name,
        formula: parsed.data.formula,
        uom: parsed.data.uom,
        active: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Pricing formula already exists or could not be created' }, { status: 409 });
  }
}

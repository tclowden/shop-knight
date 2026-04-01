import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const [materialTypes, materialCategories, discounts, cogAccounts] = await Promise.all([
    prisma.materialType.findMany({ where: withCompany(companyId, { active: true }), orderBy: { name: 'asc' } }),
    prisma.materialCategory.findMany({ where: withCompany(companyId, { active: true }), orderBy: { name: 'asc' } }),
    prisma.pricingDiscount.findMany({ where: withCompany(companyId, { active: true }), orderBy: { name: 'asc' } }),
    prisma.incomeAccount.findMany({ where: withCompany(companyId, { active: true }), orderBy: [{ code: 'asc' }, { name: 'asc' }] }),
  ]);

  return NextResponse.json({ materialTypes, materialCategories, discounts, cogAccounts });
}

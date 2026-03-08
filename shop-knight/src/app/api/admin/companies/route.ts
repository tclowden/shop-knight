import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const [companies, users] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        users: {
          select: {
            userId: true,
            user: { select: { id: true, name: true, email: true, activeCompanyId: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return NextResponse.json({
    users,
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      active: company.active,
      members: company.users.map((entry) => ({
        id: entry.user.id,
        name: entry.user.name,
        email: entry.user.email,
        isActiveCompany: entry.user.activeCompanyId === company.id,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const name = String(body?.name || '').trim();
  const slugInput = String(body?.slug || '').trim();
  const slug = toSlug(slugInput || name);

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!slug) return NextResponse.json({ error: 'valid slug required' }, { status: 400 });

  try {
    const company = await prisma.company.create({
      data: {
        name,
        slug,
        active: body?.active !== undefined ? Boolean(body.active) : true,
      },
      select: { id: true, name: true, slug: true, active: true },
    });

    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'unable to create company (name/slug may already exist)' }, { status: 409 });
  }
}

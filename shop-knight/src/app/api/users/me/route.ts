import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      title: { select: { name: true } },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ ...user, titleName: user.title?.name || null });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = body?.name !== undefined ? String(body.name || '').trim() : undefined;
  const phone = body?.phone !== undefined ? String(body.phone || '').trim() : undefined;
  const avatarUrl = body?.avatarUrl !== undefined ? String(body.avatarUrl || '').trim() : undefined;

  if (name !== undefined && !name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (avatarUrl !== undefined && avatarUrl.length > 2_000_000) return NextResponse.json({ error: 'Avatar image is too large' }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      phone: phone === undefined ? undefined : (phone || null),
      avatarUrl: avatarUrl === undefined ? undefined : (avatarUrl || null),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      title: { select: { name: true } },
    },
  });

  return NextResponse.json({ ...updated, titleName: updated.title?.name || null });
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body?.currentPassword || '');
  const newPassword = String(body?.newPassword || '');
  const confirmPassword = String(body?.confirmPassword || '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All password fields are required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'New password and confirmation do not match' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const ok = await compare(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  const passwordHash = await hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}

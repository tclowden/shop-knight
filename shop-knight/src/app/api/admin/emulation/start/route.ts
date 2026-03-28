import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startEmulation } from '@/lib/emulation';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actorId = String(session.user.actorId || session.user.id || '').trim();
  const actorRole = String(session.user.actorRole || session.user.role || '').trim();
  const actorCompanyId = session.user.actorCompanyId ? String(session.user.actorCompanyId) : null;
  if (!actorId || !actorRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetUserId = String(body?.targetUserId || '').trim();
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });

  const result = await startEmulation({ actorId, actorRole, actorCompanyId, targetUserId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}

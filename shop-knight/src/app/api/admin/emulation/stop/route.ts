import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stopEmulation } from '@/lib/emulation';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actorId = String(session.user.actorId || session.user.id || '').trim();
  const actorRole = String(session.user.actorRole || session.user.role || '').trim();
  const actorCompanyId = session.user.actorCompanyId ? String(session.user.actorCompanyId) : null;
  if (!actorId || !actorRole) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await stopEmulation({ actorId, actorRole, actorCompanyId });
  return NextResponse.json({ ok: true, stopped: result.stopped });
}

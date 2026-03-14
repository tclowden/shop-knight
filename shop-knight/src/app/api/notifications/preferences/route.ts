import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';

const EVENTS = ['NOTE_MENTION', 'TASK_ASSIGNED', 'OPPORTUNITY_ROLE_ASSIGNED', 'QUOTE_ROLE_ASSIGNED', 'SALES_ORDER_ROLE_ASSIGNED'] as const;

type EventType = (typeof EVENTS)[number];

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  const userId = (auth.session.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'No user in session' }, { status: 400 });

  const prefs = await prisma.notificationPreference.findMany({
    where: { companyId: companyId ?? null, userId },
  });

  const map = new Map(prefs.map((p) => [p.event, p]));
  return NextResponse.json(EVENTS.map((event) => ({
    event,
    emailEnabled: map.get(event)?.emailEnabled ?? true,
    inAppEnabled: map.get(event)?.inAppEnabled ?? true,
  })));
}

export async function PATCH(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  const userId = (auth.session.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'No user in session' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body?.updates) ? body.updates : [];

  await prisma.$transaction(async (tx) => {
    const validUpdates = updates
      .filter((u: { event?: string }) => u?.event && EVENTS.includes(u.event as EventType)) as Array<{ event: EventType; emailEnabled?: boolean; inAppEnabled?: boolean }>;

    for (const u of validUpdates) {
      const existing = await tx.notificationPreference.findFirst({
        where: { companyId: companyId ?? null, userId, event: u.event },
        select: { id: true },
      });

      if (existing) {
        await tx.notificationPreference.update({
          where: { id: existing.id },
          data: {
            emailEnabled: u.emailEnabled ?? true,
            inAppEnabled: u.inAppEnabled ?? true,
          },
        });
      } else {
        await tx.notificationPreference.create({
          data: {
            companyId: companyId ?? null,
            userId,
            event: u.event,
            emailEnabled: u.emailEnabled ?? true,
            inAppEnabled: u.inAppEnabled ?? true,
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

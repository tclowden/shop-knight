import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getSessionCompanyId } from '@/lib/api-auth';
import { sendMail } from '@/lib/mailer';

function buildEntityPath(entityType: EntityTypeValue, entityId: string) {
  switch (entityType) {
    case 'OPPORTUNITY': return `/sales/opportunities/${entityId}`;
    case 'QUOTE': return `/sales/quotes/${entityId}`;
    case 'SALES_ORDER': return `/sales/orders/${entityId}`;
    case 'SALES_ORDER_LINE': return `/sales/orders?lineId=${entityId}`;
    case 'JOB': return `/jobs/${entityId}`;
    case 'CUSTOMER': return `/customers/${entityId}`;
    case 'VENDOR': return `/vendors/${entityId}`;
    case 'USER': return `/admin/users/${entityId}`;
    default: return '';
  }
}

const TYPES = ['OPPORTUNITY', 'QUOTE', 'SALES_ORDER', 'SALES_ORDER_LINE', 'PURCHASE_ORDER', 'PROJECT', 'JOB', 'CUSTOMER', 'VENDOR', 'PRODUCT', 'USER'] as const;
type EntityTypeValue = (typeof TYPES)[number];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType') as EntityTypeValue | null;
  const entityId = searchParams.get('entityId');
  if (!entityType || !entityId || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const notes = await prisma.note.findMany({
    where: { entityType, entityId },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = getSessionCompanyId(session as { user?: { companyId?: string } });
  const userId = (session.user as { id?: string } | undefined)?.id || null;

  const body = await req.json();
  const entityType = body?.entityType as EntityTypeValue;
  const entityId = String(body?.entityId || '').trim();
  const text = String(body?.body || '').trim();
  const mentionedUserIds = Array.isArray(body?.mentionedUserIds) ? body.mentionedUserIds.map(String) : [];

  if (!entityType || !entityId || !text || !TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'entityType, entityId, body required' }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      entityType,
      entityId,
      body: text,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (mentionedUserIds.length > 0) {
    try {
      const mentionUsers = await prisma.user.findMany({
        where: { id: { in: mentionedUserIds }, active: true },
        select: { id: true, name: true, email: true },
      });

      const prefs = await prisma.notificationPreference.findMany({
        where: {
          companyId: companyId ?? null,
          event: 'NOTE_MENTION',
          userId: { in: mentionUsers.map((u) => u.id) },
        },
      });
      const prefByUser = new Map(prefs.map((p) => [p.userId, p]));

      await Promise.all(mentionUsers.map(async (user) => {
        const pref = prefByUser.get(user.id);
        if (pref && !pref.emailEnabled) return;
        if (!user.email) return;

        const subject = `You were mentioned in a note (${entityType})`;
        const appBaseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || '';
        const entityPath = buildEntityPath(entityType, entityId);
        const noteLink = appBaseUrl && entityPath ? `${appBaseUrl}${entityPath}#note-${note.id}` : '';
        const html = `<p>You were mentioned by ${note.createdBy?.name || 'a teammate'}.</p><p><strong>Note:</strong> ${text}</p><p>Entity: ${entityType} / ${entityId}</p>${noteLink ? `<p><a href="${noteLink}">Open note</a></p>` : ''}`;
        const textBody = `You were mentioned in a note: ${text}${noteLink ? `\n\nOpen note: ${noteLink}` : ''}`;
        try {
          await sendMail({ companyId, to: user.email, subject, html, text: textBody });
        } catch {
          // ignore email errors for now; note creation should still succeed
        }
      }));
    } catch {
      // mention-notification path should never block note save
    }
  }

  return NextResponse.json(note, { status: 201 });
}

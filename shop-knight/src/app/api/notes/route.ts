import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getSessionCompanyId } from '@/lib/api-auth';
import { sendMail } from '@/lib/mailer';

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
      mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
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
      mentions: {
        create: mentionedUserIds.map((id: string) => ({ mentionedUserId: id })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      mentions: { include: { mentionedUser: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (note.mentions.length > 0) {
    const prefs = await prisma.notificationPreference.findMany({
      where: {
        companyId: companyId ?? null,
        event: 'NOTE_MENTION',
        userId: { in: note.mentions.map((m) => m.mentionedUserId) },
      },
    });
    const prefByUser = new Map(prefs.map((p) => [p.userId, p]));

    await Promise.all(note.mentions.map(async (mention) => {
      const pref = prefByUser.get(mention.mentionedUserId);
      if (pref && !pref.emailEnabled) return;
      if (!mention.mentionedUser?.email) return;

      const subject = `You were mentioned in a note (${entityType})`;
      const html = `<p>You were mentioned by ${note.createdBy?.name || 'a teammate'}.</p><p><strong>Note:</strong> ${text}</p><p>Entity: ${entityType} / ${entityId}</p>`;
      try {
        await sendMail({ to: mention.mentionedUser.email, subject, html, text: `You were mentioned in a note: ${text}` });
      } catch {
        // ignore email errors for now; note creation should still succeed
      }
    }));
  }

  return NextResponse.json(note, { status: 201 });
}

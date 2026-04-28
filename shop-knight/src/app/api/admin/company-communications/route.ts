import { NextResponse } from 'next/server';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';
import { sendCompanyMail, sendCompanySms } from '@/lib/company-communications';
import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/secrets';

function isSuperAdmin(session: { user?: { role?: string; roles?: string[] } } | null | undefined) {
  const role = String(session?.user?.role || '');
  const roles = Array.isArray(session?.user?.roles) ? session.user.roles.map(String) : [];
  return role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');
}

async function resolveTargetCompanyId(req: Request, session: { user?: { companyId?: string } } | null | undefined) {
  const { searchParams } = new URL(req.url);
  return searchParams.get('companyId') || getSessionCompanyId(session) || '';
}

async function ensureAccess(companyId: string, session: { user?: { companyId?: string; role?: string; roles?: string[] } } | null | undefined) {
  if (!companyId) return 'No active company selected';
  if (isSuperAdmin(session)) return null;
  const activeCompanyId = getSessionCompanyId(session);
  if (activeCompanyId !== companyId) return 'Forbidden';
  return null;
}

export async function GET(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = await resolveTargetCompanyId(req, auth.session);
  const accessError = await ensureAccess(companyId, auth.session);
  if (accessError) return NextResponse.json({ error: accessError }, { status: accessError === 'Forbidden' ? 403 : 400 });

  const [company, settings] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, slug: true } }),
    prisma.companyCommunicationSettings.findUnique({ where: { companyId } }),
  ]);

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  return NextResponse.json({
    company,
    settings: {
      emailEnabled: settings?.emailEnabled || false,
      emailProvider: settings?.emailProvider || 'SMTP',
      smtpHost: settings?.smtpHost || '',
      smtpPort: settings?.smtpPort || 587,
      smtpSecure: settings?.smtpSecure || false,
      smtpUser: settings?.smtpUser || '',
      smtpPassConfigured: Boolean(decryptSecret(settings?.smtpPassEncrypted)),
      smtpPassMasked: maskSecret(decryptSecret(settings?.smtpPassEncrypted)),
      smtpFromEmail: settings?.smtpFromEmail || '',
      smtpFromName: settings?.smtpFromName || '',
      smtpReplyTo: settings?.smtpReplyTo || '',
      smsEnabled: settings?.smsEnabled || false,
      smsProvider: settings?.smsProvider || 'TWILIO',
      twilioAccountSid: settings?.twilioAccountSid || '',
      twilioAuthTokenConfigured: Boolean(decryptSecret(settings?.twilioAuthTokenEncrypted)),
      twilioAuthTokenMasked: maskSecret(decryptSecret(settings?.twilioAuthTokenEncrypted)),
      twilioFromNumber: settings?.twilioFromNumber || '',
      twilioMessagingServiceSid: settings?.twilioMessagingServiceSid || '',
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const companyId = String(body?.companyId || getSessionCompanyId(auth.session) || '').trim();
  const accessError = await ensureAccess(companyId, auth.session);
  if (accessError) return NextResponse.json({ error: accessError }, { status: accessError === 'Forbidden' ? 403 : 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  const mode = String(body?.mode || '').trim();

  try {
    if (mode === 'email') {
      const to = String(body?.to || '').trim();
      if (!to) return NextResponse.json({ error: 'Test recipient email is required' }, { status: 400 });
      await sendCompanyMail({
        companyId,
        to,
        subject: `Test email from ${company.name}`,
        html: `<p>This is a test email from <strong>${company.name}</strong>.</p><p>Your company email configuration is working.</p>`,
        text: `This is a test email from ${company.name}. Your company email configuration is working.`,
        overrideConfig: {
          host: body?.smtpHost,
          port: body?.smtpPort,
          secure: body?.smtpSecure,
          user: body?.smtpUser,
          pass: body?.smtpPass,
          fromEmail: body?.smtpFromEmail,
          fromName: body?.smtpFromName,
          replyTo: body?.smtpReplyTo,
        },
      });
      return NextResponse.json({ ok: true, message: 'Test email sent.' });
    }

    if (mode === 'sms') {
      const to = String(body?.to || '').trim();
      if (!to) return NextResponse.json({ error: 'Test phone number is required' }, { status: 400 });
      await sendCompanySms({
        companyId,
        to,
        body: `Test SMS from ${company.name}. Your company SMS configuration is working.`,
        overrideConfig: {
          accountSid: body?.twilioAccountSid,
          authToken: body?.twilioAuthToken,
          fromNumber: body?.twilioFromNumber,
          messagingServiceSid: body?.twilioMessagingServiceSid,
        },
      });
      return NextResponse.json({ ok: true, message: 'Test SMS sent.' });
    }

    return NextResponse.json({ error: 'Invalid test mode' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Test failed' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN']);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const companyId = String(body?.companyId || getSessionCompanyId(auth.session) || '').trim();
  const accessError = await ensureAccess(companyId, auth.session);
  if (accessError) return NextResponse.json({ error: accessError }, { status: accessError === 'Forbidden' ? 403 : 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

  const smtpPass = String(body?.smtpPass || '');
  const twilioAuthToken = String(body?.twilioAuthToken || '');

  const existing = await prisma.companyCommunicationSettings.findUnique({ where: { companyId } });
  const updated = await prisma.companyCommunicationSettings.upsert({
    where: { companyId },
    update: {
      emailEnabled: Boolean(body?.emailEnabled),
      emailProvider: 'SMTP',
      smtpHost: String(body?.smtpHost || '').trim() || null,
      smtpPort: body?.smtpPort ? Number(body.smtpPort) : null,
      smtpSecure: Boolean(body?.smtpSecure),
      smtpUser: String(body?.smtpUser || '').trim() || null,
      smtpPassEncrypted: smtpPass ? encryptSecret(smtpPass) : existing?.smtpPassEncrypted || null,
      smtpFromEmail: String(body?.smtpFromEmail || '').trim() || null,
      smtpFromName: String(body?.smtpFromName || '').trim() || null,
      smtpReplyTo: String(body?.smtpReplyTo || '').trim() || null,
      smsEnabled: Boolean(body?.smsEnabled),
      smsProvider: 'TWILIO',
      twilioAccountSid: String(body?.twilioAccountSid || '').trim() || null,
      twilioAuthTokenEncrypted: twilioAuthToken ? encryptSecret(twilioAuthToken) : existing?.twilioAuthTokenEncrypted || null,
      twilioFromNumber: String(body?.twilioFromNumber || '').trim() || null,
      twilioMessagingServiceSid: String(body?.twilioMessagingServiceSid || '').trim() || null,
    },
    create: {
      companyId,
      emailEnabled: Boolean(body?.emailEnabled),
      emailProvider: 'SMTP',
      smtpHost: String(body?.smtpHost || '').trim() || null,
      smtpPort: body?.smtpPort ? Number(body.smtpPort) : null,
      smtpSecure: Boolean(body?.smtpSecure),
      smtpUser: String(body?.smtpUser || '').trim() || null,
      smtpPassEncrypted: smtpPass ? encryptSecret(smtpPass) : null,
      smtpFromEmail: String(body?.smtpFromEmail || '').trim() || null,
      smtpFromName: String(body?.smtpFromName || '').trim() || null,
      smtpReplyTo: String(body?.smtpReplyTo || '').trim() || null,
      smsEnabled: Boolean(body?.smsEnabled),
      smsProvider: 'TWILIO',
      twilioAccountSid: String(body?.twilioAccountSid || '').trim() || null,
      twilioAuthTokenEncrypted: twilioAuthToken ? encryptSecret(twilioAuthToken) : null,
      twilioFromNumber: String(body?.twilioFromNumber || '').trim() || null,
      twilioMessagingServiceSid: String(body?.twilioMessagingServiceSid || '').trim() || null,
    },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}

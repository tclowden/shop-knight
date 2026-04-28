import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/secrets';

export type CompanyEmailConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  source: 'company' | 'env' | 'override';
};

export type CompanySmsConfig = {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid: string;
  source: 'company' | 'env' | 'override';
};

function normalizePhoneForSms(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) throw new Error('Phone number is required');

  const cleaned = trimmed.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
      throw new Error('Phone number must be valid E.164 format');
    }
    return cleaned;
  }

  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  throw new Error('Phone number must include 10 digits or be valid E.164');
}

function envEmailConfig(): CompanyEmailConfig | null {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const fromEmail = process.env.SMTP_FROM || '';
  if (!host || !user || !pass || !fromEmail) return null;
  return {
    enabled: true,
    host,
    port,
    secure: port === 465,
    user,
    pass,
    fromEmail,
    fromName: process.env.SMTP_FROM_NAME || '',
    replyTo: process.env.SMTP_REPLY_TO || '',
    source: 'env',
  };
}

function envSmsConfig(): CompanySmsConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const fromNumber = process.env.TWILIO_FROM_NUMBER || '';
  if (!accountSid || !authToken || !fromNumber) return null;
  return {
    enabled: true,
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
    source: 'env',
  };
}

export async function getCompanyEmailConfig(companyId?: string | null): Promise<CompanyEmailConfig | null> {
  if (companyId) {
    const settings = await prisma.companyCommunicationSettings.findUnique({ where: { companyId } });
    const decryptedPass = decryptSecret(settings?.smtpPassEncrypted);
    if (settings?.emailEnabled && settings.smtpHost && settings.smtpUser && decryptedPass && settings.smtpFromEmail) {
      return {
        enabled: true,
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: settings.smtpSecure,
        user: settings.smtpUser,
        pass: decryptedPass,
        fromEmail: settings.smtpFromEmail,
        fromName: settings.smtpFromName || '',
        replyTo: settings.smtpReplyTo || '',
        source: 'company',
      };
    }
  }
  return envEmailConfig();
}

export async function getCompanySmsConfig(companyId?: string | null): Promise<CompanySmsConfig | null> {
  if (companyId) {
    const settings = await prisma.companyCommunicationSettings.findUnique({ where: { companyId } });
    const decryptedToken = decryptSecret(settings?.twilioAuthTokenEncrypted);
    if (settings?.smsEnabled && settings.twilioAccountSid && decryptedToken && (settings.twilioFromNumber || settings.twilioMessagingServiceSid)) {
      return {
        enabled: true,
        accountSid: settings.twilioAccountSid,
        authToken: decryptedToken,
        fromNumber: settings.twilioFromNumber || '',
        messagingServiceSid: settings.twilioMessagingServiceSid || '',
        source: 'company',
      };
    }
  }
  return envSmsConfig();
}

export async function sendCompanyMail(params: { companyId?: string | null; to: string; subject: string; html: string; text?: string; overrideConfig?: Partial<CompanyEmailConfig> & { pass?: string } }) {
  const config = params.overrideConfig
    ? {
        enabled: true,
        host: String(params.overrideConfig.host || ''),
        port: Number(params.overrideConfig.port || 587),
        secure: Boolean(params.overrideConfig.secure),
        user: String(params.overrideConfig.user || ''),
        pass: String(params.overrideConfig.pass || ''),
        fromEmail: String(params.overrideConfig.fromEmail || ''),
        fromName: String(params.overrideConfig.fromName || ''),
        replyTo: String(params.overrideConfig.replyTo || ''),
        source: 'override' as const,
      }
    : await getCompanyEmailConfig(params.companyId);
  if (!config) throw new Error('Email not configured for this company.');

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const from = config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail;
  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: config.replyTo || undefined,
  });
}

export async function sendCompanySms(params: { companyId?: string | null; to: string; body: string; overrideConfig?: Partial<CompanySmsConfig> & { authToken?: string } }) {
  const config = params.overrideConfig
    ? {
        enabled: true,
        accountSid: String(params.overrideConfig.accountSid || ''),
        authToken: String(params.overrideConfig.authToken || ''),
        fromNumber: String(params.overrideConfig.fromNumber || ''),
        messagingServiceSid: String(params.overrideConfig.messagingServiceSid || ''),
        source: 'override' as const,
      }
    : await getCompanySmsConfig(params.companyId);
  if (!config) throw new Error('SMS not configured for this company.');

  const client = twilio(config.accountSid, config.authToken);
  return client.messages.create({
    to: normalizePhoneForSms(params.to),
    body: params.body,
    from: config.messagingServiceSid ? undefined : config.fromNumber,
    messagingServiceSid: config.messagingServiceSid || undefined,
  });
}

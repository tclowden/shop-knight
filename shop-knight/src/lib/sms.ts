import twilio from 'twilio';

export function formatPhoneForSms(value: string) {
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

export async function sendSms(params: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.');
  }

  const client = twilio(accountSid, authToken);
  return client.messages.create({
    from,
    to: formatPhoneForSms(params.to),
    body: params.body,
  });
}

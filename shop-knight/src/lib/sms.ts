import { sendCompanySms } from '@/lib/company-communications';

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

export async function sendSms(params: { companyId?: string | null; to: string; body: string }) {
  return sendCompanySms(params);
}

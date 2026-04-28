import { sendCompanyMail } from '@/lib/company-communications';

export async function sendMail(params: { companyId?: string | null; to: string; subject: string; html: string; text?: string }) {
  await sendCompanyMail(params);
}

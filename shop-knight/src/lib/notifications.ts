import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export async function shouldSendEmailNotification(params: {
  companyId: string | null;
  userId: string;
  event: 'NOTE_MENTION' | 'TASK_ASSIGNED' | 'OPPORTUNITY_ROLE_ASSIGNED' | 'QUOTE_ROLE_ASSIGNED' | 'SALES_ORDER_ROLE_ASSIGNED';
}) {
  const pref = await prisma.notificationPreference.findFirst({
    where: {
      companyId: params.companyId,
      userId: params.userId,
      event: params.event,
    },
    select: { emailEnabled: true },
  });

  if (!pref) return true;
  return pref.emailEnabled;
}

export async function sendTaskAssignedEmail(params: {
  companyId?: string | null;
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskId: string;
  appUrl?: string;
}) {
  const appUrl = params.appUrl || process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  const taskUrl = `${appUrl}/tasks#task-${params.taskId}`;

  await sendMail({
    companyId: params.companyId,
    to: params.to,
    subject: `Task assigned: ${params.taskTitle}`,
    html: `<p>Hi ${params.assigneeName},</p><p>You were assigned a task: <strong>${params.taskTitle}</strong>.</p><p><a href="${taskUrl}">Open task</a></p>`,
    text: `You were assigned a task: ${params.taskTitle}. Open: ${taskUrl}`,
  });
}

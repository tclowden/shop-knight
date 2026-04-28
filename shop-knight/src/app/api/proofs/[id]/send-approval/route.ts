import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';
import { sendMail } from '@/lib/mailer';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  const { id } = await params;
  const body = await req.json();
  const recipientEmail = String(body?.recipientEmail || '').trim();
  if (!recipientEmail) return NextResponse.json({ error: 'recipientEmail required' }, { status: 400 });

  const proof = await prisma.proof.findUnique({ where: { id } });
  if (!proof) return NextResponse.json({ error: 'Proof not found' }, { status: 404 });

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const request = await prisma.proofApprovalRequest.create({
    data: {
      proofId: proof.id,
      recipientEmail,
      token,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  const approveUrl = `${appUrl}/proofs/approve?token=${token}`;

  await sendMail({
    companyId,
    to: recipientEmail,
    subject: `Proof approval requested: ${proof.fileName}`,
    html: `
      <p>Please review this proof.</p>
      <p><a href="${approveUrl}">Review and Approve / Request Changes</a></p>
      <p>This link expires on ${expiresAt.toLocaleString()}.</p>
    `,
    text: `Please review this proof: ${approveUrl}`,
  });

  return NextResponse.json({ ok: true, requestId: request.id, expiresAt, approveUrl });
}

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';
import { sendMail } from '@/lib/mailer';

export async function POST(req: Request) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const recipientEmail = String(body?.recipientEmail || '').trim();
  const proofIds: string[] = Array.isArray(body?.proofIds)
    ? body.proofIds.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  if (!recipientEmail || proofIds.length === 0) {
    return NextResponse.json({ error: 'recipientEmail and proofIds are required' }, { status: 400 });
  }

  const uniqueProofIds = [...new Set(proofIds)];
  const proofs = await prisma.proof.findMany({
    where: { id: { in: uniqueProofIds } },
    select: { id: true, fileName: true, version: true },
  });

  if (proofs.length !== uniqueProofIds.length) {
    return NextResponse.json({ error: 'One or more proofs were not found' }, { status: 404 });
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const requests = await prisma.$transaction(
    proofs.map((proof) =>
      prisma.proofApprovalRequest.create({
        data: {
          proofId: proof.id,
          recipientEmail,
          token: randomBytes(24).toString('hex'),
          expiresAt,
        },
      })
    )
  );

  const tokens = requests.map((r) => r.token);
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  const reviewUrl = `${appUrl}/proofs/approve?tokens=${encodeURIComponent(tokens.join(','))}`;

  const listHtml = proofs
    .map((p) => `<li>${p.fileName} (v${p.version})</li>`)
    .join('');

  await sendMail({
    to: recipientEmail,
    subject: `Proof approval requested (${proofs.length} proofs)`,
    html: `
      <p>Please review the attached proof set.</p>
      <ul>${listHtml}</ul>
      <p><a href="${reviewUrl}">Review proofs and submit decisions</a></p>
      <p>This link expires on ${expiresAt.toLocaleString()}.</p>
    `,
    text: `Please review ${proofs.length} proofs: ${reviewUrl}`,
  });

  return NextResponse.json({ ok: true, count: proofs.length, reviewUrl, expiresAt });
}

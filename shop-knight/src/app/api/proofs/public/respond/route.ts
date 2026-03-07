import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body?.token || '');
  const decision = String(body?.decision || '');
  const notes = String(body?.notes || '').trim();

  if (!token || !['APPROVED', 'REVISIONS_REQUESTED'].includes(decision)) {
    return NextResponse.json({ error: 'token and valid decision required' }, { status: 400 });
  }

  const request = await prisma.proofApprovalRequest.findUnique({ where: { token }, include: { proof: true } });
  if (!request) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (request.respondedAt) return NextResponse.json({ error: 'This request has already been answered' }, { status: 400 });
  if (new Date(request.expiresAt).getTime() < Date.now()) return NextResponse.json({ error: 'This request has expired' }, { status: 400 });
  if (decision === 'REVISIONS_REQUESTED' && !notes) {
    return NextResponse.json({ error: 'Notes are required when not approved' }, { status: 400 });
  }

  const respondedAt = new Date();

  await prisma.$transaction([
    prisma.proofApprovalRequest.update({
      where: { token },
      data: { respondedAt, decision: decision as never, responseNotes: notes || null },
    }),
    prisma.proof.update({
      where: { id: request.proofId },
      data: {
        status: decision === 'APPROVED' ? 'APPROVED' : 'REVISIONS_REQUESTED',
        approvedAt: decision === 'APPROVED' ? respondedAt : null,
        approvalNotes: notes || null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

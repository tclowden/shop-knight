import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Decision = 'APPROVED' | 'REVISIONS_REQUESTED' | 'SKIP';
type BatchResponseInput = { token?: string; decision?: string; notes?: string };
type NormalizedResponse = { token: string; decision: Decision; notes: string };

export async function POST(req: Request) {
  const body = await req.json();
  const responses: BatchResponseInput[] = Array.isArray(body?.responses) ? body.responses : [];

  if (responses.length === 0) {
    return NextResponse.json({ error: 'responses are required' }, { status: 400 });
  }

  const normalized: NormalizedResponse[] = responses.map((item) => ({
    token: String(item?.token || '').trim(),
    decision: String(item?.decision || '').trim() as Decision,
    notes: String(item?.notes || '').trim(),
  }));

  if (normalized.some((r) => !r.token || !['APPROVED', 'REVISIONS_REQUESTED', 'SKIP'].includes(r.decision))) {
    return NextResponse.json({ error: 'Each response requires token and valid decision' }, { status: 400 });
  }

  const actionable = normalized.filter((r) => r.decision !== 'SKIP');
  if (actionable.length === 0) {
    return NextResponse.json({ error: 'Please choose at least one proof to approve or reject' }, { status: 400 });
  }

  const missingNotes = actionable.find((r) => r.decision === 'REVISIONS_REQUESTED' && !r.notes);
  if (missingNotes) {
    return NextResponse.json({ error: 'Each rejected proof requires its own notes' }, { status: 400 });
  }

  const tokens = actionable.map((r) => r.token);
  const requests = await prisma.proofApprovalRequest.findMany({ where: { token: { in: tokens } } });
  if (requests.length !== tokens.length) return NextResponse.json({ error: 'Invalid token in request' }, { status: 404 });

  const now = Date.now();
  for (const requestRecord of requests) {
    if (requestRecord.respondedAt) return NextResponse.json({ error: 'One or more requests were already answered' }, { status: 400 });
    if (new Date(requestRecord.expiresAt).getTime() < now) return NextResponse.json({ error: 'One or more requests have expired' }, { status: 400 });
  }

  const byToken = new Map(actionable.map((r) => [r.token, r]));
  const respondedAt = new Date();

  await prisma.$transaction(
    requests.flatMap((requestRecord) => {
      const payload = byToken.get(requestRecord.token)!;
      const nextStatus = payload.decision === 'APPROVED' ? 'APPROVED' : 'REVISIONS_REQUESTED';
      return [
        prisma.proofApprovalRequest.update({
          where: { token: requestRecord.token },
          data: { respondedAt, decision: nextStatus as never, responseNotes: payload.notes || null },
        }),
        prisma.proof.update({
          where: { id: requestRecord.proofId },
          data: {
            status: nextStatus as never,
            approvedAt: payload.decision === 'APPROVED' ? respondedAt : null,
            approvalNotes: payload.notes || null,
          },
        }),
      ];
    })
  );

  return NextResponse.json({ ok: true, processed: actionable.length });
}

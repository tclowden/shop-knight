import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await prisma.proofApprovalRequest.findUnique({
    where: { token },
    include: { proof: true },
  });

  if (!request) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  return NextResponse.json({
    token: request.token,
    expiresAt: request.expiresAt,
    respondedAt: request.respondedAt,
    decision: request.decision,
    responseNotes: request.responseNotes,
    proof: {
      id: request.proof.id,
      fileName: request.proof.fileName,
      mimeType: request.proof.mimeType,
      status: request.proof.status,
      fileUrl: `/api/proofs/file/${request.proof.id}`,
    },
  });
}

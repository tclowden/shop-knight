import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTokens = String(searchParams.get('tokens') || '');
  const tokens = [...new Set(rawTokens.split(',').map((t) => t.trim()).filter(Boolean))];

  if (tokens.length === 0) return NextResponse.json({ error: 'tokens required' }, { status: 400 });

  const requests = await prisma.proofApprovalRequest.findMany({
    where: { token: { in: tokens } },
    include: { proof: true },
  });

  if (requests.length === 0) return NextResponse.json({ error: 'Invalid tokens' }, { status: 404 });

  return NextResponse.json({
    items: requests.map((r) => ({
      token: r.token,
      expiresAt: r.expiresAt,
      respondedAt: r.respondedAt,
      decision: r.decision,
      responseNotes: r.responseNotes,
      proof: {
        id: r.proof.id,
        fileName: r.proof.fileName,
        mimeType: r.proof.mimeType,
        status: r.proof.status,
        fileUrl: `/api/proofs/file/${r.proof.id}`,
      },
    })),
  });
}

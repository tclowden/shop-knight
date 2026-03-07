import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const lineType = String(searchParams.get('lineType') || '');
  const lineId = String(searchParams.get('lineId') || '');
  if (!lineType || !lineId) return NextResponse.json({ error: 'lineType and lineId required' }, { status: 400 });

  const where = lineType === 'QUOTE_LINE' ? { quoteLineId: lineId } : lineType === 'SALES_ORDER_LINE' ? { salesOrderLineId: lineId } : null;
  if (!where) return NextResponse.json({ error: 'Invalid lineType' }, { status: 400 });

  const proofs = await prisma.proof.findMany({
    where,
    include: { requests: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(
    proofs.map((p) => ({
      id: p.id,
      version: p.version,
      fileName: p.fileName,
      mimeType: p.mimeType,
      status: p.status,
      approvalNotes: p.approvalNotes,
      approvedAt: p.approvedAt,
      createdAt: p.createdAt,
      hasFile: !!p.fileData,
      lastRequest: p.requests[0]
        ? {
            id: p.requests[0].id,
            recipientEmail: p.requests[0].recipientEmail,
            expiresAt: p.requests[0].expiresAt,
            respondedAt: p.requests[0].respondedAt,
            decision: p.requests[0].decision,
          }
        : null,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const lineType = String(body?.lineType || '');
  const lineId = String(body?.lineId || '');
  const fileName = String(body?.fileName || '').trim();
  const mimeType = String(body?.mimeType || 'application/octet-stream');
  const base64Data = String(body?.base64Data || '');

  if (!lineType || !lineId || !fileName || !base64Data) {
    return NextResponse.json({ error: 'lineType, lineId, fileName, base64Data required' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(base64Data, 'base64');
  if (fileBuffer.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Proof file too large. Max 10MB.' }, { status: 400 });
  }

  let quoteLineId: string | null = null;
  let salesOrderLineId: string | null = null;

  if (lineType === 'QUOTE_LINE') quoteLineId = lineId;
  else if (lineType === 'SALES_ORDER_LINE') salesOrderLineId = lineId;
  else return NextResponse.json({ error: 'Invalid lineType' }, { status: 400 });

  const latest = await prisma.proof.findFirst({
    where: quoteLineId ? { quoteLineId } : { salesOrderLineId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const proof = await prisma.proof.create({
    data: {
      quoteLineId,
      salesOrderLineId,
      version: (latest?.version || 0) + 1,
      fileName,
      mimeType,
      fileData: fileBuffer,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ id: proof.id, version: proof.version, status: proof.status }, { status: 201 });
}

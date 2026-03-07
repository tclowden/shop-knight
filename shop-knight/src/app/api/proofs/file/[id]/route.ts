import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = await prisma.proof.findUnique({ where: { id }, select: { fileData: true, mimeType: true, fileName: true } });
  if (!proof) return NextResponse.json({ error: 'Proof not found' }, { status: 404 });

  const bytes = new Uint8Array(proof.fileData);
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': proof.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${proof.fileName}"`,
      'Cache-Control': 'private, max-age=60',
    },
  });
}

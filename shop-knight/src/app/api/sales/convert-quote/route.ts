import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const form = await request.formData();
  const quoteId = String(form.get('quoteId') || '');

  // Placeholder conversion logic; replace with Prisma transaction.
  const salesOrderNumber = `SO-${Math.floor(Math.random() * 9000) + 1000}`;

  return NextResponse.redirect(
    new URL(`/sales/opportunities?converted=${encodeURIComponent(quoteId)}&so=${salesOrderNumber}`, request.url),
    { status: 303 }
  );
}

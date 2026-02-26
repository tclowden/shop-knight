import { NextResponse } from 'next/server';
import { newId, readDb, writeDb } from '@/lib/dev-store';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const quote = db.quotes.find((q) => q.id === id);
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const existing = db.salesOrders.find((s) => s.sourceQuoteId === id);
  if (existing) return NextResponse.json(existing);

  const so = {
    id: newId('so'),
    opportunityId: quote.opportunityId,
    sourceQuoteId: quote.id,
    orderNumber: `SO-${Math.floor(Math.random() * 9000) + 1000}`,
  };
  db.salesOrders.unshift(so);

  const opp = db.opportunities.find((o) => o.id === quote.opportunityId);
  if (opp) opp.stage = 'WON';

  await writeDb(db);
  return NextResponse.json(so, { status: 201 });
}

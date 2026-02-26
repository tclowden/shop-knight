import { NextResponse } from 'next/server';
import { newId, readDb, writeDb } from '@/lib/dev-store';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  return NextResponse.json(db.quotes.filter((q) => q.opportunityId === id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const opportunity = db.opportunities.find((o) => o.id === id);
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const quote = {
    id: newId('q'),
    opportunityId: id,
    quoteNumber: `Q-${Math.floor(Math.random() * 9000) + 1000}`,
    status: 'DRAFT' as const,
  };
  db.quotes.unshift(quote);
  opportunity.stage = 'QUOTED';
  await writeDb(db);
  return NextResponse.json(quote, { status: 201 });
}

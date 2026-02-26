import { NextResponse } from 'next/server';
import { newId, readDb, writeDb } from '@/lib/dev-store';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.opportunities);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || !body?.customer) {
    return NextResponse.json({ error: 'name and customer required' }, { status: 400 });
  }

  const db = await readDb();
  const opportunity = {
    id: newId('opp'),
    name: String(body.name),
    customer: String(body.customer),
    stage: 'LEAD' as const,
  };
  db.opportunities.unshift(opportunity);
  await writeDb(db);
  return NextResponse.json(opportunity, { status: 201 });
}

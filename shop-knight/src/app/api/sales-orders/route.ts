import { NextResponse } from 'next/server';
import { readDb } from '@/lib/dev-store';

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.salesOrders);
}

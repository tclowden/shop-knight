import { promises as fs } from 'fs';
import path from 'path';

export type Opportunity = {
  id: string;
  name: string;
  customer: string;
  stage: 'LEAD' | 'QUALIFIED' | 'QUOTED' | 'WON' | 'LOST';
};

export type Quote = {
  id: string;
  opportunityId: string;
  quoteNumber: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED';
};

export type SalesOrder = {
  id: string;
  opportunityId: string;
  sourceQuoteId: string;
  orderNumber: string;
};

type Db = {
  opportunities: Opportunity[];
  quotes: Quote[];
  salesOrders: SalesOrder[];
};

const DB_PATH = path.join(process.cwd(), 'data', 'dev-db.json');

const seed: Db = {
  opportunities: [
    { id: 'opp-1001', name: 'Downtown Rebrand', customer: 'Acme Foods', stage: 'QUOTED' },
    { id: 'opp-1002', name: 'Fleet Wrap Program', customer: 'Northline Logistics', stage: 'QUALIFIED' },
  ],
  quotes: [
    { id: 'q-1001', opportunityId: 'opp-1001', quoteNumber: 'Q-1001', status: 'SENT' },
  ],
  salesOrders: [],
};

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2));
  }
}

export async function readDb(): Promise<Db> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(raw) as Db;
}

export async function writeDb(db: Db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

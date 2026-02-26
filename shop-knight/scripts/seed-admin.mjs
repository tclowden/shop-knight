import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Admin';

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

await prisma.user.upsert({
  where: { email },
  update: { name, passwordHash: hash, type: 'ADMIN', active: true },
  create: { email, name, passwordHash: hash, type: 'ADMIN', active: true },
});

console.log(`Admin user ready: ${email}`);
await prisma.$disconnect();

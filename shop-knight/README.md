# Shop Replacement Scaffold

Initial scaffold for replacing ShopVox using:
- Next.js (App Router) + React
- Node.js runtime
- Prisma ORM (PostgreSQL)

## Included in this scaffold

- Login screen UI (`/login`)
- Dashboard (`/dashboard`)
- User admin page (`/admin/users`)
- Sales hierarchy entrypoint (`/sales/opportunities`)
- Opportunity detail shell (`/sales/opportunities/[id]`)
- Quote → Sales Order conversion endpoint placeholder (`POST /api/sales/convert-quote`)
- Customer and vendor placeholders (`/customers`, `/vendors`)
- Prisma schema with core entities:
  - Users + user types
  - Customers, Vendors
  - Opportunities
  - Quotes, Sales Orders, Purchase Orders
  - Projects, Jobs
  - Assignable Tasks across entities

## Run locally

```bash
cd /home/knight/.openclaw/workspace/shop-knight
npm install
npm run dev
```

Open: http://localhost:3000

## Prisma/PostgreSQL setup

1. Set your env in `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/shop_knight?schema=public"
NEXTAUTH_SECRET="replace-with-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

2. Apply schema + generate client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

3. Seed an initial admin user:

```bash
ADMIN_EMAIL="you@company.com" ADMIN_PASSWORD="change-me" ADMIN_NAME="Tommy" npm run seed:admin
```

4. Start the app:

```bash
npm run dev
```

> Note: API routes now read/write directly via Prisma and are auth-protected.

## Immediate next build steps

1. Wire NextAuth + Prisma adapter for real login/session checks.
2. Build CRUD pages for opportunities, quotes, sales orders, PO line linking.
3. Implement real quote→sales-order conversion in a Prisma transaction.
4. Add task assignment UI and status workflow.
5. Add customer/vendor CRUD + search.

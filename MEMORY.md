# MEMORY.md

Long-term memory for important context.

## Projects
- shop-knight: ERP/CRM workflow app with opportunities, quotes, sales orders, products, task calendar, notes/tasks, and task templates.

## Preferences
- Tommy prefers clean language (no cuss words).
- BCC tclowden@gmail.com on every outbound email unless explicitly told otherwise.
- In shop-knight, when Tommy asks for "delete" functionality, he means soft-delete/archive behavior (retain data), not hard delete.
- Tommy strongly prefers create flows behind a button leading to a dedicated create screen/modal; avoid inline always-visible entry fields on list/admin pages.
- UI/forms preference: default to labels above inputs (not placeholder-only fields), especially in admin/create flows; keep field layout clean and readable.
- Before saying a feature is ready to test, run an independent sub-agent validation pass. Validate behavior under Tommy's effective role context (SUPER_ADMIN) for access/permission-sensitive flows, not just build/static checks.
- Before asking Tommy to test any feature that includes schema/model changes, run DB migrations in the active environment first (at minimum `prisma migrate deploy` + `prisma generate`) so testing is not blocked by migration drift.
- Hard rule: never say "ready to test" on DB-related work until I have verified migration status (`prisma migrate status`) and applied any pending migrations.
- Prisma/schema changes are not done until deployment/database steps are handled too: whenever schema changes are pushed, explicitly ensure production migration + Prisma Client generation are run, and confirm deploy health after push.
- Tommy operates as SUPER_ADMIN and expects full access; when implementing or updating permissions, include SUPER_ADMIN by default so admin-level flows do not block him.

## Decisions
- Use role-based task template assignment (PM / Project Coordinator / specific user / unassigned).
- Keep quote and sales-order functionality closely aligned (same line-item behavior and totals model).

## Follow-ups
- Verify task-template save/apply UX in production-like flow.
- Continue improving grid UX (sorting/filtering/drag-drop polish and template editing).

## Engineering Notes
- Repeated Vercel deployment failures have come from strict TypeScript checks passing locally but failing in production build.
- Before push/deploy, run full `npm run build` (not only lint/dev) to catch TS issues early.
- Common hotspot: Prisma update payload typing (`null` vs `undefined`) in API routes; prefer explicit typed assignments compatible with generated Prisma types.
- Critical: never ship Prisma schema changes without committed migrations; otherwise production hits runtime `column does not exist` errors.
- Deployment gate for schema changes: `prisma migrate deploy` + `prisma generate` must pass against the active production DB before declaring release complete.
- Add/keep drift prevention in workflow: reconcile DB/schema immediately when a missing-column error appears; do not rely on route-level fallbacks as a long-term fix.

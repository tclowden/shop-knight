export const APP_PERMISSIONS = [
  'dashboard.view',
  'admin.users.manage',
  'admin.products.manage',
  'admin.companies.manage',
  'admin.customRoles.manage',
  'admin.salesOrderStatuses.manage',
  'admin.titles.manage',
  'admin.storage.manage',
  'sales.opportunities.view',
  'sales.quotes.view',
  'sales.orders.view',
  'customers.view',
  'vendors.view',
  'expenses.view',
  'tasks.calendar.view',
  'tasks.templates.view',
  'time.view',
  'time.manage.team',
  'time.manage.all',
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

const ALL_PERMISSIONS = [...APP_PERMISSIONS];

export const BASE_ROLE_DEFAULTS: Record<string, AppPermission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((permission) => permission !== 'admin.companies.manage'),
  STORAGE: ['dashboard.view', 'admin.storage.manage'],
  SALES: ['dashboard.view', 'sales.opportunities.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'expenses.view', 'tasks.calendar.view', 'time.view'],
  SALES_REP: ['dashboard.view', 'sales.opportunities.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'expenses.view', 'tasks.calendar.view', 'time.view'],
  PROJECT_MANAGER: ['dashboard.view', 'sales.opportunities.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'expenses.view', 'tasks.calendar.view', 'tasks.templates.view', 'time.view', 'time.manage.team'],
  DESIGNER: ['dashboard.view', 'sales.orders.view', 'customers.view', 'expenses.view', 'tasks.calendar.view', 'time.view'],
  OPERATIONS: ['dashboard.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'expenses.view', 'tasks.calendar.view', 'time.view'],
  PURCHASING: ['dashboard.view', 'sales.orders.view', 'vendors.view', 'expenses.view', 'tasks.calendar.view', 'time.view'],
  FINANCE: ['dashboard.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'expenses.view', 'time.view', 'time.manage.all'],
};

export const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: AppPermission }> = [
  { prefix: '/dashboard', permission: 'dashboard.view' },
  { prefix: '/admin/users', permission: 'admin.users.manage' },
  { prefix: '/admin/products', permission: 'admin.products.manage' },
  { prefix: '/admin/job-workflows', permission: 'admin.users.manage' },
  { prefix: '/admin/companies', permission: 'admin.companies.manage' },
  { prefix: '/admin/custom-roles', permission: 'admin.customRoles.manage' },
  { prefix: '/admin/sales-order-statuses', permission: 'admin.salesOrderStatuses.manage' },
  { prefix: '/admin/titles', permission: 'admin.titles.manage' },
  { prefix: '/admin/storage', permission: 'admin.storage.manage' },
  { prefix: '/api/admin/storage', permission: 'admin.storage.manage' },
  { prefix: '/api/admin/storage-assignments', permission: 'admin.storage.manage' },
  { prefix: '/sales/opportunities', permission: 'sales.opportunities.view' },
  { prefix: '/sales/quotes', permission: 'sales.quotes.view' },
  { prefix: '/sales/orders', permission: 'sales.orders.view' },
  { prefix: '/customers', permission: 'customers.view' },
  { prefix: '/vendors', permission: 'vendors.view' },
  { prefix: '/expenses', permission: 'expenses.view' },
  { prefix: '/notifications', permission: 'tasks.calendar.view' },
  { prefix: '/jobs', permission: 'tasks.calendar.view' },
  { prefix: '/jobs/workflows', permission: 'tasks.calendar.view' },
  { prefix: '/tasks/calendar', permission: 'tasks.calendar.view' },
  { prefix: '/tasks/templates', permission: 'tasks.templates.view' },
  { prefix: '/time', permission: 'time.view' },
  { prefix: '/admin/time', permission: 'time.manage.team' },
];

export function sanitizePermissions(input: unknown): AppPermission[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<AppPermission>();
  for (const value of input) {
    if (typeof value !== 'string') continue;
    if (APP_PERMISSIONS.includes(value as AppPermission)) {
      set.add(value as AppPermission);
    }
  }
  return [...set];
}

export function getEffectivePermissions(baseRole: string, customRolePermissions: unknown[]): AppPermission[] {
  const base = BASE_ROLE_DEFAULTS[baseRole] ?? [];
  const merged = new Set<AppPermission>(base);
  for (const permissionSet of customRolePermissions) {
    for (const permission of sanitizePermissions(permissionSet)) {
      merged.add(permission);
    }
  }
  return [...merged];
}

export function canAccessPath(pathname: string, permissions: string[]): boolean {
  const rule = ROUTE_PERMISSIONS.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
  if (!rule) return true;
  return permissions.includes(rule.permission);
}

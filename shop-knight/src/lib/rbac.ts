export const APP_PERMISSIONS = [
  'dashboard.view',
  'admin.users.manage',
  'admin.products.manage',
  'admin.customRoles.manage',
  'admin.salesOrderStatuses.manage',
  'sales.opportunities.view',
  'sales.quotes.view',
  'sales.orders.view',
  'customers.view',
  'vendors.view',
  'tasks.calendar.view',
  'tasks.templates.view',
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

const ALL_PERMISSIONS = [...APP_PERMISSIONS];

export const BASE_ROLE_DEFAULTS: Record<string, AppPermission[]> = {
  ADMIN: ALL_PERMISSIONS,
  SALES: ['dashboard.view', 'sales.opportunities.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'tasks.calendar.view'],
  SALES_REP: ['dashboard.view', 'sales.opportunities.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'tasks.calendar.view'],
  PROJECT_MANAGER: ['dashboard.view', 'sales.opportunities.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'tasks.calendar.view', 'tasks.templates.view'],
  DESIGNER: ['dashboard.view', 'sales.orders.view', 'customers.view', 'tasks.calendar.view'],
  OPERATIONS: ['dashboard.view', 'sales.orders.view', 'customers.view', 'vendors.view', 'tasks.calendar.view'],
  PURCHASING: ['dashboard.view', 'sales.orders.view', 'vendors.view', 'tasks.calendar.view'],
  FINANCE: ['dashboard.view', 'sales.quotes.view', 'sales.orders.view', 'customers.view', 'vendors.view'],
};

export const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: AppPermission }> = [
  { prefix: '/dashboard', permission: 'dashboard.view' },
  { prefix: '/admin/users', permission: 'admin.users.manage' },
  { prefix: '/admin/products', permission: 'admin.products.manage' },
  { prefix: '/admin/custom-roles', permission: 'admin.customRoles.manage' },
  { prefix: '/admin/sales-order-statuses', permission: 'admin.salesOrderStatuses.manage' },
  { prefix: '/sales/opportunities', permission: 'sales.opportunities.view' },
  { prefix: '/sales/quotes', permission: 'sales.quotes.view' },
  { prefix: '/sales/orders', permission: 'sales.orders.view' },
  { prefix: '/customers', permission: 'customers.view' },
  { prefix: '/vendors', permission: 'vendors.view' },
  { prefix: '/tasks/calendar', permission: 'tasks.calendar.view' },
  { prefix: '/tasks/templates', permission: 'tasks.templates.view' },
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

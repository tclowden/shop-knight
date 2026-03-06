import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      roles: string[];
      permissions: string[];
      companyId: string;
      companies: Array<{ id: string; name: string; slug: string }>;
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
    companyId?: string;
    companies?: Array<{ id: string; name: string; slug: string }>;
  }
}

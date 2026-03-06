import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getEffectivePermissions } from '@/lib/rbac';
import { ensureUserCompanyContext } from '@/lib/company-context';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  permissions: string[];
  companyId: string;
  companies: Array<{ id: string; name: string; slug: string }>;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            customRoles: {
              include: { role: true },
            },
          },
        });

        if (!user || !user.active) return null;

        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        const context = await ensureUserCompanyContext(user.id);
        if (!context?.activeCompanyId) return null;

        const customRoleNames = user.customRoles
          .filter((entry) => !entry.role.companyId || entry.role.companyId === context.activeCompanyId)
          .map((entry) => entry.role.name);
        const permissions = getEffectivePermissions(
          user.type,
          user.customRoles
            .filter((entry) => !entry.role.companyId || entry.role.companyId === context.activeCompanyId)
            .map((entry) => entry.role.permissions)
        );

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.type,
          roles: [user.type, ...customRoleNames],
          permissions,
          companyId: context.activeCompanyId,
          companies: context.companies,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typed = user as { role?: string; roles?: string[]; permissions?: string[]; companyId?: string; companies?: Array<{ id: string; name: string; slug: string }> };
        if (typed.role) token.role = typed.role;
        token.roles = typed.roles ?? [];
        token.permissions = typed.permissions ?? [];
        token.companyId = typed.companyId ?? '';
        token.companies = typed.companies ?? [];
        token.uid = user.id;
      } else if (token.uid) {
        const context = await ensureUserCompanyContext(String(token.uid));
        if (context?.activeCompanyId) {
          token.companyId = context.activeCompanyId;
          token.companies = context.companies;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid || '');
        session.user.role = String(token.role || '');
        session.user.roles = Array.isArray(token.roles) ? token.roles.map(String) : [];
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions.map(String) : [];
        session.user.companyId = String(token.companyId || '');
        session.user.companies = Array.isArray(token.companies)
          ? token.companies.map((c) => ({ id: String((c as { id?: string }).id || ''), name: String((c as { name?: string }).name || ''), slug: String((c as { slug?: string }).slug || '') }))
          : [];
      }
      return session;
    },
  },
};

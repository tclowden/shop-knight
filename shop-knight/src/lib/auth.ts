import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getEffectivePermissions } from '@/lib/rbac';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  permissions: string[];
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

        const customRoleNames = user.customRoles.map((entry) => entry.role.name);
        const permissions = getEffectivePermissions(user.type, user.customRoles.map((entry) => entry.role.permissions));

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.type,
          roles: [user.type, ...customRoleNames],
          permissions,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const typed = user as { role?: string; roles?: string[]; permissions?: string[] };
        if (typed.role) token.role = typed.role;
        token.roles = typed.roles ?? [];
        token.permissions = typed.permissions ?? [];
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid || '');
        session.user.role = String(token.role || '');
        session.user.roles = Array.isArray(token.roles) ? token.roles.map(String) : [];
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions.map(String) : [];
      }
      return session;
    },
  },
};

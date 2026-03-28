import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { buildAuthUser } from '@/lib/auth-context';
import { getEffectiveUserForActor } from '@/lib/emulation';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
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

        const normalizedEmail = String(credentials.email).trim().toLowerCase();
        if (!normalizedEmail) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
          select: { id: true, email: true, passwordHash: true, active: true },
        });

        if (!user || !user.active) return null;

        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        const authUser = await buildAuthUser(user.id);
        if (!authUser) return null;
        return authUser as AuthUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const typed = user as AuthUser;
        token.uid = typed.id;
        token.actorUid = typed.id;
        token.actorRole = typed.role;
        token.actorCompanyId = typed.companyId;
      }

      const actorId = String(token.actorUid || token.uid || '');
      if (!actorId) return token;

      const actorUser = await buildAuthUser(actorId);
      if (!actorUser) return token;

      token.actorUid = actorUser.id;
      token.actorRole = actorUser.role;
      token.actorCompanyId = actorUser.companyId;

      const { effectiveUser, emulationTargetUserId } = await getEffectiveUserForActor(actorId);
      const selected = effectiveUser || actorUser;

      token.uid = selected.id;
      token.role = selected.role;
      token.roles = selected.roles;
      token.permissions = selected.permissions;
      token.companyId = selected.companyId;
      token.companies = selected.companies;
      token.image = selected.image || undefined;
      token.name = selected.name;
      token.email = selected.email;
      token.isEmulating = Boolean(emulationTargetUserId);
      token.emulationTargetUserId = emulationTargetUserId || undefined;

      if (trigger === 'update' && !token.actorUid) {
        token.actorUid = token.uid;
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
        session.user.image = typeof token.image === 'string' ? token.image : null;
        session.user.name = typeof token.name === 'string' ? token.name : session.user.name;
        session.user.email = typeof token.email === 'string' ? token.email : session.user.email;
        session.user.actorId = String(token.actorUid || token.uid || '');
        session.user.actorRole = String(token.actorRole || token.role || '');
        session.user.actorCompanyId = String(token.actorCompanyId || '') || null;
        session.user.isEmulating = Boolean(token.isEmulating);
        session.user.emulationTargetUserId = typeof token.emulationTargetUserId === 'string' ? token.emulationTargetUserId : null;
      }
      return session;
    },
  },
};

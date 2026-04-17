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
  role?: string;
};

async function loadSessionState(actorId: string) {
  const actorUser = await buildAuthUser(actorId);
  if (!actorUser) return null;

  const { effectiveUser, emulationTargetUserId } = await getEffectiveUserForActor(actorId);
  const selected = effectiveUser || actorUser;

  return {
    actorUser,
    selected,
    emulationTargetUserId,
  };
}

export const authOptions: NextAuthOptions = {
  debug: true,
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
        return {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          image: authUser.image || null,
          role: authUser.role,
        } as AuthUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const typed = user as AuthUser;
        token.uid = typed.id;
        token.actorUid = typed.id;
        token.role = typed.role;
      }

      if (trigger === 'update' && !token.actorUid) {
        token.actorUid = token.uid;
      }

      const actorId = String(token.actorUid || token.uid || '');
      if (!actorId) return token;

      const state = await loadSessionState(actorId);
      if (!state) return token;

      token.uid = state.selected.id;
      token.actorUid = state.actorUser.id;
      token.role = state.selected.role;
      token.companyId = state.selected.companyId;
      token.isEmulating = Boolean(state.emulationTargetUserId);
      token.emulationTargetUserId = state.emulationTargetUserId || undefined;
      delete token.name;
      delete token.email;
      delete token.picture;
      delete token.image;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const actorId = String(token.actorUid || token.uid || '');
        const state = actorId ? await loadSessionState(actorId) : null;

        session.user.id = state?.selected.id || String(token.uid || '');
        session.user.role = state?.selected.role || String(token.role || '');
        session.user.roles = state?.selected.roles || [];
        session.user.permissions = state?.selected.permissions || [];
        session.user.companyId = state?.selected.companyId || (typeof token.companyId === 'string' ? token.companyId : '');
        session.user.companies = state?.selected.companies || [];
        session.user.image = state?.selected.image || null;
        session.user.name = state?.selected.name || null;
        session.user.email = state?.selected.email || null;
        session.user.actorId = state?.actorUser.id || actorId;
        session.user.actorRole = state?.actorUser.role || '';
        session.user.actorCompanyId = state?.actorUser.companyId || null;
        session.user.isEmulating = Boolean(state?.emulationTargetUserId);
        session.user.emulationTargetUserId = state?.emulationTargetUserId || null;
      }
      return session;
    },
  },
};

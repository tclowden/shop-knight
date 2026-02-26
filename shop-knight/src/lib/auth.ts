import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import type { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserType;
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

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.active) return null;

        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.type,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const role = (user as { role?: UserType }).role;
        if (role) token.role = role;
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid || '');
        session.user.role = String(token.role || '');
      }
      return session;
    },
  },
};

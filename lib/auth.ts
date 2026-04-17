import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { pool } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const { rows } = await pool.query(
          'SELECT id, name, email, role, password_hash FROM auth_users WHERE email = $1 LIMIT 1',
          [credentials.email]
        );
        
        if (rows.length === 0) return null;
        
        const user = rows[0];
        
        // Verify password against stored hash
        const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValidPassword) return null;
        
        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id)   session.user.id   = token.id   as string;
      if (token?.role) session.user.role = token.role as string;
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};
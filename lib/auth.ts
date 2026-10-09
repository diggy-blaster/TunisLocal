import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { pool } from './db';
import bcrypt from 'bcryptjs'; // 👈 Added for secure password checking

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Check if both email and password are provided
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // 2. Fetch user by email
          const { rows } = await pool.query(
            'SELECT id, name, email, password, role FROM auth_users WHERE email = $1 LIMIT 1',
            [credentials.email]
          );
          
          const user = rows[0];
          if (!user) return null; // User not found

          // 3. CRITICAL FIX: Verify the password hash matches
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null; // Wrong password

          // 4. Return user data (NEVER return the password hash)
          return {
            id:    user.id,
            name:  user.name,
            email: user.email,
            role:  user.role,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
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
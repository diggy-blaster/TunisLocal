import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { pool } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const { rows } = await pool.query(
          'SELECT * FROM auth_users WHERE email = $1 LIMIT 1',
          [credentials.email]
        );
        if (rows.length === 0) return null;
        return { id: rows[0].id, name: rows[0].name, email: rows[0].email };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};
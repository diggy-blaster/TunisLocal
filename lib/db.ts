import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.NODE_ENV === 'production' && databaseUrl
      ? { rejectUnauthorized: false }
      : false,
});

if (databaseUrl) {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection error:', err.message);
      return;
    }
    console.log('✅ Database connected');
    release();
  });
} else {
  console.warn('⚠️ DATABASE_URL is not set. DB-backed routes will fail until it is configured.');
}
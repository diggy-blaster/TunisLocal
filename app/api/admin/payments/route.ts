import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(req as any, {} as any, authOptions);
  // 🔒 Replace with your actual admin role check
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || null;
  const provider = searchParams.get('provider') || null;
  const dateFrom = searchParams.get('dateFrom') || null;
  const dateTo = searchParams.get('dateTo') || null;
  const search = searchParams.get('search') || null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  const params: any[] = [status, provider, dateFrom, dateTo, search ? `%${search}%` : null, limit, offset];
  
  const whereClauses: string[] = [];
  let paramIndex = 1;
  
  if (params[0]) whereClauses.push(`p.status = $${paramIndex++}`);
  if (params[1]) whereClauses.push(`p.provider = $${paramIndex++}`);
  if (params[2]) whereClauses.push(`p.initiated_at >= $${paramIndex++}`);
  if (params[3]) whereClauses.push(`p.initiated_at <= $${paramIndex++}`);
  if (params[4]) whereClauses.push(`(p.id::text ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countParams = params.slice(0, paramIndex - 1);

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM payments p 
     JOIN bookings b ON b.id = p.booking_id 
     JOIN auth_users u ON u.id = b.customer_id 
     ${whereSql}`,
    countParams
  );
  const total = parseInt(countRows[0].count, 10);

  const dataParams = [...countParams, limit, offset];

  const { rows } = await pool.query(
    `SELECT 
       p.id, p.provider, p.amount_tnd, p.status, p.initiated_at, p.gateway_payment_id,
       b.id AS booking_id,
       u.name AS customer_name, u.email AS customer_email,
       s.title AS service_title
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     JOIN auth_users u ON u.id = b.customer_id
     JOIN services s ON s.id = b.service_id
     ${whereSql}
     ORDER BY p.initiated_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    dataParams
  );

  return NextResponse.json({ payments: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
}

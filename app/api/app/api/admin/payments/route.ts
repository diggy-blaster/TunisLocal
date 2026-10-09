import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  // 1. Security Check: Ensure user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse query parameters for filtering/pagination
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const status = searchParams.get('status');
  const provider = searchParams.get('provider');
  const search = searchParams.get('search');

  const offset = (page - 1) * limit;

  // 3. Build dynamic query
  let query = `
    SELECT p.id, p.booking_id, p.amount_tnd, p.status, p.provider, p.initiated_at,
           u.name AS customer_name, u.email AS customer_email,
           s.title AS service_title
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN auth_users u ON b.customer_id = u.id
    JOIN services s ON b.service_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND p.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }
  if (provider) {
    query += ` AND p.provider = $${paramIndex}`;
    params.push(provider);
    paramIndex++;
  }
  if (search) {
    query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR s.title ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY p.initiated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(query, params);
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM payments`; // Simplified for now, can add WHERE clauses matching above
    const { rows: countRows } = await pool.query(countQuery);
    const total = parseInt(countRows[0].count, 10);

    return NextResponse.json({
      payments: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin payments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
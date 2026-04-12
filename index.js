// app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const service_id = searchParams.get('service_id');
  const booking_id = searchParams.get('booking_id');
  
  if (!service_id && !booking_id) {
    return NextResponse.json({ error: 'service_id or booking_id required' }, { status: 400 });
  }

  const clause = service_id ? 'r.service_id = $1' : 'r.booking_id = $1';
  const param = service_id || booking_id;

  const { rows } = await pool.query(`
    SELECT r.id, r.rating, r.comment, r.created_at,
           u.name AS reviewer_name, u.avatar AS reviewer_avatar,
           s.title AS service_title
    FROM reviews r
    JOIN auth_users u ON u.id = r.reviewer_id
    JOIN services s ON s.id = r.service_id
    WHERE ${clause}
    ORDER BY r.created_at DESC
  `, [param]);

  return NextResponse.json({ reviews: rows });
}

// ... similarly for POST

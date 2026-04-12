import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(req as any, {} as any, authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { booking_id, rating, comment } = body;

  if (!booking_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'booking_id and rating (1-5) required' }, { status: 400 });
  }

  const { rows: bookings } = await pool.query(
    `SELECT id, service_id, status, customer_id FROM bookings WHERE id = $1`,
    [booking_id]
  );

  if (!bookings.length) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  const booking = bookings[0];

  if (booking.customer_id !== session.user.id) {
    return NextResponse.json({ error: 'Not your booking' }, { status: 403 });
  }
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'Reviews can only be submitted for completed bookings' }, { status: 422 });
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2`,
    [booking_id, session.user.id]
  );
  if (existing.length) {
    return NextResponse.json({ error: 'You have already reviewed this booking' }, { status: 409 });
  }

  const { rows: inserted } = await pool.query(
    `INSERT INTO reviews (service_id, booking_id, reviewer_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [booking.service_id, booking_id, session.user.id, rating, comment || null]
  );

  const { rows: ratingRows } = await pool.query(
    `SELECT avg_rating, review_count FROM service_ratings WHERE service_id = $1`,
    [booking.service_id]
  );

  return NextResponse.json({
    review: inserted[0],
    service_rating: ratingRows[0] || { avg_rating: rating, review_count: 1 },
  }, { status: 201 });
}

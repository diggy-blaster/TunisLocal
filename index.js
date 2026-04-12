// api/reviews/index.js  (Next.js API route)
import { pool } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  // ── GET /api/reviews?service_id=xxx ──────────────────────────────────────
  if (req.method === 'GET') {
    const { service_id, booking_id } = req.query;

    if (!service_id && !booking_id) {
      return res.status(400).json({ error: 'service_id or booking_id required' });
    }

    const clause = service_id
      ? 'r.service_id = $1'
      : 'r.booking_id = $1';
    const param  = service_id || booking_id;

    const { rows } = await pool.query(
      `SELECT
         r.id, r.rating, r.comment, r.created_at,
         u.name    AS reviewer_name,
         u.avatar  AS reviewer_avatar,
         s.title   AS service_title
       FROM reviews r
       JOIN auth_users u ON u.id = r.reviewer_id
       JOIN services   s ON s.id = r.service_id
       WHERE ${clause}
       ORDER BY r.created_at DESC`,
      [param]
    );

    return res.status(200).json({ reviews: rows });
  }

  // ── POST /api/reviews ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!session) return res.status(401).json({ error: 'Unauthenticated' });

    const { booking_id, rating, comment } = req.body;

    if (!booking_id || !rating) {
      return res.status(400).json({ error: 'booking_id and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    // Verify booking belongs to this user and is completed
    const { rows: bookingRows } = await pool.query(
      `SELECT id, service_id, status, customer_id
       FROM bookings
       WHERE id = $1`,
      [booking_id]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRows[0];

    if (booking.customer_id !== session.user.id) {
      return res.status(403).json({ error: 'Not your booking' });
    }

    if (booking.status !== 'completed') {
      return res.status(422).json({
        error: 'Reviews can only be submitted for completed bookings',
        current_status: booking.status,
      });
    }

    // Check for duplicate review
    const { rows: existing } = await pool.query(
      `SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2`,
      [booking_id, session.user.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this booking' });
    }

    // Insert review (DB trigger will refresh service_ratings materialized view)
    const { rows: inserted } = await pool.query(
      `INSERT INTO reviews (service_id, booking_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [booking.service_id, booking_id, session.user.id, rating, comment || null]
    );

    // Fetch updated aggregated rating
    const { rows: ratingRows } = await pool.query(
      `SELECT avg_rating, review_count
       FROM service_ratings
       WHERE service_id = $1`,
      [booking.service_id]
    );

    return res.status(201).json({
      review: inserted[0],
      service_rating: ratingRows[0] || { avg_rating: rating, review_count: 1 },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

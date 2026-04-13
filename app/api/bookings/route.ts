import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(req as any, {} as any, authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { service_id, provider_id, scheduled_at, notes, payment_provider } = body;

  if (!service_id || !provider_id || !scheduled_at || !payment_provider) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { rows: bookingRows } = await pool.query(
    `INSERT INTO bookings (customer_id, provider_id, service_id, scheduled_at, status, notes)
     VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING id`,
    [session.user.id, provider_id, service_id, scheduled_at, notes || null]
  );
  const bookingId = bookingRows[0].id;

  const { rows: paymentRows } = await pool.query(
    `INSERT INTO payments (booking_id, payer_id, provider, amount_tnd, status)
     VALUES ($1, $2, $3, (SELECT price FROM services WHERE id = $4), 'pending') RETURNING id`,
    [bookingId, session.user.id, payment_provider, service_id]
  );
  const paymentId = paymentRows[0].id;

  let gatewayLink = null;
  if (['flouci', 'd17', 'online_bank'].includes(payment_provider)) {
    gatewayLink = `/api/payments/initiate?payment_id=${paymentId}&provider=${payment_provider}`;
  }

  return NextResponse.json(
    {
      booking_id: bookingId,
      payment: { id: paymentId, gateway_link: gatewayLink, status: 'pending' },
    },
    { status: 201 }
  );
}

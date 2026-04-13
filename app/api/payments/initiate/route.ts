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
  const { payment_id, provider } = body;

  if (!payment_id || !provider) {
    return NextResponse.json({ error: 'payment_id and provider are required' }, { status: 400 });
  }

  const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const payment = rows[0];

  if (payment.payer_id !== session.user.id) {
    return NextResponse.json({ error: 'Not your payment' }, { status: 403 });
  }

  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Payment already processed' }, { status: 409 });
  }

  if (payment.provider !== provider) {
    return NextResponse.json({ error: 'Provider mismatch' }, { status: 400 });
  }

  if (payment.gateway_link) {
    return NextResponse.json({
      success: true,
      redirect_url: payment.gateway_link,
      payment_id,
      provider,
      message: 'Payment already initiated. Redirecting.',
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://tunislocal.vercel.app';
  let gatewayLink: string | null = null;
  let gatewayPaymentId: string | null = null;
  let gatewayResponse: any = null;

  try {
    switch (provider) {
      case 'flouci': {
        const res = await fetch('https://api.flouci.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            app_secret: process.env.FLOUCI_APP_SECRET || '',
            app_public: process.env.FLOUCI_APP_PUBLIC || '',
          },
          body: JSON.stringify({
            amount: Number(payment.amount_tnd),
            currency: 'TND',
            custom_id: payment.id,
            success_url: `${baseUrl}/payment/success?payment_id=${payment.id}`,
            fail_url: `${baseUrl}/payment/cancel?payment_id=${payment.id}`,
          }),
        });

        if (!res.ok) {
          throw new Error('Flouci API failed');
        }

        const json = await res.json();
        gatewayPaymentId = json.result?.id || null;
        gatewayLink = json.result?.lnk || null;
        gatewayResponse = json;
        break;
      }

      case 'd17': {
        const res = await fetch('https://api.d17.tn/v1/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.D17_API_KEY}`,
          },
          body: JSON.stringify({
            amount: Number(payment.amount_tnd),
            order_id: payment.id,
            webhook_url: `${baseUrl}/api/payments/webhook/d17`,
            callback_url: `${baseUrl}/payment/success?payment_id=${payment.id}`,
          }),
        });

        if (!res.ok) {
          throw new Error('D17 API failed');
        }

        const json = await res.json();
        gatewayPaymentId = json.reference || null;
        gatewayLink = json.checkout_url || null;
        gatewayResponse = json;
        break;
      }

      case 'online_bank': {
        gatewayLink = `${baseUrl}/payment/bank-simulate?payment_id=${payment.id}`;
        gatewayResponse = { simulated: true, bank: 'generic' };
        break;
      }

      case 'cash': {
        gatewayLink = null;
        gatewayResponse = { method: 'cash_on_site' };
        break;
      }

      default:
        return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
    }

    await pool.query(
      `UPDATE payments
       SET gateway_payment_id = $1,
           gateway_link = $2,
           gateway_response = $3
       WHERE id = $4`,
      [gatewayPaymentId, gatewayLink, JSON.stringify(gatewayResponse), payment_id]
    );

    return NextResponse.json({
      success: true,
      redirect_url: gatewayLink,
      payment_id,
      provider,
      message:
        provider === 'cash'
          ? 'Pay cash to the provider upon service completion.'
          : 'Redirecting to payment gateway...',
    });
  } catch (err: any) {
    console.error('Payment initiation error:', err);
    await pool.query(
      `UPDATE payments SET status = 'failed', failure_reason = $1 WHERE id = $2`,
      [err.message || 'Initiation failed', payment_id]
    );
    return NextResponse.json({ error: err.message || 'Payment initiation failed' }, { status: 500 });
  }
}

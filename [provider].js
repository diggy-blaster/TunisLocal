// app/api/payments/webhook/[provider]/route.js
import { handleWebhook } from '@/lib/payments';
import crypto from 'crypto';

export async function POST(req, { params }) {
  const { provider } = params;

  // In App Router, get raw body like this:
  const rawBody = await req.text();   // ← replaces getRawBody()
  let body;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (provider === 'flouci') {
    const sig = req.headers.get('x-flouci-signature');
    if (sig && !verifyFlouciSignature(rawBody, sig)) {
      return Response.json({ error: 'Invalid Flouci signature' }, { status: 401 });
    }
  }

  if (provider === 'd17') {
    const sig = req.headers.get('x-d17-signature');
    if (sig && !verifyD17Signature(rawBody, sig)) {
      return Response.json({ error: 'Invalid D17 signature' }, { status: 401 });
    }
  }

  try {
    const payment = await handleWebhook(provider, body);
    if (!payment) return Response.json({ error: 'Payment not found' }, { status: 404 });
    return Response.json({ ok: true, status: payment.status });
  } catch (err) {
    console.error(`Webhook error [${provider}]:`, err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

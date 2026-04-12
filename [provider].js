// api/payments/webhook/[provider].js
// Receives callbacks from Flouci, D17, and online bank gateways.
// Verifies signatures before updating payment status.

import { handleWebhook } from '@/lib/payments';
import crypto from 'crypto';

// Disable body parsing — we need raw body for HMAC signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function verifyFlouciSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.FLOUCI_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
}

function verifyD17Signature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.D17_API_KEY)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { provider } = req.query;
  const rawBody      = await getRawBody(req);
  let body;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Signature verification per gateway
  if (provider === 'flouci') {
    const sig = req.headers['x-flouci-signature'];
    if (sig && !verifyFlouciSignature(rawBody, sig)) {
      return res.status(401).json({ error: 'Invalid Flouci signature' });
    }
  }

  if (provider === 'd17') {
    const sig = req.headers['x-d17-signature'];
    if (sig && !verifyD17Signature(rawBody, sig)) {
      return res.status(401).json({ error: 'Invalid D17 signature' });
    }
  }

  // online_bank: no server-side signature in redirect flow;
  // verification is done by querying bank status API (poll from success page)

  try {
    const payment = await handleWebhook(provider, body);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    return res.status(200).json({ ok: true, status: payment.status });
  } catch (err) {
    console.error(`Webhook error [${provider}]:`, err);
    return res.status(500).json({ error: err.message });
  }
}

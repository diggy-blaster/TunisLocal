// lib/payments.js
// TunisLocal payment gateway integrations
// Supports: Flouci · D17 · STB/BNA/Attijari online bank (redirect)

const { pool } = require('./db');

// ── Gateway credentials (set in .env) ────────────────────────────────────────
const FLOUCI_APP_TOKEN    = process.env.FLOUCI_APP_TOKEN;
const FLOUCI_APP_SECRET   = process.env.FLOUCI_APP_SECRET;
const FLOUCI_API_URL      = 'https://developers.flouci.com/api';

const D17_MERCHANT_ID     = process.env.D17_MERCHANT_ID;
const D17_API_KEY         = process.env.D17_API_KEY;
const D17_API_URL         = 'https://api.d17.tn/v1';  // update to live endpoint

const APP_BASE_URL        = process.env.NEXTAUTH_URL || 'https://tunislocal.tn';

// ─────────────────────────────────────────────────────────────────────────────
// FLOUCI
// Docs: https://developers.flouci.com
// ─────────────────────────────────────────────────────────────────────────────
async function initiateFlouciPayment({ bookingId, amountTND, description }) {
  const amountMillimes = Math.round(amountTND * 1000); // Flouci uses millimes

  const payload = {
    app_token:     FLOUCI_APP_TOKEN,
    app_secret:    FLOUCI_APP_SECRET,
    amount:        amountMillimes,
    accept_card:   true,
    session_timeout_secs: 1200,   // 20 min
    success_link:  `${APP_BASE_URL}/payment/success?booking_id=${bookingId}`,
    fail_link:     `${APP_BASE_URL}/payment/failed?booking_id=${bookingId}`,
    developer_tracking_id: bookingId,
  };

  const res  = await fetch(`${FLOUCI_API_URL}/generate_payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!data.result?.success) {
    throw new Error(`Flouci error: ${data.message || JSON.stringify(data)}`);
  }

  // Save to payments table
  const { rows } = await pool.query(
    `INSERT INTO payments
       (booking_id, payer_id, provider, amount_tnd, gateway_payment_id, gateway_link, gateway_response)
     VALUES ($1, $2, 'flouci', $3, $4, $5, $6)
     ON CONFLICT (booking_id) DO UPDATE
       SET gateway_payment_id = EXCLUDED.gateway_payment_id,
           gateway_link       = EXCLUDED.gateway_link,
           gateway_response   = EXCLUDED.gateway_response,
           status             = 'pending'
     RETURNING *`,
    [
      bookingId,
      data.result.developer_tracking_id || bookingId, // payer_id resolved separately
      amountTND,
      data.result.payment_id,
      data.result.link,
      JSON.stringify(data.result),
    ]
  );

  return {
    payment_id:   data.result.payment_id,
    redirect_url: data.result.link,
    payment:      rows[0],
  };
}

async function verifyFlouciPayment(paymentId) {
  const res  = await fetch(`${FLOUCI_API_URL}/verify_payment/${paymentId}`, {
    headers: {
      'app_token':  FLOUCI_APP_TOKEN,
      'app_secret': FLOUCI_APP_SECRET,
    },
  });

  const data = await res.json();
  const succeeded = data.result?.status === 'SUCCESS';

  await pool.query(
    `UPDATE payments
     SET status           = $1,
         gateway_response = gateway_response || $2,
         confirmed_at     = CASE WHEN $1 = 'succeeded' THEN NOW() ELSE confirmed_at END,
         failed_at        = CASE WHEN $1 = 'failed'    THEN NOW() ELSE failed_at    END
     WHERE gateway_payment_id = $3`,
    [
      succeeded ? 'succeeded' : 'failed',
      JSON.stringify({ verify: data.result }),
      paymentId,
    ]
  );

  return { succeeded, raw: data };
}

// ─────────────────────────────────────────────────────────────────────────────
// D17
// D17 is a mobile wallet / top-up network in Tunisia.
// Payment is initiated by sending a payment request to the customer's D17 number.
// ─────────────────────────────────────────────────────────────────────────────
async function initiateD17Payment({ bookingId, amountTND, customerPhone, description }) {
  const payload = {
    merchant_id:  D17_MERCHANT_ID,
    amount:       amountTND,           // TND, 3 decimals
    currency:     'TND',
    phone:        customerPhone,       // +216XXXXXXXX
    reference:    bookingId,
    description:  description || 'TunisLocal service booking',
    callback_url: `${APP_BASE_URL}/api/payments/webhook/d17`,
  };

  const res  = await fetch(`${D17_API_URL}/payments/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${D17_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(`D17 error: ${data.message || JSON.stringify(data)}`);
  }

  const { rows } = await pool.query(
    `INSERT INTO payments
       (booking_id, payer_id, provider, amount_tnd, gateway_payment_id, gateway_response)
     VALUES ($1, $2, 'd17', $3, $4, $5)
     ON CONFLICT (booking_id) DO UPDATE
       SET gateway_payment_id = EXCLUDED.gateway_payment_id,
           gateway_response   = EXCLUDED.gateway_response,
           status             = 'pending'
     RETURNING *`,
    [bookingId, bookingId, amountTND, data.transaction_id, JSON.stringify(data)]
  );

  return { transaction_id: data.transaction_id, payment: rows[0] };
}

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE BANK (STB / BNA / Attijari / UIB)
// Tunisian banks use a CMI / SATIM redirect flow.
// We generate a signed redirect URL; the bank handles PCI-DSS.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const BANK_MERCHANT_ID  = process.env.BANK_MERCHANT_ID;
const BANK_TERMINAL_ID  = process.env.BANK_TERMINAL_ID;
const BANK_SECRET_KEY   = process.env.BANK_SECRET_KEY;
const BANK_GATEWAY_URL  = process.env.BANK_GATEWAY_URL || 'https://paiement.satim.dz/payment/rest/register.do'; // update per bank

function generateBankSignature(params, secretKey) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join(';');
  return crypto.createHmac('sha256', secretKey).update(sorted).digest('hex');
}

async function initiateOnlineBankPayment({ bookingId, amountTND, description }) {
  const amountMillimes = Math.round(amountTND * 1000);
  const orderNumber    = `TL-${bookingId.slice(0, 8).toUpperCase()}`;

  const params = {
    userName:      BANK_MERCHANT_ID,
    password:      BANK_TERMINAL_ID,
    orderNumber,
    amount:        amountMillimes,
    currency:      '788',              // ISO 4217: TND
    returnUrl:     `${APP_BASE_URL}/payment/success?booking_id=${bookingId}`,
    failUrl:       `${APP_BASE_URL}/payment/failed?booking_id=${bookingId}`,
    description:   description || 'TunisLocal booking',
    language:      'fr',
  };

  params.signature = generateBankSignature(params, BANK_SECRET_KEY);

  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${BANK_GATEWAY_URL}?${qs}`);
  const data = await res.json();

  if (data.errorCode && data.errorCode !== '0') {
    throw new Error(`Bank gateway error ${data.errorCode}: ${data.errorMessage}`);
  }

  const { rows } = await pool.query(
    `INSERT INTO payments
       (booking_id, payer_id, provider, amount_tnd, gateway_payment_id, gateway_link, gateway_response)
     VALUES ($1, $2, 'online_bank', $3, $4, $5, $6)
     ON CONFLICT (booking_id) DO UPDATE
       SET gateway_payment_id = EXCLUDED.gateway_payment_id,
           gateway_link       = EXCLUDED.gateway_link,
           status             = 'pending'
     RETURNING *`,
    [bookingId, bookingId, amountTND, data.orderId, data.formUrl, JSON.stringify(data)]
  );

  return { redirect_url: data.formUrl, order_id: data.orderId, payment: rows[0] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook handler (shared entry point — called from /api/payments/webhook/*)
// ─────────────────────────────────────────────────────────────────────────────
async function handleWebhook(provider, body) {
  let gatewayPaymentId, succeeded, rawData;

  if (provider === 'flouci') {
    gatewayPaymentId = body.payment_id;
    succeeded        = body.status === 'SUCCESS';
    rawData          = body;
  } else if (provider === 'd17') {
    gatewayPaymentId = body.transaction_id;
    succeeded        = body.status === 'COMPLETED';
    rawData          = body;
  } else if (provider === 'online_bank') {
    gatewayPaymentId = body.mdOrder || body.orderId;
    succeeded        = body.orderStatus === '2';  // DEPOSITED
    rawData          = body;
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const newStatus = succeeded ? 'succeeded' : 'failed';

  const { rows } = await pool.query(
    `UPDATE payments
     SET status           = $1,
         gateway_response = gateway_response || $2,
         confirmed_at     = CASE WHEN $1 = 'succeeded' THEN NOW() ELSE confirmed_at END,
         failed_at        = CASE WHEN $1 = 'failed'    THEN NOW() ELSE failed_at    END
     WHERE gateway_payment_id = $3
     RETURNING *`,
    [newStatus, JSON.stringify({ webhook: rawData }), gatewayPaymentId]
  );

  return rows[0] || null;
}

module.exports = {
  initiateFlouciPayment,
  verifyFlouciPayment,
  initiateD17Payment,
  initiateOnlineBankPayment,
  handleWebhook,
};

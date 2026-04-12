// lib/notifications.js
// Expo Push Notification sender + queue processor
// Reads from push_notification_queue, sends via Expo Push API

const { pool } = require('./db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Register a device push token for a user.
 */
async function registerPushToken(userId, token, platform) {
  await pool.query(
    `INSERT INTO push_tokens (user_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, token) DO UPDATE SET active = TRUE`,
    [userId, token, platform]
  );
}

/**
 * Deactivate a push token (called when Expo returns DeviceNotRegistered).
 */
async function deactivatePushToken(token) {
  await pool.query(
    `UPDATE push_tokens SET active = FALSE WHERE token = $1`,
    [token]
  );
}

/**
 * Send a batch of Expo push messages.
 * Expo accepts up to 100 messages per request.
 * Returns array of receipts.
 */
async function sendExpoMessages(messages) {
  if (messages.length === 0) return [];

  const batches = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  const allReceipts = [];

  for (const batch of batches) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    const json = await res.json();
    if (json.data) allReceipts.push(...json.data);
  }

  return allReceipts;
}

/**
 * Notification text templates per type and language.
 * Supports: en, fr, ar
 */
const TEMPLATES = {
  booking_confirmed: {
    en: { title: 'Booking Confirmed ✓',  body: 'Your booking has been confirmed by the provider.' },
    fr: { title: 'Réservation confirmée', body: 'Votre réservation a été confirmée.' },
    ar: { title: 'تم تأكيد الحجز',        body: 'تم تأكيد حجزك من قِبَل مزوّد الخدمة.' },
  },
  booking_completed: {
    en: { title: 'Service Completed',    body: 'How did it go? Leave a review.' },
    fr: { title: 'Service terminé',      body: 'Comment s\'est passé le service ? Laissez un avis.' },
    ar: { title: 'اكتملت الخدمة',        body: 'كيف كانت التجربة؟ اترك تقييماً.' },
  },
  booking_cancelled: {
    en: { title: 'Booking Cancelled',    body: 'Your booking has been cancelled.' },
    fr: { title: 'Réservation annulée',  body: 'Votre réservation a été annulée.' },
    ar: { title: 'تم إلغاء الحجز',       body: 'تم إلغاء حجزك.' },
  },
  new_booking_request: {
    en: { title: 'New Booking Request',  body: 'You have a new service request.' },
    fr: { title: 'Nouvelle demande',     body: 'Vous avez une nouvelle demande de service.' },
    ar: { title: 'طلب حجز جديد',         body: 'لديك طلب خدمة جديد.' },
  },
  payment_succeeded: {
    en: { title: 'Payment Received',     body: 'Your payment was processed successfully.' },
    fr: { title: 'Paiement reçu',        body: 'Votre paiement a été traité avec succès.' },
    ar: { title: 'تم استلام الدفع',       body: 'تمت معالجة دفعتك بنجاح.' },
  },
  payment_failed: {
    en: { title: 'Payment Failed',       body: 'Your payment could not be processed. Please retry.' },
    fr: { title: 'Paiement échoué',      body: 'Le paiement a échoué. Veuillez réessayer.' },
    ar: { title: 'فشل الدفع',            body: 'تعذّرت معالجة دفعتك. يرجى المحاولة مجدداً.' },
  },
};

/**
 * Process unsent notifications from the queue.
 * Call this on a cron job (e.g. every 30 seconds).
 */
async function processNotificationQueue(batchSize = 100) {
  // Fetch unsent queue entries with user tokens + language preference
  const { rows: queued } = await pool.query(
    `SELECT
       q.id           AS queue_id,
       q.user_id,
       q.type,
       q.title,
       q.body,
       q.data,
       u.language_preference AS lang,
       pt.token
     FROM push_notification_queue q
     JOIN auth_users    u  ON u.id  = q.user_id
     JOIN push_tokens   pt ON pt.user_id = q.user_id AND pt.active = TRUE
     WHERE q.sent = FALSE
     ORDER BY q.created_at ASC
     LIMIT $1`,
    [batchSize]
  );

  if (queued.length === 0) return { sent: 0, failed: 0 };

  // Build Expo messages with localised text
  const messages = queued.map((row) => {
    const lang    = row.lang || 'en';
    const tmpl    = TEMPLATES[row.type]?.[lang] || TEMPLATES[row.type]?.en;
    const title   = tmpl?.title || row.title;
    const body    = tmpl?.body  || row.body;

    return {
      _queue_id: row.queue_id,  // internal tracking only
      to:        row.token,
      title,
      body,
      data:      row.data || {},
      sound:     'default',
      badge:     1,
      channelId: 'default',
    };
  });

  // Separate tracking ids from Expo payload
  const trackingIds = messages.map((m) => m._queue_id);
  const expoPayload = messages.map(({ _queue_id, ...rest }) => rest);

  const receipts = await sendExpoMessages(expoPayload);

  // Mark queue entries as sent/failed
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < receipts.length; i++) {
    const receipt   = receipts[i];
    const queueId   = trackingIds[i];
    const token     = queued[i].token;

    if (receipt.status === 'ok') {
      await pool.query(
        `UPDATE push_notification_queue
         SET sent = TRUE, sent_at = NOW()
         WHERE id = $1`,
        [queueId]
      );
      sent++;
    } else {
      const errorMsg = receipt.message || 'Unknown error';
      await pool.query(
        `UPDATE push_notification_queue
         SET error = $1
         WHERE id = $2`,
        [errorMsg, queueId]
      );
      failed++;

      // Deactivate invalid tokens
      if (receipt.details?.error === 'DeviceNotRegistered') {
        await deactivatePushToken(token);
      }
    }
  }

  return { sent, failed };
}

module.exports = {
  registerPushToken,
  deactivatePushToken,
  processNotificationQueue,
  TEMPLATES,
};

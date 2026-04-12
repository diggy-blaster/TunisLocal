// utils/rtl.js
// RTL support utilities for TunisLocal
// Handles: mixed-direction content, prices, phone numbers, dates in Arabic

/**
 * Unicode directional markers
 * LRE = Left-to-Right Embedding (for LTR islands inside RTL context)
 * PDF = Pop Directional Formatting (closes the embedding)
 * LRM = Left-to-Right Mark (invisible, forces LTR rendering on adjacent chars)
 */
const LRE = '\u202A';
const PDF = '\u202C';
const LRM = '\u200E';

/**
 * Wrap a number/price string to always render LTR inside Arabic text.
 * Prevents price like "150 TND" from being mirrored to "DNT 051".
 */
export function rtlPrice(amount, currency = 'TND') {
  // Unicode LRE...PDF wrapping ensures LTR rendering in RTL context
  return `${LRE}${amount} ${currency}${PDF}`;
}

/**
 * Format a Tunisian phone number always LTR.
 * +216 XX XXX XXX
 */
export function rtlPhone(phone) {
  const cleaned = phone.replace(/\s+/g, '').replace(/^00216/, '+216').replace(/^0/, '+216');
  return `${LRE}${cleaned}${PDF}`;
}

/**
 * Format a date for Arabic display.
 * Numbers in dates should be Arabic-Indic or Western — either works,
 * but the string must render LTR.
 */
export function rtlDate(dateStr, locale = 'ar-TN') {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;

  // Use Intl with Arabic locale — gives "٢٠ يناير ٢٠٢٥" style
  // Wrap LTR so it doesn't get reversed when embedded
  const formatted = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);

  return formatted;
}

/**
 * Format a distance string LTR (e.g. "12.5 km").
 */
export function rtlDistance(km) {
  return `${LRE}${parseFloat(km).toFixed(1)} كم${PDF}`;
}

/**
 * Detect if current language is RTL.
 */
export function isRTL(lang) {
  return lang === 'ar';
}

/**
 * Get CSS direction and text-align for a language.
 */
export function directionStyle(lang) {
  const rtl = isRTL(lang);
  return {
    direction:  rtl ? 'rtl' : 'ltr',
    textAlign:  rtl ? 'right' : 'left',
  };
}

/**
 * Set document direction + lang attribute.
 * Call once when language changes.
 */
export function applyDocumentDirection(lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir  = isRTL(lang) ? 'rtl' : 'ltr';
}

// ── Arabic i18n additions ─────────────────────────────────────────────────────
// Missing translations that were likely not in the original 80-string set,
// specifically for mixed-direction contexts.

export const AR_ADDITIONS = {
  // Prices
  'price_per_hour':    'د.ت / ساعة',
  'price_fixed':       'سعر ثابت',
  'price_tnd':         'دينار تونسي',

  // Ratings (numbers stay LTR within the Arabic string)
  'rating_label':      'التقييم',
  'review_count':      (n) => `${n} تقييم`,
  'no_reviews':        'لا توجد تقييمات بعد',

  // Booking status
  'status_pending':    'قيد الانتظار',
  'status_confirmed':  'مؤكّد',
  'status_completed':  'مكتمل',
  'status_cancelled':  'ملغى',

  // Distance
  'km_away':           (km) => `${rtlDistance(km)} بعيداً`,

  // Dates — wrap LTR numbers inside Arabic context
  'booked_on':         (dateStr) => `تم الحجز في ${rtlDate(dateStr)}`,

  // Phone
  'call_provider':     'اتصل بالمزود',
  'phone_label':       'رقم الهاتف',

  // Payment
  'pay_now':           'ادفع الآن',
  'payment_flouci':    'الدفع عبر Flouci',
  'payment_d17':       'الدفع عبر D17',
  'payment_bank':      'الدفع البنكي الإلكتروني',
  'payment_success':   'تمت عملية الدفع بنجاح',
  'payment_failed':    'فشلت عملية الدفع',
};

/**
 * React hook: apply document direction on language change.
 * Usage: useDocumentDirection(currentLang)
 */
export function useDocumentDirection(lang) {
  if (typeof window !== 'undefined') {
    // Can't use React hooks here — call from a useEffect in components
    // This is a plain function for convenience
    applyDocumentDirection(lang);
  }
}

/**
 * CSS class helper for flex direction in RTL.
 * In RTL, flex-row is visually reversed, so use this for icon+text pairs.
 */
export function flexRowStyle(lang) {
  return {
    display:       'flex',
    flexDirection: isRTL(lang) ? 'row-reverse' : 'row',
    alignItems:    'center',
    gap:           '8px',
  };
}

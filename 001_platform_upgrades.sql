-- ============================================================
-- TunisLocal Platform Upgrades Migration
-- Run in order: PostGIS → indexes → reviews → notifications → payments
-- ============================================================

-- ============================================================
-- 1. POSTGIS EXTENSION + SPATIAL INDEX
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Add geometry column (replaces raw lat/lng for spatial queries)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS location_point geometry(Point, 4326);

-- Backfill geometry from existing lat/lng
UPDATE services
SET location_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- GIST spatial index (PostGIS-native, far faster than btree for radius)
CREATE INDEX IF NOT EXISTS idx_services_location_gist
  ON services USING GIST (location_point);

-- Btree fallback indexes on raw columns (used for bounding-box pre-filter)
CREATE INDEX IF NOT EXISTS idx_services_latitude  ON services (latitude);
CREATE INDEX IF NOT EXISTS idx_services_longitude ON services (longitude);

-- Trigger: keep geometry column in sync when lat/lng updated
CREATE OR REPLACE FUNCTION sync_service_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_location_point ON services;
CREATE TRIGGER trg_sync_location_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON services
  FOR EACH ROW EXECUTE FUNCTION sync_service_location_point();


-- ============================================================
-- 2. REVIEWS & RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per completed booking
  UNIQUE (booking_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_service_id  ON reviews (service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews (reviewer_id);

-- Materialised view: pre-computed rating per service
CREATE MATERIALIZED VIEW IF NOT EXISTS service_ratings AS
SELECT
  service_id,
  ROUND(AVG(rating)::numeric, 2)  AS avg_rating,
  COUNT(*)                         AS review_count
FROM reviews
GROUP BY service_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_ratings_service_id
  ON service_ratings (service_id);

-- Refresh helper (called after every review insert/update/delete)
CREATE OR REPLACE FUNCTION refresh_service_ratings()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY service_ratings;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_ratings ON reviews;
CREATE TRIGGER trg_refresh_ratings
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_service_ratings();

-- Constraint: review only allowed on completed bookings
CREATE OR REPLACE FUNCTION check_booking_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = NEW.booking_id AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Reviews can only be submitted for completed bookings.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_booking_completed ON reviews;
CREATE TRIGGER trg_check_booking_completed
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION check_booking_completed();


-- ============================================================
-- 3. COMMISSION CALCULATION ON BOOKING COMPLETION
-- ============================================================

-- Ensure commission_transactions table exists
CREATE TABLE IF NOT EXISTS commission_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id     UUID NOT NULL REFERENCES referrals(id),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  service_amount  NUMERIC(10, 3) NOT NULL,  -- TND
  commission_rate NUMERIC(5, 4)  NOT NULL,
  commission_tnd  NUMERIC(10, 3) NOT NULL,
  processed_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)  -- one commission entry per booking
);

CREATE INDEX IF NOT EXISTS idx_commission_referral_id ON commission_transactions (referral_id);

-- Trigger: fire on bookings.status = 'completed'
CREATE OR REPLACE FUNCTION calculate_commission_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_referral       referrals%ROWTYPE;
  v_service_price  NUMERIC;
  v_commission     NUMERIC;
BEGIN
  -- Only act when transitioning TO 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN

    -- Find referral record where the provider was referred by someone
    SELECT r.* INTO v_referral
    FROM referrals r
    WHERE r.referred_id = NEW.provider_id
    LIMIT 1;

    IF FOUND THEN
      -- Get service price
      SELECT price INTO v_service_price
      FROM services WHERE id = NEW.service_id;

      v_commission := ROUND(v_service_price * v_referral.commission_rate, 3);

      -- Insert commission transaction (idempotent via UNIQUE on booking_id)
      INSERT INTO commission_transactions
        (referral_id, booking_id, service_amount, commission_rate, commission_tnd)
      VALUES
        (v_referral.id, NEW.id, v_service_price, v_referral.commission_rate, v_commission)
      ON CONFLICT (booking_id) DO NOTHING;

      -- Update running total on referrals table
      UPDATE referrals
      SET total_earned = total_earned + v_commission
      WHERE id = v_referral.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_on_completion ON bookings;
CREATE TRIGGER trg_commission_on_completion
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION calculate_commission_on_completion();


-- ============================================================
-- 4. PUSH NOTIFICATION QUEUE
-- ============================================================
CREATE TYPE notification_type AS ENUM (
  'booking_confirmed',
  'booking_completed',
  'booking_cancelled',
  'new_booking_request',
  'review_received',
  'payment_succeeded',
  'payment_failed'
);

CREATE TABLE IF NOT EXISTS push_notification_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB DEFAULT '{}',
  sent            BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_unsent  ON push_notification_queue (sent, created_at) WHERE sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_push_queue_user_id ON push_notification_queue (user_id);

-- Push tokens (Expo push tokens per device)
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT CHECK (platform IN ('ios', 'android', 'web')),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id) WHERE active = TRUE;

-- Enqueue notifications automatically on booking status changes
CREATE OR REPLACE FUNCTION enqueue_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_id UUID;
  v_service_title TEXT;
BEGIN
  SELECT customer_id, provider_id INTO v_customer_id, v_provider_id
  FROM bookings WHERE id = NEW.id;

  SELECT title INTO v_service_title
  FROM services WHERE id = NEW.service_id;

  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    -- Notify customer: booking confirmed
    INSERT INTO push_notification_queue (user_id, type, title, body, data)
    VALUES (
      v_customer_id,
      'booking_confirmed',
      'Booking Confirmed',
      'Your booking for "' || v_service_title || '" has been confirmed.',
      jsonb_build_object('booking_id', NEW.id, 'service_id', NEW.service_id)
    );

  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- Notify customer: completed + prompt review
    INSERT INTO push_notification_queue (user_id, type, title, body, data)
    VALUES (
      v_customer_id,
      'booking_completed',
      'Service Completed',
      'How was "' || v_service_title || '"? Leave a review.',
      jsonb_build_object('booking_id', NEW.id, 'prompt_review', true)
    );

  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    -- Notify both parties
    INSERT INTO push_notification_queue (user_id, type, title, body, data)
    VALUES
      (v_customer_id, 'booking_cancelled', 'Booking Cancelled',
       'Your booking for "' || v_service_title || '" was cancelled.',
       jsonb_build_object('booking_id', NEW.id)),
      (v_provider_id, 'booking_cancelled', 'Booking Cancelled',
       'A booking for "' || v_service_title || '" was cancelled.',
       jsonb_build_object('booking_id', NEW.id));

  ELSIF NEW.status = 'pending' AND OLD.status IS NULL THEN
    -- New booking request → notify provider
    INSERT INTO push_notification_queue (user_id, type, title, body, data)
    VALUES (
      v_provider_id,
      'new_booking_request',
      'New Booking Request',
      'You have a new booking request for "' || v_service_title || '".',
      jsonb_build_object('booking_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_notifications ON bookings;
CREATE TRIGGER trg_booking_notifications
  AFTER INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION enqueue_booking_notifications();


-- ============================================================
-- 5. PAYMENTS TABLE (D17 / Flouci / Online Bank)
-- ============================================================
CREATE TYPE payment_provider AS ENUM ('flouci', 'd17', 'online_bank', 'cash');
CREATE TYPE payment_status    AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'expired');

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  payer_id            UUID NOT NULL REFERENCES auth_users(id),
  provider            payment_provider NOT NULL,
  amount_tnd          NUMERIC(10, 3)   NOT NULL,
  currency            CHAR(3)          NOT NULL DEFAULT 'TND',
  status              payment_status   NOT NULL DEFAULT 'pending',
  -- Gateway-specific fields
  gateway_payment_id  TEXT,           -- Flouci payment_id / D17 ref / bank ref
  gateway_link        TEXT,           -- redirect URL returned by gateway
  gateway_response    JSONB,          -- full raw response stored for audit
  -- Lifecycle
  initiated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  failure_reason      TEXT,
  UNIQUE (booking_id)  -- one payment per booking
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id   ON payments (payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments (status);

-- Auto-confirm booking when payment succeeds
CREATE OR REPLACE FUNCTION confirm_booking_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'succeeded' AND OLD.status IS DISTINCT FROM 'succeeded' THEN
    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = NEW.booking_id AND status = 'pending';

    NEW.confirmed_at := NOW();

    -- Notify payer
    INSERT INTO push_notification_queue (user_id, type, title, body, data)
    VALUES (
      NEW.payer_id,
      'payment_succeeded',
      'Payment Confirmed',
      'Your payment of ' || NEW.amount_tnd || ' TND was received.',
      jsonb_build_object('booking_id', NEW.booking_id, 'payment_id', NEW.id)
    );
  END IF;

  IF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
    NEW.failed_at := NOW();
    INSERT INTO push_notification_queue (user_id, type, title, body, data)
    VALUES (
      NEW.payer_id,
      'payment_failed',
      'Payment Failed',
      'Your payment could not be processed. Please try again.',
      jsonb_build_object('booking_id', NEW.booking_id, 'reason', NEW.failure_reason)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_confirm_booking_on_payment ON payments;
CREATE TRIGGER trg_confirm_booking_on_payment
  BEFORE UPDATE OF status ON payments
  FOR EACH ROW EXECUTE FUNCTION confirm_booking_on_payment();

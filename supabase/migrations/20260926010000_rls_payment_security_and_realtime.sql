-- =================================================================================
-- PRODUCTION SECURITY, RLS HARDENING, SERVER-SIDE COUPON & ORDER FINALIZATION,
-- DATABASE-BACKED RATE LIMITING, ADMIN PASSWORD ROTATION, AND REALTIME PUBLICATION
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 0. ROTATE ADMIN PASSWORD AWAY FROM 'admin123' & REPAIR GOTRUE NULL TOKEN COLUMNS
-- ---------------------------------------------------------------------------------
UPDATE auth.users
SET
  encrypted_password = crypt('Jazelle#Admin!9482$XpQw', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  updated_at = now()
WHERE email = 'admin@jazelle.com';

-- ---------------------------------------------------------------------------------
-- 1. DATABASE-BACKED RATE LIMITING (Serverless-Safe across Edge Functions & Express)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start
  ON public.api_rate_limits(window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all public access to api_rate_limits" ON public.api_rate_limits;
CREATE POLICY "Deny all public access to api_rate_limits"
  ON public.api_rate_limits
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_interval interval := (p_window_seconds || ' seconds')::interval;
  v_record public.api_rate_limits%ROWTYPE;
  v_allowed boolean;
  v_remaining integer;
  v_retry_after integer;
BEGIN
  IF random() < 0.02 THEN
    DELETE FROM public.api_rate_limits
    WHERE updated_at < (v_now - interval '2 hours');
  END IF;

  INSERT INTO public.api_rate_limits (key, request_count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    request_count = CASE
      WHEN (v_now - api_rate_limits.window_start) >= v_window_interval THEN 1
      ELSE api_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN (v_now - api_rate_limits.window_start) >= v_window_interval THEN v_now
      ELSE api_rate_limits.window_start
    END,
    updated_at = v_now
  RETURNING * INTO v_record;

  v_allowed := v_record.request_count <= p_max_requests;
  v_remaining := GREATEST(0, p_max_requests - v_record.request_count);

  IF v_allowed THEN
    v_retry_after := 0;
  ELSE
    v_retry_after := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_record.window_start + v_window_interval) - v_now)))::integer
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'count', v_record.request_count,
    'limit', p_max_requests,
    'remaining', v_remaining,
    'retry_after', v_retry_after
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- 2. PRODUCT_REVIEWS RLS FIX: Customers can NEVER self-approve (is_approved = false)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS product_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_reviews_select" ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_insert" ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_update" ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_delete" ON public.product_reviews;

-- Only approved reviews are visible to public/customers; admins can see all for moderation
CREATE POLICY "product_reviews_select"
  ON public.product_reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true OR public.is_admin());

-- Non-admin authenticated users MUST insert with is_approved = false
CREATE POLICY "product_reviews_insert"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_approved = false AND (user_id IS NULL OR auth.uid() = user_id))
    OR public.is_admin()
  );

-- Only admins can approve, hide, or edit reviews
CREATE POLICY "product_reviews_update"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only admins can delete reviews
CREATE POLICY "product_reviews_delete"
  ON public.product_reviews FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------------
-- 3. COUPONS RLS LOCKDOWN & SECURITY DEFINER validate_coupon(p_code text) RPC
-- ---------------------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select" ON public.coupons;
DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_select_admin_only" ON public.coupons;
DROP POLICY IF EXISTS "coupons_insert" ON public.coupons;
DROP POLICY IF EXISTS "coupons_update" ON public.coupons;
DROP POLICY IF EXISTS "coupons_delete" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_insert" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_update" ON public.coupons;
DROP POLICY IF EXISTS "coupons_admin_delete" ON public.coupons;

-- Remove direct client SELECT * access; only admins can SELECT from public.coupons
CREATE POLICY "coupons_select_admin_only"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "coupons_insert"
  ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_update"
  ON public.coupons FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_delete"
  ON public.coupons FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Server-side coupon validation RPC: checks is_active, expiry_date, and usage_limit,
-- and returns ONLY discount_type and discount_value if valid.
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code text := upper(trim(COALESCE(p_code, '')));
  v_coupon public.coupons%ROWTYPE;
  v_rate jsonb;
BEGIN
  IF v_clean_code = '' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Please enter a promo code.'
    );
  END IF;

  -- Rate limit coupon validation attempts (max 10 per 60 seconds per user/session)
  v_rate := public.check_and_increment_rate_limit(
    'coupon_validate:' || COALESCE(auth.uid()::text, 'anon'),
    10,
    60
  );
  IF NOT COALESCE((v_rate->>'allowed')::boolean, true) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Too many promo code attempts. Please wait a minute and try again.'
    );
  END IF;

  SELECT *
  INTO v_coupon
  FROM public.coupons
  WHERE upper(trim(code)) = v_clean_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Promo code "%s" was not found.', v_clean_code)
    );
  END IF;

  IF v_coupon.is_active IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Promo code "%s" is currently disabled.', v_clean_code)
    );
  END IF;

  IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Promo code "%s" has expired.', v_clean_code)
    );
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_limit > 0 AND COALESCE(v_coupon.used_count, 0) >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Promo code "%s" has reached its maximum usage limit.', v_clean_code)
    );
  END IF;

  -- Return ONLY code, discount_type, and discount_value (never id, usage_limit, or used_count)
  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- 4. ORDERS SCHEMA, IDEMPOTENCY & SERVER-SIDE FINALIZATION
-- ---------------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stock_decremented boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_decremented_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_reference_unique
  ON public.orders(payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_verifications (
  reference text PRIMARY KEY,
  order_number text NOT NULL,
  amount_kobo bigint NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'verified',
  verified_via text NOT NULL DEFAULT 'edge_function',
  paystack_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view payment verifications" ON public.payment_verifications;
CREATE POLICY "Admins can view payment verifications"
  ON public.payment_verifications
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Atomic stock decrement claim (RESTRICTED TO service_role ONLY)
CREATE OR REPLACE FUNCTION public.claim_order_stock_decrement(
  p_order_number text,
  p_payment_reference text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  UPDATE public.orders
  SET
    stock_decremented = true,
    stock_decremented_at = now(),
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    payment_status = 'paid',
    status = CASE WHEN status = 'pending' THEN 'placed' ELSE status END,
    updated_at = now()
  WHERE order_number = p_order_number
    AND stock_decremented = false
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_order_stock_decrement(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_stock_decrement(text, text) TO service_role;

-- Orders RLS Policies:
-- 1. Guests & authenticated users can INSERT a 'pending' order.
-- 2. Only the order owner (auth.uid() = user_id) or admin can SELECT directly from orders.
-- 3. Only admins (or service_role via verify-paystack / webhook) can UPDATE or DELETE orders.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

CREATE POLICY "orders_insert_policy"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND (
      (auth.uid() IS NULL AND user_id IS NULL)
      OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
      OR public.is_admin()
    )
  );

CREATE POLICY "orders_select_policy"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "orders_update_policy"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_delete_policy"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------------
-- 5. TRACK_ORDER RPC (Used by OrderConfirmationPage.tsx & TrackOrderPage.tsx)
--    Single function with p_contact DEFAULT '' supports both 1-arg and 2-arg RPC calls
-- ---------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.track_order(text);
DROP FUNCTION IF EXISTS public.track_order(text, text);

CREATE OR REPLACE FUNCTION public.track_order(p_order_number text, p_contact text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_clean_contact text := lower(trim(COALESCE(p_contact, '')));
BEGIN
  IF trim(COALESCE(p_order_number, '')) = '' THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE upper(trim(order_number)) = upper(trim(p_order_number))
    AND (
      v_clean_contact = ''
      OR lower(trim(COALESCE(customer_email, ''))) = v_clean_contact
      OR regexp_replace(COALESCE(customer_phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_clean_contact, '[^0-9]', '', 'g')
      OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR public.is_admin()
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', COALESCE(v_order.payment_status, CASE WHEN v_order.status = 'pending' THEN 'pending' ELSE 'paid' END),
    'items', v_order.items,
    'subtotal', v_order.subtotal,
    'delivery_fee', v_order.delivery_fee,
    'discount_amount', COALESCE(v_order.discount_amount, 0),
    'coupon_code', v_order.coupon_code,
    'total', v_order.total,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'delivery_address', v_order.delivery_address,
    'delivery_state', v_order.delivery_state,
    'delivery_lga', v_order.delivery_lga,
    'payment_method', v_order.payment_method,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------
-- 6. NEWSLETTER_SUBSCRIBERS TABLE & RLS
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text NOT NULL DEFAULT 'footer_newsletter',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_subscribers_insert" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_select" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_delete" ON public.newsletter_subscribers;

CREATE POLICY "newsletter_subscribers_insert"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);

CREATE POLICY "newsletter_subscribers_select"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "newsletter_subscribers_delete"
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------------
-- 7. ENABLE SUPABASE REALTIME PUBLICATION ON CORE TABLES
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['orders', 'product_reviews', 'products', 'site_settings', 'profiles']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;

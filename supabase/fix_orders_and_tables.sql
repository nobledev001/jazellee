-- ============================================================
-- JAZELLE SKIN HAVEN: SYNC ORDERS & DATA ACROSS ALL BROWSERS (PRODUCTION SECURE)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/otdvuuxmnlfjvtjifudq/sql)
-- ============================================================

-- 1. Ensure `orders` table structure is up to date
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal integer NOT NULL DEFAULT 0,
  delivery_fee integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'placed',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  delivery_state text NOT NULL,
  delivery_lga text NOT NULL,
  delivery_landmark text DEFAULT '',
  payment_method text NOT NULL DEFAULT 'card',
  payment_status text NOT NULL DEFAULT 'paid',
  payment_reference text DEFAULT '',
  coupon_code text DEFAULT '',
  discount_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allow guest orders (user_id is nullable for guest checkouts)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Add payment and idempotency columns if they do not exist yet
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_decremented boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_decremented_at timestamptz DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;

-- Partial unique index to prevent duplicate orders with the same non-empty payment reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_payment_reference
  ON public.orders (payment_reference)
  WHERE payment_reference IS NOT NULL AND payment_reference != '';

-- Atomic function to claim stock decrement and order completion (Server-Side Idempotency)
CREATE OR REPLACE FUNCTION public.claim_order_stock_decrement(
  p_order_number text,
  p_payment_ref text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.orders
  SET
    stock_decremented = true,
    stock_decremented_at = COALESCE(stock_decremented_at, now()),
    payment_status = 'paid',
    status = 'placed',
    payment_reference = CASE WHEN p_payment_ref != '' THEN p_payment_ref ELSE payment_reference END,
    updated_at = now()
  WHERE order_number = p_order_number
    AND stock_decremented = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_order_stock_decrement(text, text) TO anon, authenticated;

-- Server-side Admin Login Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text DEFAULT '',
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_time
  ON public.admin_login_attempts (email, attempted_at DESC);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_admin_login_lockout(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_failures integer;
  v_lockout_seconds integer := 900;
  v_max_attempts integer := 5;
  v_last_attempt timestamptz;
  v_remaining_seconds integer;
BEGIN
  SELECT count(*), max(attempted_at)
  INTO v_recent_failures, v_last_attempt
  FROM public.admin_login_attempts
  WHERE lower(email) = lower(trim(p_email))
    AND success = false
    AND attempted_at > (now() - interval '15 minutes');

  IF v_recent_failures >= v_max_attempts THEN
    v_remaining_seconds := GREATEST(1, v_lockout_seconds - EXTRACT(EPOCH FROM (now() - v_last_attempt))::integer);
    RETURN jsonb_build_object(
      'locked', true,
      'failed_attempts', v_recent_failures,
      'remaining_seconds', v_remaining_seconds,
      'message', format('Too many failed login attempts. Account locked for %s more seconds.', v_remaining_seconds)
    );
  END IF;

  RETURN jsonb_build_object('locked', false, 'failed_attempts', v_recent_failures);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_login_lockout(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_admin_login_attempt(p_email text, p_success boolean, p_ip text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.admin_login_attempts (email, success, ip_address, attempted_at)
  VALUES (lower(trim(p_email)), p_success, p_ip, now());

  IF p_success THEN
    DELETE FROM public.admin_login_attempts WHERE lower(email) = lower(trim(p_email));
  END IF;

  DELETE FROM public.admin_login_attempts WHERE attempted_at < (now() - interval '24 hours');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_admin_login_attempt(text, boolean, text) TO anon, authenticated;

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Clean up any open or vulnerable policies
DROP POLICY IF EXISTS "Allow public order selection" ON public.orders;
DROP POLICY IF EXISTS "Allow order status update" ON public.orders;
DROP POLICY IF EXISTS "Allow public order insertion" ON public.orders;
DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
DROP POLICY IF EXISTS "insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "delete_own_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_read_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;

-- SECURE POLICIES FOR ORDERS:
-- Customers can only SELECT their own orders; Admins can select all
CREATE POLICY "orders_select_policy" ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Customers/guests can place orders
CREATE POLICY "orders_insert_policy" ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
    OR (auth.uid() IS NULL AND user_id IS NULL)
    OR public.is_admin()
  );

-- ONLY admins can update orders (order status, fulfillment)
CREATE POLICY "orders_update_policy" ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ONLY admins can delete orders
CREATE POLICY "orders_delete_policy" ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 2. Ensure `coupons` table is securely configured
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 0,
  expiry text DEFAULT '',
  usage_limit integer NOT NULL DEFAULT 100,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public coupon selection" ON public.coupons;
DROP POLICY IF EXISTS "Allow public coupon insert" ON public.coupons;
DROP POLICY IF EXISTS "Allow public coupon update" ON public.coupons;
DROP POLICY IF EXISTS "public_read_coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin_insert_coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin_update_coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin_delete_coupons" ON public.coupons;

CREATE POLICY "coupons_select_policy" ON public.coupons FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "coupons_admin_insert" ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_admin_update" ON public.coupons FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_admin_delete" ON public.coupons FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. Ensure `reviews` table exists and is secured
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_slug text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public review selection" ON public.reviews;
DROP POLICY IF EXISTS "Allow public review insertion" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;

CREATE POLICY "reviews_select" ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true OR public.is_admin());

CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 4. Ensure `site_content` table is secured
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public site_content selection" ON public.site_content;
DROP POLICY IF EXISTS "Allow public site_content modification" ON public.site_content;

CREATE POLICY "site_content_select" ON public.site_content FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "site_content_admin_mutation" ON public.site_content FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Persistent Serverless-Safe Rate Limiting & Admin Lockout
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text DEFAULT '',
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_time
  ON public.admin_login_attempts (email, attempted_at DESC);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_admin_login_lockout(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_failures integer;
  v_lockout_seconds integer := 900;
  v_max_attempts integer := 5;
  v_last_attempt timestamptz;
  v_remaining_seconds integer;
BEGIN
  SELECT count(*), max(attempted_at)
  INTO v_recent_failures, v_last_attempt
  FROM public.admin_login_attempts
  WHERE lower(email) = lower(trim(p_email))
    AND success = false
    AND attempted_at > (now() - interval '15 minutes');

  IF v_recent_failures >= v_max_attempts THEN
    v_remaining_seconds := GREATEST(1, v_lockout_seconds - EXTRACT(EPOCH FROM (now() - v_last_attempt))::integer);
    RETURN jsonb_build_object(
      'locked', true,
      'failed_attempts', v_recent_failures,
      'remaining_seconds', v_remaining_seconds,
      'message', format('Too many failed login attempts. Account locked for %s more seconds.', v_remaining_seconds)
    );
  END IF;

  RETURN jsonb_build_object('locked', false, 'failed_attempts', v_recent_failures);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_admin_login_lockout(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_admin_login_attempt(p_email text, p_success boolean, p_ip text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.admin_login_attempts (email, success, ip_address, attempted_at)
  VALUES (lower(trim(p_email)), p_success, p_ip, now());

  IF p_success THEN
    DELETE FROM public.admin_login_attempts WHERE lower(email) = lower(trim(p_email));
  END IF;

  DELETE FROM public.admin_login_attempts WHERE attempted_at < (now() - interval '24 hours');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_admin_login_attempt(text, boolean, text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_time
  ON public.api_rate_limits (bucket_key, created_at DESC);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  SELECT count(*)
  INTO v_count
  FROM public.api_rate_limits
  WHERE bucket_key = p_key
    AND created_at > v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'max_requests', p_max_requests,
      'remaining', 0,
      'retry_after', p_window_seconds
    );
  END IF;

  INSERT INTO public.api_rate_limits (bucket_key, created_at)
  VALUES (p_key, now());

  IF random() < 0.05 THEN
    DELETE FROM public.api_rate_limits WHERE created_at < (now() - interval '2 hours');
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'max_requests', p_max_requests,
    'remaining', p_max_requests - (v_count + 1),
    'retry_after', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO anon, authenticated, service_role;


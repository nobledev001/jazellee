-- ============================================================
-- JAZELLE SKIN HAVEN: PAYMENT IDEMPOTENCY, STOCK GUARDS & RATE LIMITING
-- ============================================================

-- 1. Ensure orders table has server-side idempotency columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_decremented boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_decremented_at timestamptz DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- 2. Partial unique index to prevent duplicate orders with the same non-empty payment reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_payment_reference
  ON public.orders (payment_reference)
  WHERE payment_reference IS NOT NULL AND payment_reference != '';

-- 3. Atomic function to claim stock decrement and order completion
-- Exactly one caller (frontend callback or Paystack webhook) can successfully claim decrement.
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

-- Grant execution to authenticated & anon roles (wrapped safely with security definer)
GRANT EXECUTE ON FUNCTION public.claim_order_stock_decrement(text, text) TO anon, authenticated;

-- 4. Server-side Admin Login Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text DEFAULT '',
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email_time
  ON public.admin_login_attempts (email, attempted_at DESC);

-- Enable RLS on admin login attempts
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated to execute lockout check & record functions
CREATE OR REPLACE FUNCTION public.check_admin_login_lockout(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_failures integer;
  v_lockout_seconds integer := 900; -- 15 minutes lockout window
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

  RETURN jsonb_build_object(
    'locked', false,
    'failed_attempts', v_recent_failures
  );
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

  -- If successful login, clear previous failed attempts for this email
  IF p_success THEN
    DELETE FROM public.admin_login_attempts WHERE lower(email) = lower(trim(p_email));
  END IF;

  -- Clean up old logs beyond 24 hours
  DELETE FROM public.admin_login_attempts WHERE attempted_at < (now() - interval '24 hours');
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_admin_login_attempt(text, boolean, text) TO anon, authenticated;

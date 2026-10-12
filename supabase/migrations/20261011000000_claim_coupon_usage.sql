-- ============================================================
-- MIGRATION: Atomic Coupon Usage Claim Function (Race Condition Prevention)
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_coupon_usage(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id
    AND is_active = true
    AND (usage_limit IS NULL OR usage_limit <= 0 OR used_count < usage_limit)
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

COMMENT ON FUNCTION public.claim_coupon_usage(uuid) IS
  'Atomically increments coupon used_count if active and under usage_limit in a single statement. Returns true if successfully claimed, false otherwise.';

REVOKE EXECUTE ON FUNCTION public.claim_coupon_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_coupon_usage(uuid) TO anon, authenticated, service_role;

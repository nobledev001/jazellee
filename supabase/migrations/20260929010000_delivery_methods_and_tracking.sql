-- =================================================================================
-- JAZELLE SKIN HAVEN — DELIVERY METHODS, PRICING SETTINGS & TRACKING NUMBER
-- =================================================================================

-- 1. Add delivery_method, delivery_method_details, and tracking_number columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_method_details JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT NULL;

-- 2. Seed default delivery method fees in public.site_settings (without overwriting customized values)
INSERT INTO public.site_settings (key, value) VALUES
  ('delivery_fee_motor_park', '2000'),
  ('delivery_fee_jumia', '3000'),
  ('delivery_fee_fez', '2500'),
  ('standard_delivery_fee', '3500')
ON CONFLICT (key) DO NOTHING;

-- 3. Update public.track_order RPC to include delivery_method, delivery_method_details, and tracking_number
CREATE OR REPLACE FUNCTION public.track_order(p_order_number TEXT, p_contact TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_clean_contact TEXT;
  v_digits_contact TEXT;
  v_digits_order_phone TEXT;
BEGIN
  IF p_order_number IS NULL OR trim(p_order_number) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE upper(trim(order_number)) = upper(trim(p_order_number))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Verify ownership via authenticated user_id OR matching email/phone
  IF auth.uid() IS NOT NULL AND v_order.user_id = auth.uid() THEN
    -- Authenticated owner matches
  ELSE
    v_clean_contact := lower(trim(COALESCE(p_contact, '')));
    IF v_clean_contact = '' THEN
      RETURN NULL;
    END IF;

    v_digits_contact := regexp_replace(v_clean_contact, '\D', '', 'g');
    v_digits_order_phone := regexp_replace(COALESCE(v_order.customer_phone, ''), '\D', '', 'g');

    IF lower(trim(COALESCE(v_order.customer_email, ''))) <> v_clean_contact
       AND (
         length(v_digits_contact) < 7
         OR right(v_digits_order_phone, 10) <> right(v_digits_contact, 10)
       )
    THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'items', v_order.items,
    'subtotal', v_order.subtotal,
    'discount_amount', COALESCE(v_order.discount_amount, 0),
    'coupon_code', v_order.coupon_code,
    'delivery_fee', v_order.delivery_fee,
    'total', v_order.total,
    'customer_name', v_order.customer_name,
    'customer_email', v_order.customer_email,
    'customer_phone', v_order.customer_phone,
    'delivery_address', v_order.delivery_address,
    'delivery_state', v_order.delivery_state,
    'delivery_lga', v_order.delivery_lga,
    'delivery_landmark', v_order.delivery_landmark,
    'delivery_method', COALESCE(v_order.delivery_method, 'standard'),
    'delivery_method_details', v_order.delivery_method_details,
    'tracking_number', v_order.tracking_number,
    'payment_method', v_order.payment_method,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(TEXT, TEXT) TO anon, authenticated;

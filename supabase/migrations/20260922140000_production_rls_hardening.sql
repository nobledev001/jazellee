-- ============================================================
-- JAZELLE SKIN HAVEN: PRODUCTION RLS HARDENING MIGRATION
-- Ensures strict customer data isolation and admin-only privilege enforcement
-- ============================================================

-- 1. Ensure is_admin() helper function exists and is secured
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'owner')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 2. HARDEN ORDERS TABLE
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Clean up any existing or overly permissive policies
DROP POLICY IF EXISTS "Allow public order selection" ON public.orders;
DROP POLICY IF EXISTS "Allow order status update" ON public.orders;
DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
DROP POLICY IF EXISTS "insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "delete_own_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_read_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;
DROP POLICY IF EXISTS "admin_delete_orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public order insertion" ON public.orders;

-- SELECT: Customers can ONLY see their own orders; Admins can see all
CREATE POLICY "orders_select_policy" ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- INSERT: Authenticated customers can insert with their own user_id,
-- or anonymous visitors can insert guest checkout orders (user_id IS NULL)
CREATE POLICY "orders_insert_policy" ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- If authenticated, user_id must either match current user or be null for guest checkout
    (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
    OR (auth.uid() IS NULL AND user_id IS NULL)
    OR public.is_admin()
  );

-- UPDATE: STRICTLY ADMIN ONLY. Customers must NEVER update order status or order totals!
CREATE POLICY "orders_update_policy" ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: STRICTLY ADMIN ONLY
CREATE POLICY "orders_delete_policy" ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 3. HARDEN ADDRESSES TABLE
-- ============================================================
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_addresses" ON public.addresses;
DROP POLICY IF EXISTS "insert_own_addresses" ON public.addresses;
DROP POLICY IF EXISTS "update_own_addresses" ON public.addresses;
DROP POLICY IF EXISTS "delete_own_addresses" ON public.addresses;
DROP POLICY IF EXISTS "admin_read_addresses" ON public.addresses;

CREATE POLICY "addresses_select_policy" ON public.addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "addresses_insert_policy" ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_policy" ON public.addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_policy" ON public.addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. HARDEN PROFILES TABLE
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Ensure role column cannot be updated directly by authenticated users
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

-- ============================================================
-- 5. HARDEN COUPONS TABLE
-- ============================================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin_insert_coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin_update_coupons" ON public.coupons;
DROP POLICY IF EXISTS "admin_delete_coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public coupon selection" ON public.coupons;
DROP POLICY IF EXISTS "Allow public coupon insert" ON public.coupons;
DROP POLICY IF EXISTS "Allow public coupon update" ON public.coupons;

-- Remove direct client SELECT * access; storefront validates via SECURITY DEFINER RPC validate_coupon(p_code text)
CREATE POLICY "coupons_select_policy" ON public.coupons FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Mutations strictly admin only
CREATE POLICY "coupons_insert_policy" ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_update_policy" ON public.coupons FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "coupons_delete_policy" ON public.coupons FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 6. HARDEN REVIEWS TABLES (both product_reviews and reviews if present)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_reviews') THEN
    ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "select_reviews" ON public.product_reviews;
    DROP POLICY IF EXISTS "insert_own_review" ON public.product_reviews;
    DROP POLICY IF EXISTS "admin_update_reviews" ON public.product_reviews;
    DROP POLICY IF EXISTS "delete_own_review" ON public.product_reviews;

    CREATE POLICY "product_reviews_select" ON public.product_reviews FOR SELECT
      TO anon, authenticated
      USING (is_approved = true OR public.is_admin());

    CREATE POLICY "product_reviews_insert" ON public.product_reviews FOR INSERT
      TO authenticated
      WITH CHECK (
        (is_approved = false AND (user_id IS NULL OR auth.uid() = user_id))
        OR public.is_admin()
      );

    CREATE POLICY "product_reviews_update" ON public.product_reviews FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    CREATE POLICY "product_reviews_delete" ON public.product_reviews FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id OR public.is_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public review selection" ON public.reviews;
    DROP POLICY IF EXISTS "Allow public review insertion" ON public.reviews;

    CREATE POLICY "reviews_select" ON public.reviews FOR SELECT
      TO anon, authenticated
      USING (is_approved = true OR public.is_admin());

    CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT
      TO authenticated
      WITH CHECK (
        (is_approved = false AND (user_id IS NULL OR auth.uid() = user_id))
        OR public.is_admin()
      );

    CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    CREATE POLICY "reviews_delete" ON public.reviews FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id OR public.is_admin());
  END IF;
END $$;

-- ============================================================
-- 7. HARDEN SITE_CONTENT AND SITE_SETTINGS
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_content') THEN
    ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public site_content selection" ON public.site_content;
    DROP POLICY IF EXISTS "Allow public site_content modification" ON public.site_content;

    CREATE POLICY "site_content_select" ON public.site_content FOR SELECT
      TO anon, authenticated USING (true);

    CREATE POLICY "site_content_admin_mutation" ON public.site_content FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
    ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_read_settings" ON public.site_settings;
    DROP POLICY IF EXISTS "admin_insert_settings" ON public.site_settings;
    DROP POLICY IF EXISTS "admin_update_settings" ON public.site_settings;
    DROP POLICY IF EXISTS "admin_delete_settings" ON public.site_settings;

    CREATE POLICY "site_settings_select" ON public.site_settings FOR SELECT
      TO anon, authenticated USING (true);

    CREATE POLICY "site_settings_insert" ON public.site_settings FOR INSERT
      TO authenticated WITH CHECK (public.is_admin());

    CREATE POLICY "site_settings_update" ON public.site_settings FOR UPDATE
      TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

    CREATE POLICY "site_settings_delete" ON public.site_settings FOR DELETE
      TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- ============================================================
-- 8. HARDEN STORAGE (product-images bucket)
-- ============================================================
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;

-- Only authenticated ADMINS can upload, update, or delete in product-images
CREATE POLICY "Admin upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin());

-- ============================================================
-- 9. SAFE GUEST ORDER TRACKING RPC FUNCTION
-- Prevents public order enumeration while allowing legitimate tracking
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_order(p_order_number text, p_contact text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order record;
BEGIN
  IF p_order_number IS NULL OR trim(p_order_number) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE order_number = trim(p_order_number)
    AND (
      -- Must match customer email (case-insensitive) OR phone OR be the logged-in owner
      lower(customer_email) = lower(trim(p_contact))
      OR customer_phone = trim(p_contact)
      OR user_id = auth.uid()
      OR public.is_admin()
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Return only non-sensitive order tracking data
  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'items', v_order.items,
    'total', v_order.total,
    'delivery_fee', v_order.delivery_fee,
    'subtotal', v_order.subtotal,
    'customer_name', v_order.customer_name,
    'delivery_state', v_order.delivery_state,
    'delivery_lga', v_order.delivery_lga,
    'created_at', v_order.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;

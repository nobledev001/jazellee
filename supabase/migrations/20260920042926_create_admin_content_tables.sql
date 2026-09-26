/*
# Create admin content tables and seed admin account

## What this does
Creates all content/data tables for the admin dashboard, adds admin policies to existing orders/addresses tables, creates set_user_role() function, and seeds the default admin account.

## New Tables
### products — slug, name, category, price, image, gallery, description, details, stock, label, is_active, sort_order
### categories — name, description, image, sort_order
### concerns — label, emoji, sort_order, is_active
### product_reviews — product_id, product_slug, user_id, reviewer_name, rating, text, is_approved
### coupons — code, discount_type, discount_value, expiry, usage_limit, used_count, is_active
### journal_articles — slug, title, excerpt, body, category, read_time, image, is_featured, is_published
### faq_sections — title, icon, sort_order
### faq_items — section_id, question, answer, sort_order
### site_settings — key, value, updated_at
### jazelle_picks — product_slug, sort_order

## Security
- All tables RLS enabled
- Public tables: anon+authenticated read, admin-only writes (via is_admin())
- product_reviews: public read approved only, admin read all, authenticated insert own
- orders: added admin read-all + admin update policies, added coupon_code + discount_amount columns
- addresses: added admin read-all policy
- set_user_role() SECURITY DEFINER function for admin-only role changes

## Modified Tables
- orders: +coupon_code (text), +discount_amount (integer default 0)
- orders: +admin_read_orders, +admin_update_orders policies
- addresses: +admin_read_addresses policy
*/

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  image text NOT NULL DEFAULT '',
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text NOT NULL DEFAULT '',
  what_it_does text NOT NULL DEFAULT '',
  who_its_for text NOT NULL DEFAULT '',
  how_to_use text NOT NULL DEFAULT '',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  size text NOT NULL DEFAULT '',
  stock integer NOT NULL DEFAULT 0,
  label text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_products" ON public.products;
CREATE POLICY "admin_insert_products" ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_products" ON public.products;
CREATE POLICY "admin_update_products" ON public.products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_products" ON public.products;
CREATE POLICY "admin_delete_products" ON public.products FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON public.categories;
CREATE POLICY "admin_insert_categories" ON public.categories FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_categories" ON public.categories;
CREATE POLICY "admin_update_categories" ON public.categories FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_categories" ON public.categories;
CREATE POLICY "admin_delete_categories" ON public.categories FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- CONCERNS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.concerns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_concerns" ON public.concerns;
CREATE POLICY "public_read_concerns" ON public.concerns FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_concerns" ON public.concerns;
CREATE POLICY "admin_insert_concerns" ON public.concerns FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_concerns" ON public.concerns;
CREATE POLICY "admin_update_concerns" ON public.concerns FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_concerns" ON public.concerns;
CREATE POLICY "admin_delete_concerns" ON public.concerns FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- PRODUCT REVIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  text text NOT NULL DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reviews" ON public.product_reviews;
CREATE POLICY "select_reviews" ON public.product_reviews FOR SELECT
  TO anon, authenticated USING (is_approved = true OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_review" ON public.product_reviews;
CREATE POLICY "insert_own_review" ON public.product_reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_update_reviews" ON public.product_reviews;
CREATE POLICY "admin_update_reviews" ON public.product_reviews FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_own_review" ON public.product_reviews;
CREATE POLICY "delete_own_review" ON public.product_reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- COUPONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 0,
  expiry_date timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_coupons" ON public.coupons;
CREATE POLICY "public_read_coupons" ON public.coupons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_coupons" ON public.coupons;
CREATE POLICY "admin_insert_coupons" ON public.coupons FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_coupons" ON public.coupons;
CREATE POLICY "admin_update_coupons" ON public.coupons FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_coupons" ON public.coupons;
CREATE POLICY "admin_delete_coupons" ON public.coupons FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- JOURNAL ARTICLES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.journal_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  read_time text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.journal_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_journal" ON public.journal_articles;
CREATE POLICY "public_read_journal" ON public.journal_articles FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "admin_read_journal" ON public.journal_articles;
CREATE POLICY "admin_read_journal" ON public.journal_articles FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_insert_journal" ON public.journal_articles;
CREATE POLICY "admin_insert_journal" ON public.journal_articles FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_journal" ON public.journal_articles;
CREATE POLICY "admin_update_journal" ON public.journal_articles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_journal" ON public.journal_articles;
CREATE POLICY "admin_delete_journal" ON public.journal_articles FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TRIGGER journal_updated_at BEFORE UPDATE ON public.journal_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FAQ TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.faq_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'HelpCircle',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.faq_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_faq_sections" ON public.faq_sections;
CREATE POLICY "public_read_faq_sections" ON public.faq_sections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_faq_sections" ON public.faq_sections;
CREATE POLICY "admin_insert_faq_sections" ON public.faq_sections FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_faq_sections" ON public.faq_sections;
CREATE POLICY "admin_update_faq_sections" ON public.faq_sections FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_faq_sections" ON public.faq_sections;
CREATE POLICY "admin_delete_faq_sections" ON public.faq_sections FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES public.faq_sections(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_faq_items" ON public.faq_items;
CREATE POLICY "public_read_faq_items" ON public.faq_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_faq_items" ON public.faq_items;
CREATE POLICY "admin_insert_faq_items" ON public.faq_items FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_faq_items" ON public.faq_items;
CREATE POLICY "admin_update_faq_items" ON public.faq_items FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_faq_items" ON public.faq_items;
CREATE POLICY "admin_delete_faq_items" ON public.faq_items FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- SITE SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON public.site_settings;
CREATE POLICY "public_read_settings" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_settings" ON public.site_settings;
CREATE POLICY "admin_insert_settings" ON public.site_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_settings" ON public.site_settings;
CREATE POLICY "admin_update_settings" ON public.site_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_settings" ON public.site_settings;
CREATE POLICY "admin_delete_settings" ON public.site_settings FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- JAZELLE PICKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jazelle_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.jazelle_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_picks" ON public.jazelle_picks;
CREATE POLICY "public_read_picks" ON public.jazelle_picks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_picks" ON public.jazelle_picks;
CREATE POLICY "admin_insert_picks" ON public.jazelle_picks FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_picks" ON public.jazelle_picks;
CREATE POLICY "admin_update_picks" ON public.jazelle_picks FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_picks" ON public.jazelle_picks;
CREATE POLICY "admin_delete_picks" ON public.jazelle_picks FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- ADD ADMIN POLICIES TO EXISTING ORDERS TABLE
-- ============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "admin_read_orders" ON public.orders;
CREATE POLICY "admin_read_orders" ON public.orders FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_orders" ON public.orders;
CREATE POLICY "admin_update_orders" ON public.orders FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- ADD ADMIN POLICY TO EXISTING ADDRESSES TABLE
-- ============================================================

DROP POLICY IF EXISTS "admin_read_addresses" ON public.addresses;
CREATE POLICY "admin_read_addresses" ON public.addresses FOR SELECT
  TO authenticated USING (public.is_admin());

-- ============================================================
-- SET USER ROLE FUNCTION (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('customer', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  UPDATE public.profiles SET role = p_role, updated_at = now() WHERE id = p_user_id;

  UPDATE auth.users SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(p_role)
  ) WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- ============================================================
-- SEED ADMIN ACCOUNT
-- ============================================================

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@jazelle.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  '{"role": "admin"}'::jsonb,
  '{"full_name": "Admin"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@jazelle.com'
);

-- Ensure any existing SQL-seeded auth.users rows do not have NULL string tokens (fixes GoTrue "Database error querying schema")
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE email = 'admin@jazelle.com';

-- The handle_new_user trigger will create the profile row.
-- Update it to set role = 'admin'.
UPDATE public.profiles SET role = 'admin'
WHERE email = 'admin@jazelle.com' AND role = 'customer';
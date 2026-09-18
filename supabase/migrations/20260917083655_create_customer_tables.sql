/*
# Create customer addresses and orders tables

## What this does
Creates two new tables for the Jazelle Skin Haven e-commerce flow:
- `addresses`: saved delivery addresses per authenticated customer
- `orders`: order records with status tracking per authenticated customer

## New Tables

### addresses
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users, not null, defaults to auth.uid())
- `label` (text, e.g. "Home", "Office")
- `full_name` (text)
- `phone` (text)
- `address` (text, street address)
- `state` (text, Nigerian state)
- `lga` (text, local government area / city area)
- `landmark` (text, optional)
- `is_default` (boolean, default false)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### orders
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users, not null, defaults to auth.uid())
- `order_number` (text, unique, human-readable order ID like JAZ-12345678)
- `items` (jsonb, array of {slug, name, price, quantity, image})
- `subtotal` (integer, in kobo/naira)
- `delivery_fee` (integer)
- `total` (integer)
- `status` (text, default 'placed' — values: placed, processing, shipped, delivered)
- `customer_name` (text)
- `customer_email` (text)
- `customer_phone` (text)
- `delivery_address` (text)
- `delivery_state` (text)
- `delivery_lga` (text)
- `delivery_landmark` (text, optional)
- `payment_method` (text, e.g. 'card', 'bank', 'ussd')
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security
- Both tables have RLS enabled
- Both tables are owner-scoped: authenticated users can only CRUD their own rows
- `user_id` columns default to `auth.uid()` so inserts omitting user_id still work

## Important notes
1. The `orders` table stores a snapshot of items and delivery info at order time, so order history remains accurate even if products change later.
2. `order_number` is a human-readable unique ID shown to the customer; the `id` UUID is the primary key.
3. Both tables use `DEFAULT auth.uid()` on `user_id` so client-side inserts that omit `user_id` still satisfy RLS.
*/

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  lga text NOT NULL,
  landmark text DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_addresses" ON addresses;
CREATE POLICY "select_own_addresses" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_addresses" ON addresses;
CREATE POLICY "insert_own_addresses" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_addresses" ON addresses;
CREATE POLICY "update_own_addresses" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_addresses" ON addresses;
CREATE POLICY "delete_own_addresses" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_orders" ON orders;
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

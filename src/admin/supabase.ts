import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  role: string;
  display_name: string;
}

export interface DbProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
  gallery: string[];
  description: string;
  what_it_does: string;
  who_its_for: string;
  how_to_use: string;
  features: string[];
  size: string;
  stock: number;
  label: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  user_id: string;
  order_number: string;
  items: Array<{ slug: string; name: string; price: number; quantity: number; image: string }>;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  delivery_landmark: string;
  payment_method: string;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  expiry_date: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbReview {
  id: string;
  product_id: string;
  product_slug: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  text: string;
  is_approved: boolean;
  created_at: string;
}

export interface DbJournalArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  read_time: string;
  image: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbFaqSection {
  id: string;
  title: string;
  icon: string;
  sort_order: number;
}

export interface DbFaqItem {
  id: string;
  section_id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface DbConcern {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
  is_active: boolean;
}

export interface DbCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  sort_order: number;
}

export interface DbJazellePick {
  id: string;
  product_slug: string;
  sort_order: number;
}

export type SiteSettings = Record<string, string>;

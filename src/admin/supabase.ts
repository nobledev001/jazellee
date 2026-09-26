import { supabase } from '@/lib/supabaseClient';

export { supabase };

export interface Profile {
  id: string;
  email: string;
  role: string;
  display_name: string;
  phone?: string;
  created_at?: string;
  orders_count?: number;
  total_spent?: number;
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
  payment_status?: string;
  payment_reference?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  delivery_landmark: string;
  payment_method: string;
  coupon_code: string | null;
  reminder_sent?: boolean;
  reminder_sent_at?: string | null;
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

export async function ensureStorageBucket(bucketName = 'product-images'): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const found = buckets?.some((b) => b.id === bucketName || b.name === bucketName);
    if (!found) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  } catch (e) {
    console.warn('Storage bucket check/create notice:', e);
  }
}

export async function uploadProductImage(file: File, bucketName = 'product-images'): Promise<string> {
  await ensureStorageBucket(bucketName);

  const ext = file.name.split('.').pop() || 'jpg';
  const cleanName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const path = `${Date.now()}-${cleanName}.${ext}`;

  const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    console.warn('Storage upload error, falling back to data URL:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data?.path || path);
  return urlData.publicUrl;
}

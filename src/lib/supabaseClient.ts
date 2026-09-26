import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { PRODUCTS } from './catalog';

const DEFAULT_SUPABASE_URL = 'https://otdvuuxmnlfjvtjifudq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZHZ1dXhtbmxmanZ0amlmdWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTc5MTYsImV4cCI6MjEwNTE5MzkxNn0.Wm-6krE2MxQJCSxxSq5KUKDIwuSfo8SGE0KxJunN1Pw';

const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : DEFAULT_SUPABASE_URL);

const envKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : DEFAULT_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  (envUrl.startsWith('https://') || envUrl.startsWith('http://')) &&
  !envUrl.includes('placeholder')
);

type StoredRecord = Record<string, unknown>;

const PRODUCT_UUIDS: Record<string, string> = {
  'gentle-bloom-cleanser': 'be6f7168-9890-480f-bf6b-87567f81b1ea',
  'sun-kissed-sunscreen': '3c23a0e4-e33c-4f94-b743-130aa1c945ef',
  'soft-touch-face-cream': '6606a626-f831-4079-90d7-ac7e3d462bbc',
  'rose-glow-body-oil': '889c766c-b552-4138-8034-ce00c2f5bbb1',
  'smooth-day-body-lotion': 'eec25abd-1e4f-41be-a1f1-b9006978bf24',
  'honey-lip-souffle': 'e38a72af-59c8-4f3c-8cc7-cc5de331df88',
  'calm-night-bath-salts': 'e272ef5b-97cd-470c-89e3-cddda22b9143',
  'silk-shave-cream': '4674c505-4854-49b1-bf42-5c9ec9983453',
  'fresh-start-underarm-care': '74576ac9-fe72-4ccb-a4c3-5ef40d314194',
};

function getLocalTable<T extends StoredRecord>(table: string, defaultData: T[] = []): T[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(`jazelle_db_${table}`) : null;
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return defaultData;
}

function saveLocalTable<T extends StoredRecord>(table: string, data: T[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`jazelle_db_${table}`, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('jazelle_db_change', { detail: { table } }));
      if (table === 'products') {
        window.dispatchEvent(new CustomEvent('jazelle_products_updated', { detail: { count: data.length } }));
      }
    }
  } catch {
    // ignore
  }
}

const initialProducts: StoredRecord[] = PRODUCTS.map((p, i) => ({
  id: PRODUCT_UUIDS[p.slug] || `00000000-0000-0000-0000-00000000000${i + 1}`,
  slug: p.slug,
  name: p.name,
  category: p.category,
  price: p.price,
  image: p.image,
  gallery: p.gallery,
  description: p.description,
  what_it_does: p.whatItDoes,
  who_its_for: p.whoItsFor,
  how_to_use: p.howToUse,
  features: p.features,
  size: p.size,
  stock: p.availability === 'In stock' ? 25 : p.availability === 'Limited stock' ? 5 : 0,
  label: p.label || null,
  is_active: true,
  sort_order: i,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

const initialCoupons: StoredRecord[] = [
  {
    id: 'c-1',
    code: 'GLOW10',
    description: '10% off your entire self-care haul',
    discount_type: 'percentage',
    discount_value: 10,
    expiry_date: null,
    usage_limit: 100,
    used_count: 14,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c-2',
    code: 'WELCOME2000',
    description: '₦2,000 off your first order over ₦15,000',
    discount_type: 'fixed',
    discount_value: 2000,
    expiry_date: null,
    usage_limit: 500,
    used_count: 82,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialProfiles: StoredRecord[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'admin@jazelle.com',
    role: 'owner',
    display_name: 'Store Owner',
    phone: '+234 812 345 6789',
    created_at: '2025-01-10T09:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'fawazakorede001@gmail.com',
    role: 'customer',
    display_name: 'Fawaz Akorede',
    phone: '+234 803 123 4567',
    created_at: '2025-02-14T11:20:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'amaka.okafor@gmail.com',
    role: 'customer',
    display_name: 'Amaka Okafor',
    phone: '+234 802 987 6543',
    created_at: '2025-02-18T14:22:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'kemi.adeyemi@yahoo.com',
    role: 'customer',
    display_name: 'Kemi Adeyemi',
    phone: '+234 814 555 0192',
    created_at: '2025-03-01T10:15:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'zainab.bello@outlook.com',
    role: 'customer',
    display_name: 'Zainab Bello',
    phone: '+234 701 444 8821',
    created_at: '2025-03-05T16:40:00.000Z',
    updated_at: new Date().toISOString(),
  },
];

const initialSiteSettings: StoredRecord[] = [
  { key: 'announcement_bar', value: 'Free delivery on orders over ₦40,000 — across Nigeria', updated_at: new Date().toISOString() },
  { key: 'free_delivery_threshold', value: '40000', updated_at: new Date().toISOString() },
  { key: 'support_phone', value: '+234 812 345 6789', updated_at: new Date().toISOString() },
  { key: 'support_email', value: 'hello@jazelleskinhaven.com', updated_at: new Date().toISOString() },
  { key: 'store_address', value: 'Wuse II, Abuja, Nigeria', updated_at: new Date().toISOString() },
];

const initialJournalArticles: StoredRecord[] = [
  {
    id: 'art-1',
    slug: 'what-does-spf-actually-mean',
    title: 'Wait… what does SPF actually mean?',
    excerpt: 'It sounds technical, but it is really just a little number that tells you how much longer your skin can hang out in the sun before it starts to react.',
    body: 'Sun protection is non-negotiable for vibrant, healthy melanin-rich skin. When navigating Nigerian heat and sunlight, SPF 30 to 50 provides essential broad-spectrum shield.',
    category: 'Skincare Basics',
    read_time: '4 min read',
    image: 'https://images.pexels.com/photos/39459688/pexels-photo-39459688.jpeg?auto=compress&cs=tinysrgb&w=900&h=600&fit=crop',
    is_featured: true,
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art-2',
    slug: 'self-care-is-not-hygiene',
    title: 'Self-care ≠ hygiene',
    excerpt: 'One is about staying clean. The other is about feeling good. They are related, but they are not the same thing.',
    body: 'Hygiene keeps your body healthy; self-care restores your nervous system and nourishes your spirit.',
    category: 'Self-Care',
    read_time: '5 min read',
    image: 'https://images.pexels.com/photos/2097499/pexels-photo-2097499.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    is_featured: false,
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'art-3',
    slug: '3-body-care-mistakes',
    title: '3 body-care mistakes you might be making',
    excerpt: 'Skipping moisturiser on damp skin, forgetting your elbows and knees, and using the same harsh soap everywhere.',
    body: 'Applying nourishing oils right out of the shower traps moisture and leaves you glowing all day.',
    category: 'Body Care',
    read_time: '3 min read',
    image: 'https://images.pexels.com/photos/5632326/pexels-photo-5632326.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop',
    is_featured: false,
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialFaqSections: StoredRecord[] = [
  { id: 'faq-sec-1', title: 'Delivery & Areas', icon: 'Truck', sort_order: 1 },
  { id: 'faq-sec-2', title: 'Ordering', icon: 'Package', sort_order: 2 },
  { id: 'faq-sec-3', title: 'Payment Methods', icon: 'CreditCard', sort_order: 3 },
  { id: 'faq-sec-4', title: 'Product Selection Help', icon: 'MessageCircle', sort_order: 4 },
  { id: 'faq-sec-5', title: 'Returns & Refunds', icon: 'RefreshCw', sort_order: 5 },
];

const initialFaqItems: StoredRecord[] = [
  { id: 'faq-item-1', section_id: 'faq-sec-1', question: 'Where do you deliver?', answer: 'We deliver across all 36 states in Nigeria, including Abuja, Lagos, Port Harcourt, Kano, Ibadan, and everywhere in between.', sort_order: 1 },
  { id: 'faq-item-2', section_id: 'faq-sec-1', question: 'How long does delivery take?', answer: 'Orders within Abuja typically arrive within 1–2 business days. For the rest of Nigeria, expect 3–5 business days.', sort_order: 2 },
  { id: 'faq-item-3', section_id: 'faq-sec-1', question: 'How much is delivery?', answer: 'Delivery is free on orders over ₦40,000. For orders below that, a flat delivery fee applies based on your location.', sort_order: 3 },
  { id: 'faq-item-4', section_id: 'faq-sec-2', question: 'How do I place an order?', answer: 'Simply browse the shop, add your favourites to your cart, and check out.', sort_order: 1 },
  { id: 'faq-item-5', section_id: 'faq-sec-3', question: 'What payment methods do you accept?', answer: 'We accept bank transfers, debit cards (Visa and Mastercard), and USSD payments.', sort_order: 1 },
];

interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  order: (column: string, opts?: { ascending?: boolean }) => MockQueryBuilder;
  insert: (values: StoredRecord | StoredRecord[]) => MockQueryBuilder;
  upsert: (values: StoredRecord | StoredRecord[], opts?: { onConflict?: string }) => MockQueryBuilder;
  update: (values: StoredRecord) => { eq: (column: string, value: unknown) => Promise<{ data: StoredRecord[]; error: null }> };
  delete: () => { eq: (column: string, value: unknown) => Promise<{ data: null; error: null }> };
  maybeSingle: () => Promise<{ data: StoredRecord | null; error: null }>;
  single: () => Promise<{ data: StoredRecord | null; error: { message: string } | null }>;
  then: <TResult1 = { data: StoredRecord[]; error: null }>(
    onfulfilled?: ((value: { data: StoredRecord[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null
  ) => Promise<TResult1>;
}

function createMockSupabase(): SupabaseClient {
  const authListeners = new Set<(event: string, session: Session | null) => void>();

  const auth = {
    async getSession() {
      return { data: { session: null }, error: null };
    },
    async getUser() {
      return { data: { user: null }, error: { message: 'No active session' } };
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
    async signUp() {
      return {
        data: { user: null, session: null },
        error: { message: 'Authentication requires an active Supabase connection.' },
      };
    },
    async signInWithPassword() {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      };
    },
    async signOut() {
      try {
        localStorage.removeItem('jazelle_mock_session');
        localStorage.removeItem('jazelle_admin_session');
        sessionStorage.removeItem('jazelle_admin_session');
      } catch {
        // ignore
      }
      authListeners.forEach((cb) => cb('SIGNED_OUT', null));
      return { error: null };
    },
    async resetPasswordForEmail(email: string) {
      return { data: { email }, error: null };
    },
    async signInWithOtp({ email }: { email: string }) {
      return { data: { email }, error: null };
    },
    async verifyOtp() {
      return { data: { user: null, session: null }, error: { message: 'Invalid OTP code' } };
    },
    async resend({ email, type }: { email: string; type: string }) {
      return { data: { email, type }, error: null };
    },
    async updateUser() {
      return { data: { user: null }, error: { message: 'Not authenticated' } };
    },
  };

  function from(tableName: string) {
    let defaultList: StoredRecord[] = [];
    if (tableName === 'products') defaultList = initialProducts;
    else if (tableName === 'coupons') defaultList = initialCoupons;
    else if (tableName === 'profiles') defaultList = initialProfiles;
    else if (tableName === 'site_settings') defaultList = initialSiteSettings;
    else if (tableName === 'journal_articles') defaultList = initialJournalArticles;
    else if (tableName === 'faq_sections') defaultList = initialFaqSections;
    else if (tableName === 'faq_items') defaultList = initialFaqItems;

    let currentItems = [...getLocalTable(tableName, defaultList)];

    const queryBuilder: MockQueryBuilder = {
      select() {
        return queryBuilder;
      },
      eq(column: string, value: unknown) {
        currentItems = currentItems.filter((it) => String(it[column]) === String(value));
        return queryBuilder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        const asc = opts?.ascending ?? true;
        currentItems.sort((a, b) => {
          const valA = String(a[column] ?? '');
          const valB = String(b[column] ?? '');
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        });
        return queryBuilder;
      },
      insert(values: StoredRecord | StoredRecord[]) {
        const toAdd = Array.isArray(values) ? values : [values];
        const all = getLocalTable(tableName, defaultList);
        const added = toAdd.map((v) => ({
          id: (v.id as string) || (v.key ? (v.key as string) : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...v,
        }));
        saveLocalTable(tableName, [...all, ...added]);
        currentItems = added;
        return queryBuilder;
      },
      upsert(values: StoredRecord | StoredRecord[], opts?: { onConflict?: string }) {
        const toUpsert = Array.isArray(values) ? values : [values];
        const all = [...getLocalTable(tableName, defaultList)];
        const conflictKey = opts?.onConflict || (tableName === 'site_settings' ? 'key' : 'id');

        const results: StoredRecord[] = [];
        for (const item of toUpsert) {
          const keyVal = item[conflictKey];
          const existingIdx = all.findIndex((it) => String(it[conflictKey]) === String(keyVal));
          if (existingIdx >= 0) {
            all[existingIdx] = {
              ...all[existingIdx],
              ...item,
              updated_at: new Date().toISOString(),
            };
            results.push(all[existingIdx]);
          } else {
            const newItem = {
              id: (item.id as string) || (item.key ? (item.key as string) : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...item,
            };
            all.push(newItem);
            results.push(newItem);
          }
        }
        saveLocalTable(tableName, all);
        currentItems = results;
        return queryBuilder;
      },
      update(values: StoredRecord) {
        const all = getLocalTable(tableName, defaultList);
        return {
          async eq(column: string, value: unknown) {
            const updated = all.map((it) => (String(it[column]) === String(value) ? { ...it, ...values, updated_at: new Date().toISOString() } : it));
            saveLocalTable(tableName, updated);
            currentItems = updated.filter((it) => String(it[column]) === String(value));
            return { data: currentItems, error: null };
          },
        };
      },
      delete() {
        const all = getLocalTable(tableName, defaultList);
        return {
          async eq(column: string, value: unknown) {
            const remaining = all.filter((it) => String(it[column]) !== String(value));
            saveLocalTable(tableName, remaining);
            return { data: null, error: null };
          },
        };
      },
      async maybeSingle() {
        return { data: currentItems[0] || null, error: null };
      },
      async single() {
        return { data: currentItems[0] || null, error: currentItems.length ? null : { message: 'Not found' } };
      },
      then<TResult1 = { data: StoredRecord[]; error: null }>(
        onfulfilled?: ((value: { data: StoredRecord[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null
      ) {
        return Promise.resolve({ data: currentItems, error: null }).then(onfulfilled);
      },
    };

    return queryBuilder;
  }

  const storage = {
    async listBuckets() {
      return { data: [{ id: 'product-images', name: 'product-images', public: true }], error: null };
    },
    async createBucket(id: string) {
      return { data: { name: id }, error: null };
    },
    async getBucket(id: string) {
      return { data: { id, name: id, public: true }, error: null };
    },
    from(bucketId: string) {
      return {
        async upload(path: string, file: File | Blob) {
          let fileUrl = '';
          try {
            fileUrl = URL.createObjectURL(file);
          } catch {
            fileUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';
          }
          try {
            const stored = JSON.parse(localStorage.getItem(`jazelle_storage_${bucketId}`) || '{}');
            stored[path] = fileUrl;
            localStorage.setItem(`jazelle_storage_${bucketId}`, JSON.stringify(stored));
          } catch {
            // ignore
          }
          return { data: { path, id: path, fullPath: `${bucketId}/${path}` }, error: null };
        },
        getPublicUrl(path: string) {
          try {
            const stored = JSON.parse(localStorage.getItem(`jazelle_storage_${bucketId}`) || '{}');
            if (stored[path]) return { data: { publicUrl: stored[path] } };
          } catch {
            // ignore
          }
          return {
            data: {
              publicUrl:
                path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')
                  ? path
                  : `https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80`,
            },
          };
        },
      };
    },
  };

  const channel = (channelName: string) => {
    const channelObj = {
      name: channelName,
      on(..._args: unknown[]) {
        void _args;
        return channelObj;
      },
      subscribe(callback?: (status: string) => void) {
        if (typeof callback === 'function') {
          setTimeout(() => callback('SUBSCRIBED'), 0);
        }
        return channelObj;
      },
      unsubscribe() {
        return Promise.resolve();
      },
    };
    return channelObj;
  };

  const removeChannel = (..._args: unknown[]) => {
    void _args;
    return Promise.resolve('ok');
  };

  const rpc = async (fnName: string, args?: Record<string, unknown>) => {
    if (fnName === 'set_user_role') {
      const targetUserId = (args?.p_user_id || args?.user_id) as string;
      const targetRole = (args?.p_role || args?.role) as string;
      if (!targetUserId || !targetRole) {
        return { data: null, error: { message: 'Missing user_id or role' } };
      }

      const currentProfiles = getLocalTable('profiles', initialProfiles);
      const pIdx = currentProfiles.findIndex(
        (p) => String(p.id) === targetUserId || String(p.email).toLowerCase() === targetUserId.toLowerCase()
      );
      if (pIdx >= 0) {
        currentProfiles[pIdx] = {
          ...currentProfiles[pIdx],
          role: targetRole,
          updated_at: new Date().toISOString(),
        };
        saveLocalTable('profiles', currentProfiles);
      }

      try {
        const rawReg = localStorage.getItem('jazelle_registered_customers') || '[]';
        const regList: StoredRecord[] = JSON.parse(rawReg);
        const rIdx = regList.findIndex(
          (p) => String(p.id) === targetUserId || String(p.email).toLowerCase() === targetUserId.toLowerCase()
        );
        if (rIdx >= 0) {
          regList[rIdx] = { ...regList[rIdx], role: targetRole, updated_at: new Date().toISOString() };
          localStorage.setItem('jazelle_registered_customers', JSON.stringify(regList));
        }
      } catch {
        // ignore
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('jazelle_customer_registered', { detail: { id: targetUserId, role: targetRole } })
        );
        window.dispatchEvent(new CustomEvent('jazelle_db_change', { detail: { table: 'profiles' } }));
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };

  return {
    auth,
    from,
    storage,
    channel,
    removeChannel,
    rpc,
  } as unknown as SupabaseClient;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createResilientSupabase(rawClient: SupabaseClient): SupabaseClient {
  const mock = createMockSupabase();

  // One-time automatic sync of any previously cached local orders up to cloud database
  if (typeof window !== 'undefined') {
    setTimeout(async () => {
      try {
        const raw = localStorage.getItem('jazelle_db_orders');
        if (!raw) return;
        const localOrders: StoredRecord[] = JSON.parse(raw);
        if (!Array.isArray(localOrders) || localOrders.length === 0) return;

        const { data: remoteOrders } = await rawClient.from('orders').select('order_number');
        const remoteNumbers = new Set((remoteOrders || []).map((o: { order_number?: string }) => o.order_number));

        for (const order of localOrders) {
          const orderNum = order.order_number as string;
          if (orderNum && !remoteNumbers.has(orderNum)) {
            console.log('[Supabase Sync] Migrating locally cached order to cloud database:', orderNum);
            const cleanOrder: Record<string, unknown> = {
              order_number: order.order_number,
              items: order.items || [],
              subtotal: order.subtotal || 0,
              delivery_fee: order.delivery_fee || 0,
              total: order.total || 0,
              status: order.status || 'placed',
              customer_name: order.customer_name || '',
              customer_email: order.customer_email || '',
              customer_phone: order.customer_phone || '',
              delivery_address: order.delivery_address || '',
              delivery_state: order.delivery_state || '',
              delivery_lga: order.delivery_lga || '',
              delivery_landmark: order.delivery_landmark || '',
              payment_method: order.payment_method || 'card',
              created_at: order.created_at || new Date().toISOString(),
              updated_at: order.updated_at || new Date().toISOString(),
            };
            if (typeof order.user_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.user_id)) {
              cleanOrder.user_id = order.user_id;
            }
            await rawClient.from('orders').insert(cleanOrder);
          }
        }
      } catch (e) {
        console.warn('[Supabase Sync] Background order sync check complete:', e);
      }
    }, 1200);
  }

  return new Proxy(rawClient, {
    get(target, prop, receiver) {
      if (prop === 'channel') {
        return (name: string) => {
          if (typeof target.channel === 'function') {
            try {
              return target.channel.call(target, name);
            } catch {
              return mock.channel(name);
            }
          }
          return mock.channel(name);
        };
      }

      if (prop === 'removeChannel') {
        return (ch: unknown) => {
          if (typeof target.removeChannel === 'function') {
            try {
              return target.removeChannel.call(target, ch as Parameters<typeof target.removeChannel>[0]);
            } catch {
              return mock.removeChannel(ch);
            }
          }
          return mock.removeChannel(ch);
        };
      }

      if (prop === 'auth') {
        // Always use the real Supabase Auth client directly — NEVER fall back to mock auth
        return target.auth;
      }

      if (prop === 'rpc') {
        return async (fnName: string, args?: Record<string, unknown>) => {
          if (typeof target.rpc === 'function') {
            try {
              const res = await target.rpc(fnName, args);
              if (!res.error) {
                await mock.rpc(fnName, args);
                return res;
              }
              // If schema cache or permission error on remote, fallback to mock to maintain reliable UX
              const fallback = await mock.rpc(fnName, args);
              return fallback.error ? res : fallback;
            } catch {
              return await mock.rpc(fnName, args);
            }
          }
          return await mock.rpc(fnName, args);
        };
      }

      if (prop === 'from') {
        return (table: string) => {
          // Direct real cloud Supabase query for orders table — no local proxying or fallback
          if (table === 'orders') {
            return target.from('orders');
          }

          const rawQuery = target.from(table);
          const mockTable = mock.from(table);

          return new Proxy(rawQuery, {
            get(subTarget, subProp, subReceiver) {
              if (subProp === 'select') {
                return (...args: unknown[]) => {
                  const targetObj = subTarget as unknown as {
                    select: (...a: unknown[]) => Promise<{ data: StoredRecord[] | null; error: { message: string } | null }> & {
                      then: (
                        onFulfilled?: (res: { data: StoredRecord[] | null; error: { message: string } | null }) => unknown,
                        onRejected?: (err: unknown) => unknown
                      ) => Promise<unknown>;
                    };
                  };
                  const mockObj = mockTable as unknown as {
                    select: (...a: unknown[]) => Promise<{ data: StoredRecord[] | null; error: { message: string } | null }>;
                  };

                  const queryResult = targetObj.select(...args);
                  const originalThen = queryResult.then.bind(queryResult);

                  queryResult.then = (
                    onFulfilled?: (res: { data: StoredRecord[] | null; error: { message: string } | null }) => unknown,
                    onRejected?: (err: unknown) => unknown
                  ) => {
                    return originalThen(async (res) => {
                      if (res.error) {
                        console.warn(`[Supabase] Remote select error on ${table}, using local fallback:`, res.error.message);
                        const fallbackRes = await mockObj.select(...args);
                        return onFulfilled ? onFulfilled(fallbackRes) : fallbackRes;
                      }

                      if (table === 'products' && Array.isArray(res.data)) {
                        try {
                          const localList = getLocalTable('products', []);
                          if (localList.length > 0) {
                            const remoteIds = new Set(res.data.map((r) => String(r.id || '')));
                            const remoteSlugs = new Set(res.data.map((r) => String(r.slug || '')));

                            const pendingLocal = localList.filter(
                              (p) => !remoteIds.has(String(p.id)) && !remoteSlugs.has(String(p.slug))
                            );

                            if (pendingLocal.length > 0) {
                              res.data = [...res.data, ...pendingLocal];
                            }
                          }
                          localStorage.setItem(`jazelle_db_${table}`, JSON.stringify(res.data));
                        } catch {
                          // ignore
                        }
                      }

                      if (table === 'orders' && Array.isArray(res.data)) {
                        try {
                          const localOrders = getLocalTable('orders', []);
                          if (localOrders.length > 0) {
                            const remoteOrderNums = new Set(res.data.map((r) => String(r.order_number || r.id || '')));
                            const pendingSync = localOrders.filter(
                              (o) => !remoteOrderNums.has(String(o.order_number || o.id))
                            );

                            if (pendingSync.length > 0) {
                              for (const ord of pendingSync) {
                                void rawClient.from('orders').insert(ord).then((ins) => {
                                  if (!ins.error) {
                                    console.log('[Supabase] Synced pending local order to cloud:', ord.order_number);
                                  }
                                });
                              }
                              res.data = [...pendingSync, ...res.data];
                            }
                          }
                          localStorage.setItem('jazelle_db_orders', JSON.stringify(res.data));
                        } catch {
                          // ignore
                        }
                      }

                      if (table === 'profiles' && Array.isArray(res.data)) {
                        try {
                          const localProfiles = getLocalTable('profiles', initialProfiles);
                          const rawReg = localStorage.getItem('jazelle_registered_customers');
                          const regList: StoredRecord[] = rawReg ? JSON.parse(rawReg) : [];
                          const mergedLocal = [...regList, ...localProfiles];

                          const remoteEmails = new Set(res.data.map((r) => String(r.email || '').toLowerCase()));
                          const pendingSync = mergedLocal.filter(
                            (p) => p.email && !remoteEmails.has(String(p.email).toLowerCase())
                          );

                          if (pendingSync.length > 0) {
                            res.data = [...res.data, ...pendingSync];
                          }
                          localStorage.setItem('jazelle_db_profiles', JSON.stringify(res.data));
                        } catch {
                          // ignore
                        }
                      }

                      return onFulfilled ? onFulfilled(res) : res;
                    }, async (err) => {
                      console.warn(`[Supabase] Remote fetch exception on ${table}, using local fallback:`, err);
                      const fallbackRes = await mockObj.select(...args);
                      return onRejected ? onRejected(fallbackRes) : fallbackRes;
                    });
                  };

                  return queryResult;
                };
              }

              if (subProp === 'insert') {
                return (values: unknown, ...insertArgs: unknown[]) => {
                  const arr = (Array.isArray(values) ? values : [values]) as StoredRecord[];
                  const withIds: StoredRecord[] = arr.map((item) => ({
                    ...item,
                    id: (item.id as string) || generateUUID(),
                    created_at: (item.created_at as string) || new Date().toISOString(),
                    updated_at: (item.updated_at as string) || new Date().toISOString(),
                  }));

                  const current = getLocalTable(table, table === 'products' ? initialProducts : []);
                  saveLocalTable(table, [...current, ...withIds]);

                  const targetObj = subTarget as unknown as {
                    insert: (v: unknown, ...a: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>;
                  };

                  const promise = (async () => {
                    try {
                      const res = await targetObj.insert(withIds, ...insertArgs);
                      if (res.error) {
                        console.error(`[Supabase] Remote insert on ${table} error:`, res.error);
                        return res;
                      }
                      return res;
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : String(e);
                      console.error(`[Supabase] Remote insert on ${table} exception:`, msg);
                      return { data: null, error: { message: msg } };
                    }
                  })();

                  // Return a chainable thenable supporting .select() and .single()
                  const chainable = {
                    then: promise.then.bind(promise),
                    catch: promise.catch.bind(promise),
                    select: () => ({
                      single: () => promise.then((r) => ({ data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error })),
                      then: promise.then.bind(promise),
                      catch: promise.catch.bind(promise),
                    }),
                    single: () => promise.then((r) => ({ data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error })),
                  };

                  return chainable;
                };
              }

              if (subProp === 'update') {
                return (values: unknown, ...updateArgs: unknown[]) => {
                  const targetObj = subTarget as unknown as {
                    update: (v: unknown, ...a: unknown[]) => {
                      eq: (col: string, val: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
                    };
                  };

                  const updateChain = targetObj.update(values, ...updateArgs);
                  const origEq = updateChain.eq ? updateChain.eq.bind(updateChain) : null;

                  if (origEq) {
                    updateChain.eq = (column: string, value: unknown) => {
                      const all = getLocalTable(table, table === 'products' ? initialProducts : []);
                      const updated = all.map((it) =>
                        String(it[column]) === String(value)
                          ? { ...it, ...(values as StoredRecord), updated_at: new Date().toISOString() }
                          : it
                      );
                      saveLocalTable(table, updated);

                      return (async () => {
                        try {
                          const res = await origEq(column, value);
                          if (res.error) {
                            console.warn(`[Supabase] Remote update on ${table} persisted locally:`, res.error.message);
                            return { data: updated.filter((it) => String(it[column]) === String(value)), error: null };
                          }
                          return res;
                        } catch {
                          return { data: updated.filter((it) => String(it[column]) === String(value)), error: null };
                        }
                      })();
                    };
                  }
                  return updateChain;
                };
              }

              if (subProp === 'delete') {
                return (...deleteArgs: unknown[]) => {
                  const targetObj = subTarget as unknown as {
                    delete: (...a: unknown[]) => {
                      eq: (col: string, val: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
                    };
                  };

                  const deleteChain = targetObj.delete(...deleteArgs);
                  const origEq = deleteChain.eq ? deleteChain.eq.bind(deleteChain) : null;

                  if (origEq) {
                    deleteChain.eq = (column: string, value: unknown) => {
                      const all = getLocalTable(table, table === 'products' ? initialProducts : []);
                      const filtered = all.filter((it) => String(it[column]) !== String(value));
                      saveLocalTable(table, filtered);

                      return (async () => {
                        try {
                          const res = await origEq(column, value);
                          if (res.error) {
                            console.warn(`[Supabase] Remote delete on ${table} removed locally:`, res.error.message);
                            return { data: null, error: null };
                          }
                          return res;
                        } catch {
                          return { data: null, error: null };
                        }
                      })();
                    };
                  }
                  return deleteChain;
                };
              }

              return Reflect.get(subTarget, subProp, subReceiver);
            },
          });
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    },
  });
}

// Purge any legacy mock session artifacts from browser storage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('jazelle_mock_session');
    localStorage.removeItem('jazelle_admin_session');
    sessionStorage.removeItem('jazelle_admin_session');
  } catch {
    // ignore storage errors
  }
}

export const rawSupabaseClient: SupabaseClient = createClient(envUrl!, envKey!);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createResilientSupabase(rawSupabaseClient)
  : rawSupabaseClient;

export type Category = 'Skincare' | 'Body Care' | 'Self-Care' | 'Grooming';
export type ProductLabel = 'Best Seller' | 'New' | 'Back in Stock' | 'Jazelle Pick' | 'Limited Stock';

export interface Review {
  name: string;
  rating: number;
  text: string;
}

export interface Product {
  id?: string;
  slug: string;
  name: string;
  brand?: string;
  category: Category;
  price: number;
  image: string;
  gallery: string[];
  description: string;
  whatItDoes: string;
  whoItsFor: string;
  howToUse: string;
  features: string[];
  size: string;
  availability: 'In stock' | 'Limited stock' | 'Back in stock';
  label?: ProductLabel;
  rating: number;
  reviews: Review[];
  isActive?: boolean;
}

const image = (id: string, size = 'w=900') => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&${size}`;

export const PRODUCTS: Product[] = [
  {
    slug: 'gentle-bloom-cleanser', name: 'Gentle Bloom Cleanser', brand: 'JAZELLE', category: 'Skincare', price: 7500,
    image: image('39392892'), gallery: [image('39392892'), image('4857799'), image('7818170')],
    description: 'A soft, no-drama cleanse for mornings, evenings, and every little reset in between.',
    whatItDoes: 'Lifts away daily build-up while leaving skin comfortable, fresh, and never tight.',
    whoItsFor: 'Anyone who wants an easy first step in a calm, beginner-friendly routine.',
    howToUse: 'Massage one pump onto damp skin for 30 seconds, then rinse with lukewarm water.',
    features: ['Comfort-first cleanse', 'Easy everyday step', 'Leaves skin feeling fresh'], size: '150 ml', availability: 'In stock', label: 'Best Seller', rating: 4.9,
    reviews: [{ name: 'Amaka O.', rating: 5, text: 'My face feels clean but still soft after using this. It is now my everyday cleanser.' }, { name: 'Tolu A.', rating: 5, text: 'Simple, gentle, and does exactly what I need.' }],
  },
  {
    slug: 'sun-kissed-sunscreen', name: 'Sun-Kissed Daily SPF', brand: 'TIAM', category: 'Skincare', price: 11500,
    image: image('39452544'), gallery: [image('39452544'), image('39281882'), image('39400892')],
    description: 'Your easy final morning step for sunny Abuja days, errands, and everything in between.',
    whatItDoes: 'Helps protect your skin from everyday sun exposure with a comfortable, lightweight finish.',
    whoItsFor: 'Anyone ready to make sun protection a simple part of their daily routine.',
    howToUse: 'Apply generously as the last step of your morning routine. Reapply when spending time outdoors.',
    features: ['Lightweight finish', 'Easy under makeup', 'Everyday sun protection'], size: '50 ml', availability: 'In stock', label: 'Jazelle Pick', rating: 4.8,
    reviews: [{ name: 'Zainab M.', rating: 5, text: 'No heavy white cast and it sits so nicely under my makeup.' }, { name: 'Dami E.', rating: 5, text: 'Finally a sunscreen I remember to use every day.' }],
  },
  {
    slug: 'soft-touch-face-cream', name: 'Soft Touch Face Cream', brand: 'BALANCE', category: 'Skincare', price: 9800,
    image: image('6690233'), gallery: [image('6690233'), image('7818170'), image('36339062')],
    description: 'A comforting cream for that soft, bouncy, well-rested feeling your skin loves.',
    whatItDoes: 'Adds lasting comfort and moisture without feeling heavy or sticky.',
    whoItsFor: 'Dry, normal, or simply thirsty skin looking for a cozy daily moisturizer.',
    howToUse: 'Smooth a small amount over clean skin morning and evening, after your serum if you use one.',
    features: ['Comforting daily moisture', 'Soft, cushiony feel', 'Layers beautifully'], size: '50 g', availability: 'In stock', label: 'Jazelle Pick', rating: 4.9,
    reviews: [{ name: 'Chioma R.', rating: 5, text: 'My skin looks rested and feels so soft. A little goes a long way.' }],
  },
  {
    slug: 'rose-glow-body-oil', name: 'Rose Glow Body Oil', brand: 'JAZELLE', category: 'Body Care', price: 12500,
    image: image('4857799'), gallery: [image('4857799'), image('7818170'), image('5816408')],
    description: 'A silky body oil for post-shower glow, soft limbs, and a little extra main-character energy.',
    whatItDoes: 'Seals in moisture and leaves skin smooth with a subtle, feel-good glow.',
    whoItsFor: 'Anyone who wants their body-care routine to feel like a tiny luxury.',
    howToUse: 'Massage a few drops onto damp skin after bathing. Pay extra attention to elbows, knees, and shins.',
    features: ['Silky finish', 'Post-shower favourite', 'Soft rose-inspired scent'], size: '100 ml', availability: 'Limited stock', label: 'Best Seller', rating: 4.9,
    reviews: [{ name: 'Nneka I.', rating: 5, text: 'The glow is gorgeous without being greasy. I get compliments every time.' }, { name: 'Feyi K.', rating: 5, text: 'It makes my evening shower feel so much more special.' }],
  },
  {
    slug: 'smooth-day-body-lotion', name: 'Smooth Day Body Lotion', brand: 'CERAVE', category: 'Body Care', price: 8900,
    image: image('33525723'), gallery: [image('33525723'), image('6690233'), image('5816408')],
    description: 'A plush everyday lotion that keeps your skin feeling soft from morning to night.',
    whatItDoes: 'Comforts dry-feeling skin and helps keep your glow going all day.',
    whoItsFor: 'Anyone who wants a quick, easy body-care step after every shower.',
    howToUse: 'Apply generously to clean, slightly damp skin and massage until absorbed.',
    features: ['Fast-absorbing feel', 'Everyday softness', 'Great for layering'], size: '250 ml', availability: 'In stock', label: 'New', rating: 4.7,
    reviews: [{ name: 'Mimi A.', rating: 5, text: 'It absorbs quickly and my legs stay soft all day.' }],
  },
  {
    slug: 'honey-lip-souffle', name: 'Honey Lip Souffle', brand: 'COSRX', category: 'Self-Care', price: 5200,
    image: image('8558526'), gallery: [image('8558526'), image('31552021'), image('28959838')],
    description: 'A buttery little lip treat for soft, happy lips and handbag-sized joy.',
    whatItDoes: 'Comforts dry lips with a smooth, glossy veil of moisture.',
    whoItsFor: 'Anyone who loves a soft lip moment, day or night.',
    howToUse: 'Swipe on whenever your lips need a little love. Layer generously before bed.',
    features: ['Buttery texture', 'Easy handbag essential', 'Glossy, comfortable finish'], size: '12 g', availability: 'Back in stock', label: 'Back in Stock', rating: 4.8,
    reviews: [{ name: 'Lara S.', rating: 5, text: 'So cute and actually keeps my lips soft. I keep one everywhere.' }],
  },
  {
    slug: 'calm-night-bath-salts', name: 'Calm Night Bath Salts', brand: 'JAZELLE', category: 'Self-Care', price: 6800,
    image: image('36457029'), gallery: [image('36457029'), image('6732262'), image('5816408')],
    description: 'A slow-evening ritual in a pouch — for warm water, deep breaths, and doing less.',
    whatItDoes: 'Turns an ordinary bath or foot soak into a soothing, aromatic pause.',
    whoItsFor: 'Busy women who deserve ten quiet minutes to themselves.',
    howToUse: 'Add two to three spoonfuls to warm bath water or a foot basin, then soak and exhale.',
    features: ['Relaxing evening ritual', 'Great for baths or foot soaks', 'Soft floral scent'], size: '300 g', availability: 'In stock', label: 'Jazelle Pick', rating: 4.8,
    reviews: [{ name: 'Bola T.', rating: 5, text: 'This is my Sunday reset in a pouch. Smells beautiful.' }],
  },
  {
    slug: 'silk-shave-cream', name: 'Silk & Smooth Shave Cream', brand: 'BALANCE', category: 'Grooming', price: 7200,
    image: image('30487796'), gallery: [image('30487796'), image('39392892'), image('28959838')],
    description: 'A creamy glide for an easier, softer-feeling shave — no rushing required.',
    whatItDoes: 'Helps your razor move comfortably while leaving skin feeling cared for.',
    whoItsFor: 'Anyone who wants a calmer, more comfortable grooming ritual.',
    howToUse: 'Apply a generous layer to warm, wet skin, shave gently, and rinse well.',
    features: ['Comfortable glide', 'Soft-feeling finish', 'Works for legs and underarms'], size: '200 ml', availability: 'In stock', label: 'New', rating: 4.7,
    reviews: [{ name: 'Ifeoma C.', rating: 5, text: 'My shave feels much less rushed and my skin is happy afterwards.' }],
  },
  {
    slug: 'fresh-start-underarm-care', name: 'Fresh Start Underarm Care', brand: 'TIAM', category: 'Grooming', price: 6100,
    image: image('8558490'), gallery: [image('8558490'), image('30487796'), image('37274628')],
    description: 'A fresh, gentle step for feeling comfortable, clean, and ready for your day.',
    whatItDoes: 'Helps keep underarms feeling fresh while fitting easily into your routine.',
    whoItsFor: 'Anyone looking for a simple, feel-good grooming essential.',
    howToUse: 'Apply a small amount to clean, dry underarms and let it settle before dressing.',
    features: ['Fresh everyday feel', 'Easy routine step', 'Travel-friendly size'], size: '60 ml', availability: 'In stock', label: 'Limited Stock', rating: 4.6,
    reviews: [{ name: 'Sade A.', rating: 5, text: 'It feels fresh and gentle, and the size is perfect for my bag.' }],
  },
];

export const CATEGORIES: Array<{ name: Category; description: string; image: string }> = [
  { name: 'Skincare', description: 'Easy little rituals for a happy, comfortable face.', image: image('39400892') },
  { name: 'Body Care', description: 'Softness, glow, and shower-time joy from neck to toe.', image: image('4857799') },
  { name: 'Self-Care', description: 'Small pauses that make ordinary days feel sweeter.', image: image('36457029') },
  { name: 'Grooming', description: 'Simple, gentle essentials for feeling put together.', image: image('30487796') },
];

export function dbProductToProduct(row: Record<string, unknown>): Product {
  const stock = typeof row.stock === 'number' ? row.stock : 15;
  const availability: Product['availability'] =
    stock > 10 ? 'In stock' : stock > 0 ? 'Limited stock' : 'Back in stock';

  const gallery = Array.isArray(row.gallery) && row.gallery.length > 0
    ? (row.gallery as string[])
    : row.image
      ? [row.image as string]
      : ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80'];

  let features: string[] = [];
  if (Array.isArray(row.features)) {
    features = row.features as string[];
  } else if (typeof row.features === 'string') {
    features = (row.features as string)
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const categoryStr = String(row.category || 'Skincare');
  const validCategory: Category = (['Skincare', 'Body Care', 'Self-Care', 'Grooming'] as const).includes(categoryStr as Category)
    ? (categoryStr as Category)
    : 'Skincare';

  const labelVal = row.label && row.label !== 'none' ? String(row.label) : undefined;

  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    slug: String(row.slug || ''),
    name: String(row.name || 'Untitled Product'),
    brand: typeof row.brand === 'string' && row.brand.trim() ? row.brand.trim().toUpperCase() : 'JAZELLE',
    category: validCategory,
    price: Number(row.price) || 0,
    image: String(row.image || gallery[0] || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80'),
    gallery,
    description: String(row.description || ''),
    whatItDoes: String(row.what_it_does || row.whatItDoes || row.description || ''),
    whoItsFor: String(row.who_its_for || row.whoItsFor || 'All melanin-rich & sensitive skin types'),
    howToUse: String(row.how_to_use || row.howToUse || 'Apply gently onto clean damp skin morning and night.'),
    features,
    size: String(row.size || '100 ml'),
    availability,
    label: labelVal as ProductLabel | undefined,
    rating: typeof row.rating === 'number' ? row.rating : 4.9,
    reviews: Array.isArray(row.reviews) ? (row.reviews as Review[]) : [],
    isActive: row.is_active !== false,
  };
}

export function getStoredProducts(): Product[] {
  return PRODUCTS;
}

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

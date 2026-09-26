import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dbProductToProduct, getProduct as getCatalogProduct, PRODUCTS, type Product } from '@/lib/catalog';
import { supabase } from '@/lib/supabaseClient';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
}

const DEFAULT_DELIVERY_FEE = 3500;
const FALLBACK_FREE_SHIPPING_THRESHOLD = 40000;

interface StoreValue {
  products: Product[];
  isLoadingProducts: boolean;
  cart: Record<string, number>;
  wishlist: string[];
  cartCount: number;
  cartSubtotal: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
  remainingForFreeDelivery: number;
  appliedCoupon: AppliedCoupon | null;
  discountAmount: number;
  cartTotal: number;
  toggleWishlist: (slug: string) => void;
  addToCart: (slug: string, quantity?: number) => void;
  removeFromCart: (slug: string) => void;
  updateCartQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  incrementCouponUsage: () => Promise<void>;
  isWishlisted: (slug: string) => boolean;
  getProduct: (slug: string) => Product | undefined;
  refreshProducts: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | undefined>(undefined);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { settings } = useSiteSettings();
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>(() => readStorage('jazelle-cart', {}));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage('jazelle-wishlist', []));
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(() =>
    readStorage<AppliedCoupon | null>('jazelle-applied-coupon', null)
  );

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[StoreContext] Error loading products from Supabase:', error.message);
      } else if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((d) => dbProductToProduct(d as Record<string, unknown>));
        setProducts(mapped);
      }
    } catch (err) {
      console.error('Failed to load products from database:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();

    // Subscribe to Supabase Realtime changes on public.products
    const channelId = `store-products-live-${Date.now()}`;
    let productsChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      productsChannel = supabase
        .channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          loadProducts();
        })
        .subscribe();
    } catch (err) {
      console.warn('[StoreContext] Realtime products subscription notice:', err);
    }

    const handleUpdate = () => {
      loadProducts();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jazelle-applied-coupon') {
        setAppliedCoupon(readStorage<AppliedCoupon | null>('jazelle-applied-coupon', null));
      } else if (e.key === 'jazelle-cart') {
        setCart(readStorage<Record<string, number>>('jazelle-cart', {}));
      } else if (e.key === 'jazelle-wishlist') {
        setWishlist(readStorage<string[]>('jazelle-wishlist', []));
      }
    };

    window.addEventListener('jazelle_products_updated', handleUpdate);
    window.addEventListener('jazelle_db_change', handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      if (productsChannel) {
        void supabase.removeChannel(productsChannel);
      }
      window.removeEventListener('jazelle_products_updated', handleUpdate);
      window.removeEventListener('jazelle_db_change', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadProducts]);

  useEffect(() => localStorage.setItem('jazelle-cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('jazelle-wishlist', JSON.stringify(wishlist)), [wishlist]);
  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('jazelle-applied-coupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('jazelle-applied-coupon');
    }
  }, [appliedCoupon]);

  const getProductBySlug = useCallback(
    (slug: string): Product | undefined => {
      const found = products.find((p) => p.slug === slug);
      if (found) return found;
      return getCatalogProduct(slug);
    },
    [products]
  );

  // Validates coupon strictly via the SECURITY DEFINER RPC validate_coupon(p_code text)
  // without direct SELECT * access to public.coupons.
  const applyCoupon = useCallback(async (rawCode: string): Promise<{ success: boolean; message: string }> => {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a promo code.' };
    }

    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: cleanCode,
      });

      if (error) {
        return { success: false, message: `Database error validating promo code: ${error.message}` };
      }

      const result = data as {
        valid?: boolean;
        code?: string;
        discount_type?: string;
        discount_value?: number;
        message?: string;
      } | null;

      if (!result || result.valid !== true) {
        return {
          success: false,
          message: result?.message || `Promo code "${cleanCode}" is invalid or expired.`,
        };
      }

      const couponObj: AppliedCoupon = {
        code: String(result.code || cleanCode).toUpperCase(),
        discount_type: String(result.discount_type || 'percentage'),
        discount_value: Number(result.discount_value) || 0,
      };

      setAppliedCoupon(couponObj);
      const label =
        couponObj.discount_type === 'percentage'
          ? `${couponObj.discount_value}% off`
          : `₦${couponObj.discount_value.toLocaleString()} off`;
      return { success: true, message: `Promo code ${couponObj.code} (${label}) applied!` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not validate promo code.';
      console.error('Coupon validation error:', err);
      return { success: false, message: msg };
    }
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  // Coupon used_count increment is performed strictly server-side during payment verification.
  const incrementCouponUsage = useCallback(async () => {
    setAppliedCoupon(null);
  }, []);

  const value = useMemo<StoreValue>(() => {
    const cartProducts = Object.entries(cart).flatMap(([slug, quantity]) => {
      const product = getProductBySlug(slug);
      return product ? [{ product, quantity }] : [];
    });

    const cartSubtotal = cartProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const parsedThreshold = Number(settings.free_delivery_threshold);
    const freeDeliveryThreshold =
      Number.isFinite(parsedThreshold) && parsedThreshold >= 0
        ? parsedThreshold
        : FALLBACK_FREE_SHIPPING_THRESHOLD;

    const deliveryFee =
      cartSubtotal === 0 || cartSubtotal >= freeDeliveryThreshold ? 0 : DEFAULT_DELIVERY_FEE;
    const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);

    let discountAmount = 0;
    if (appliedCoupon && cartSubtotal > 0) {
      if (appliedCoupon.discount_type === 'percentage') {
        discountAmount = Math.min(
          cartSubtotal,
          Math.round((cartSubtotal * Number(appliedCoupon.discount_value)) / 100)
        );
      } else {
        discountAmount = Math.min(cartSubtotal, Math.max(0, Number(appliedCoupon.discount_value)));
      }
    }

    const cartTotal = Math.max(0, cartSubtotal - discountAmount) + (cartSubtotal > 0 ? deliveryFee : 0);

    return {
      products,
      isLoadingProducts,
      cart,
      wishlist,
      cartCount: cartProducts.reduce((sum, item) => sum + item.quantity, 0),
      cartSubtotal,
      freeDeliveryThreshold,
      deliveryFee,
      remainingForFreeDelivery,
      appliedCoupon,
      discountAmount,
      cartTotal,
      toggleWishlist: (slug: string) =>
        setWishlist((current) =>
          current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
        ),
      addToCart: (slug: string, quantity = 1) =>
        setCart((current) => ({ ...current, [slug]: (current[slug] ?? 0) + quantity })),
      removeFromCart: (slug: string) =>
        setCart((current) => {
          const next = { ...current };
          delete next[slug];
          return next;
        }),
      updateCartQuantity: (slug: string, quantity: number) =>
        setCart((current) => {
          if (quantity <= 0) {
            const next = { ...current };
            delete next[slug];
            return next;
          }
          return { ...current, [slug]: quantity };
        }),
      clearCart: () => {
        setCart({});
        setAppliedCoupon(null);
      },
      applyCoupon,
      removeCoupon,
      incrementCouponUsage,
      isWishlisted: (slug: string) => wishlist.includes(slug),
      getProduct: getProductBySlug,
      refreshProducts: loadProducts,
    };
  }, [
    products,
    isLoadingProducts,
    cart,
    wishlist,
    settings.free_delivery_threshold,
    appliedCoupon,
    getProductBySlug,
    loadProducts,
    applyCoupon,
    removeCoupon,
    incrementCouponUsage,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function getCartProducts(cart: Record<string, number>): Array<{ product: Product; quantity: number }> {
  return Object.entries(cart).flatMap(([slug, quantity]) => {
    const product = getCatalogProduct(slug);
    return product ? [{ product, quantity }] : [];
  });
}

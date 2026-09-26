import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dbProductToProduct, getProduct as getCatalogProduct, getStoredProducts, PRODUCTS, type Product } from '@/lib/catalog';
import { supabase } from '@/lib/supabaseClient';

interface StoreValue {
  products: Product[];
  isLoadingProducts: boolean;
  cart: Record<string, number>;
  wishlist: string[];
  cartCount: number;
  cartSubtotal: number;
  toggleWishlist: (slug: string) => void;
  addToCart: (slug: string, quantity?: number) => void;
  removeFromCart: (slug: string) => void;
  updateCartQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
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
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = getStoredProducts();
    return stored.length > 0 ? stored : PRODUCTS;
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>(() => readStorage('jazelle-cart', {}));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage('jazelle-wishlist', []));

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((d) => dbProductToProduct(d as Record<string, unknown>));
        setProducts(mapped);
      } else {
        const fallback = getStoredProducts();
        if (fallback.length > 0) setProducts(fallback);
      }
    } catch (err) {
      console.warn('Failed to load products from database:', err);
      const fallback = getStoredProducts();
      if (fallback.length > 0) setProducts(fallback);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();

    const handleUpdate = () => {
      loadProducts();
    };

    window.addEventListener('jazelle_products_updated', handleUpdate);
    window.addEventListener('jazelle_db_change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('jazelle_products_updated', handleUpdate);
      window.removeEventListener('jazelle_db_change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadProducts]);

  useEffect(() => localStorage.setItem('jazelle-cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('jazelle-wishlist', JSON.stringify(wishlist)), [wishlist]);

  const getProductBySlug = useCallback((slug: string): Product | undefined => {
    const found = products.find((p) => p.slug === slug);
    if (found) return found;
    return getCatalogProduct(slug);
  }, [products]);

  const value = useMemo<StoreValue>(() => {
    const cartProducts = Object.entries(cart).flatMap(([slug, quantity]) => {
      const product = getProductBySlug(slug);
      return product ? [{ product, quantity }] : [];
    });
    return {
      products,
      isLoadingProducts,
      cart,
      wishlist,
      cartCount: cartProducts.reduce((sum, item) => sum + item.quantity, 0),
      cartSubtotal: cartProducts.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      toggleWishlist: (slug: string) => setWishlist((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]),
      addToCart: (slug: string, quantity = 1) => setCart((current) => ({ ...current, [slug]: (current[slug] ?? 0) + quantity })),
      removeFromCart: (slug: string) => setCart((current) => { const next = { ...current }; delete next[slug]; return next; }),
      updateCartQuantity: (slug: string, quantity: number) => setCart((current) => { if (quantity <= 0) { const next = { ...current }; delete next[slug]; return next; } return { ...current, [slug]: quantity }; }),
      clearCart: () => setCart({}),
      isWishlisted: (slug: string) => wishlist.includes(slug),
      getProduct: getProductBySlug,
      refreshProducts: loadProducts,
    };
  }, [products, isLoadingProducts, cart, wishlist, getProductBySlug, loadProducts]);

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

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProduct, type Product } from '@/lib/catalog';

interface StoreValue {
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
  const [cart, setCart] = useState<Record<string, number>>(() => readStorage('jazelle-cart', {}));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage('jazelle-wishlist', []));

  useEffect(() => localStorage.setItem('jazelle-cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('jazelle-wishlist', JSON.stringify(wishlist)), [wishlist]);

  const value = useMemo<StoreValue>(() => {
    const cartProducts = Object.entries(cart).flatMap(([slug, quantity]) => {
      const product = getProduct(slug);
      return product ? [{ product, quantity }] : [];
    });
    return {
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
    };
  }, [cart, wishlist]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function getCartProducts(cart: Record<string, number>): Array<{ product: Product; quantity: number }> {
  return Object.entries(cart).flatMap(([slug, quantity]) => {
    const product = getProduct(slug);
    return product ? [{ product, quantity }] : [];
  });
}

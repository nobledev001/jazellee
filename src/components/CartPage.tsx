import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Heart, Lock } from 'lucide-react';
import { useStore, getCartProducts } from '@/store/StoreContext';
import { formatNaira } from '@/lib/format';
import { useAuth } from '@/lib/auth';

const DELIVERY_FEE = 3500;
const FREE_DELIVERY_THRESHOLD = 40000;

export default function CartPage() {
  const { cart, updateCartQuantity, removeFromCart, cartSubtotal } = useStore();
  const { user } = useAuth();
  const items = getCartProducts(cart);

  const deliveryFee = cartSubtotal >= FREE_DELIVERY_THRESHOLD || cartSubtotal === 0 ? 0 : DELIVERY_FEE;
  const total = cartSubtotal + deliveryFee;
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - cartSubtotal);

  if (items.length === 0) {
    return (
      <main className="container-jazelle py-16 sm:py-24">
        <div className="mx-auto max-w-md rounded-5xl bg-white p-8 text-center shadow-soft sm:p-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blush-50">
            <ShoppingBag className="h-8 w-8 text-blush-400" />
          </div>
          <h1 className="font-display text-2xl font-medium text-berry-800">Your cart is empty</h1>
          <p className="mt-2 text-sm text-berry-400">No worries — your self-care picks are waiting for you in the shop.</p>
          <a href="/shop" className="btn-primary mt-6">Start Shopping <ArrowRight className="h-4 w-4" /></a>
        </div>
      </main>
    );
  }

  return (
    <main className="container-jazelle py-10 sm:py-14">
      <h1 className="section-title">Your Cart</h1>
      <p className="mt-2 text-sm text-berry-400">{items.length} {items.length === 1 ? 'item' : 'items'} ready for checkout.</p>

      {remainingForFreeDelivery > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-3xl bg-blush-50 px-5 py-3 text-sm text-berry-500">
          <Heart className="h-4 w-4 flex-shrink-0 text-blush-400" />
          You are {formatNaira(remainingForFreeDelivery)} away from free delivery!
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map(({ product, quantity }) => (
            <div key={product.slug} className="flex gap-4 rounded-4xl bg-white p-4 shadow-soft sm:p-5">
              <a href={`/product/${product.slug}`} className="flex-shrink-0">
                <img src={product.image} alt={product.name} className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24" />
              </a>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <a href={`/product/${product.slug}`}><h3 className="text-sm font-semibold text-berry-700 hover:text-blush-500 transition-colors">{product.name}</h3></a>
                    <p className="text-xs text-berry-400">{product.category} &middot; {product.size}</p>
                  </div>
                  <button onClick={() => removeFromCart(product.slug)} className="flex-shrink-0 rounded-full p-1.5 text-berry-300 hover:bg-blush-50 hover:text-blush-500 transition-colors" aria-label={`Remove ${product.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1 rounded-full border border-blush-200 bg-white p-1">
                    <button onClick={() => updateCartQuantity(product.slug, quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-berry-600 hover:bg-blush-50" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-semibold text-berry-700">{quantity}</span>
                    <button onClick={() => updateCartQuantity(product.slug, quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-berry-600 hover:bg-blush-50" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-berry-800">{formatNaira(product.price * quantity)}</p>
                    {quantity > 1 && <p className="text-xs text-berry-400">{formatNaira(product.price)} each</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <a href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-blush-500 hover:text-blush-600 transition-colors">
            <ArrowRight className="h-4 w-4 rotate-180" />
            Continue shopping
          </a>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-4xl bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-medium text-berry-800">Order Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-berry-500"><span>Subtotal</span><span className="font-medium text-berry-700">{formatNaira(cartSubtotal)}</span></div>
              <div className="flex justify-between text-berry-500"><span>Delivery</span><span className="font-medium text-berry-700">{deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}</span></div>
              <div className="border-t border-blush-100 pt-3 flex justify-between text-base font-bold text-berry-800"><span>Total</span><span>{formatNaira(total)}</span></div>
            </div>
            <a href={user ? "/checkout" : "/login?redirect=/checkout"} className="btn-primary mt-6 w-full">{user ? <>Checkout <ArrowRight className="h-4 w-4" /></> : <><Lock className="h-4 w-4" /> Sign in to checkout</>}</a>
            {!user && <p className="mt-3 text-center text-xs text-blush-500">You need an account to complete your purchase.</p>}
            <p className="mt-3 text-center text-xs text-berry-400">All prices in Naira (&#8358;). Delivery across Nigeria.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

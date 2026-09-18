import { Heart, ShoppingBag, Star } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import type { Product } from '@/lib/catalog';
import { useStore } from '@/store/StoreContext';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const saved = isWishlisted(product.slug);

  return (
    <article className="group">
      <div className="relative aspect-square rounded-4xl overflow-hidden bg-blush-50 mb-4">
        <a href={`/product/${product.slug}`} className="block h-full">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </a>
        {product.label && <span className="absolute top-3 left-3 rounded-full bg-cream-50/90 px-3 py-1 text-[0.65rem] font-bold text-berry-600 shadow-soft">{product.label}</span>}
        <button onClick={() => toggleWishlist(product.slug)} className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/90 shadow-soft transition-colors ${saved ? 'text-blush-500' : 'text-berry-400 hover:text-blush-500'}`} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}>
          <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
        </button>
        <button onClick={() => addToCart(product.slug)} className="absolute bottom-3 left-3 right-3 flex translate-y-16 items-center justify-center gap-2 rounded-full bg-berry-800 px-4 py-3 text-xs font-bold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-berry-700">
          <ShoppingBag className="h-4 w-4" /> Add to Cart
        </button>
      </div>
      <a href={`/product/${product.slug}`} className="block">
        <div className="mb-1 flex items-center gap-1"><Star className="h-3 w-3 fill-gold-400 stroke-gold-400" /><span className="text-xs text-berry-400">{product.rating}</span></div>
        <h3 className="text-sm font-semibold text-berry-700 transition-colors group-hover:text-blush-500">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between gap-2"><span className="text-sm font-bold text-berry-800">{formatNaira(product.price)}</span><span className={`text-[0.65rem] font-medium ${product.availability === 'Limited stock' ? 'text-blush-600' : 'text-sage-600'}`}>{product.availability}</span></div>
      </a>
    </article>
  );
}

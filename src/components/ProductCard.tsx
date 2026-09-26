import { useState } from 'react';
import { Heart, Plus, Star, Eye, Check, X } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import type { Product } from '@/lib/catalog';
import { useStore } from '@/store/StoreContext';

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const saved = isWishlisted(product.slug);
  const [justAdded, setJustAdded] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.slug);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickView(true);
  };

  const brandName = product.brand || 'JAZELLE';

  return (
    <>
      <article className="group flex flex-col h-full bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 transition-all duration-300 hover:shadow-soft-lg">
        {/* 1. Product image on soft pink/blush background */}
        <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-blush-50/90 mb-3 flex items-center justify-center group-hover:bg-blush-100/70 transition-colors">
          <a href={`/product/${product.slug}`} className="block w-full h-full">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </a>

          {/* Top-left small circular quick-view icon button */}
          <button
            type="button"
            onClick={handleQuickView}
            className="absolute top-2.5 left-2.5 z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 text-berry-500 shadow-xs hover:bg-white hover:text-blush-600 active:scale-95 transition-all duration-200"
            aria-label={`Quick view ${product.name}`}
            title="Quick view"
          >
            <Eye className="h-3.5 w-3.5 stroke-[1.75]" />
          </button>

          {/* Top-right small circular heart/wishlist button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.slug);
            }}
            className={`absolute top-2.5 right-2.5 z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 shadow-xs active:scale-95 transition-all duration-200 ${
              saved
                ? 'text-blush-500 fill-blush-500'
                : 'text-berry-400 hover:text-blush-500 hover:bg-white'
            }`}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          >
            <Heart className={`h-3.5 w-3.5 ${saved ? 'fill-current' : 'stroke-[1.75]'}`} />
          </button>
        </div>

        {/* 2. Brand name in small, bold, uppercase letters in a muted/gray tone */}
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
          {brandName}
        </div>

        {/* 3. Product name in regular weight, dark text, 1-2 lines */}
        <a href={`/product/${product.slug}`} className="block flex-1">
          <h3 className="text-xs sm:text-sm font-normal text-gray-900 leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] mb-1.5 hover:text-blush-600 transition-colors">
            {product.name}
          </h3>
        </a>

        {/* 4. Star rating row (5 outline stars) with review count in parentheses next to it */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="flex items-center gap-0.5 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3 w-3 stroke-[1.5] text-amber-400" />
            ))}
          </div>
          <span className="text-[11px] text-gray-400 font-normal">
            ({product.reviews?.length || 0})
          </span>
        </div>

        {/* 5. Price in ₦, bold, positioned on its own line with 6. Pill-shaped "+ Cart" button bottom-right */}
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <div className="font-bold text-sm sm:text-base text-gray-900 leading-none">
            {formatNaira(product.price)}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blush-500 hover:bg-blush-600 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all flex-shrink-0 cursor-pointer"
            aria-label={`Add ${product.name} to cart`}
          >
            {justAdded ? (
              <>
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 stroke-[2.5]" />
                <span>Cart</span>
              </>
            )}
          </button>
        </div>
      </article>

      {/* Quick View Modal */}
      {showQuickView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowQuickView(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-soft-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQuickView(false)}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="Close quick view"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-1/2 aspect-square rounded-2xl overflow-hidden bg-blush-50 flex items-center justify-center">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="w-full sm:w-1/2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {brandName}
                  </span>
                  <h3 className="font-display text-lg font-medium text-berry-800 mt-1">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-1.5 my-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 stroke-[1.5] text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      ({product.reviews?.length || 0} reviews)
                    </span>
                  </div>

                  <p className="text-xs text-berry-500 line-clamp-3 mb-3">
                    {product.description}
                  </p>

                  <div className="text-lg font-bold text-gray-900 mb-4">
                    {formatNaira(product.price)}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={(e) => {
                      handleAddToCart(e);
                      setShowQuickView(false);
                    }}
                    className="w-full py-2.5 rounded-full bg-blush-500 hover:bg-blush-600 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Add to Cart &bull; {formatNaira(product.price)}</span>
                  </button>

                  <a
                    href={`/product/${product.slug}`}
                    className="block text-center text-xs font-medium text-berry-600 hover:text-blush-600 py-1"
                  >
                    View full details &rarr;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

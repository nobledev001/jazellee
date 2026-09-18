import { useState } from 'react';
import { Heart, ShoppingBag, Star, ArrowRight, Check, Truck, Shield, RotateCcw, Minus, Plus } from 'lucide-react';
import { getProduct, PRODUCTS } from '@/lib/catalog';
import { formatNaira } from '@/lib/format';
import { useStore } from '@/store/StoreContext';
import { getWhatsAppLink } from '@/lib/whatsapp';
import ProductCard from '@/components/ProductCard';

export default function ProductDetailPage({ slug }: { slug: string }) {
  const product = getProduct(slug);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) return <main className="container-jazelle py-20 text-center"><h1 className="section-title">Product not found</h1><p className="mt-2 text-berry-400">This product may have sold out or moved.</p><a href="/shop" className="btn-primary mt-6">Back to Shop</a></main>;

  const saved = isWishlisted(product.slug);
  const related = PRODUCTS.filter((item) => item.category === product.category && item.slug !== product.slug).slice(0, 4);

  return (
    <main className="bg-cream-50">
      <div className="container-jazelle py-6 sm:py-10">
        <nav className="mb-6 flex items-center gap-2 text-xs text-berry-400"><a href="/" className="hover:text-blush-500">Home</a><span>/</span><a href="/shop" className="hover:text-blush-500">Shop</a><span>/</span><a href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-blush-500">{product.category}</a><span>/</span><span className="text-berry-600">{product.name}</span></nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square overflow-hidden rounded-5xl bg-blush-50 shadow-soft"><img src={product.gallery[activeImage]} alt={product.name} className="h-full w-full object-cover" />{product.label && <span className="absolute left-4 top-4 rounded-full bg-cream-50/90 px-3 py-1 text-xs font-bold text-berry-600 shadow-soft">{product.label}</span>}</div>
            <div className="flex gap-3">{product.gallery.map((image, index) => <button key={index} onClick={() => setActiveImage(index)} className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition-colors ${activeImage === index ? 'border-blush-400' : 'border-transparent hover:border-blush-200'}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>
          </div>

          {/* Info */}
          <div>
            <div className="mb-2 flex items-center gap-2"><div className="flex items-center gap-0.5">{[...Array(5)].map((_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.floor(product.rating) ? 'fill-gold-400 stroke-gold-400' : 'fill-blush-100 stroke-blush-200'}`} />)}</div><span className="text-sm text-berry-400">{product.rating} ({product.reviews.length} reviews)</span></div>
            <h1 className="font-display text-3xl font-medium text-berry-800 sm:text-4xl">{product.name}</h1>
            <p className="mt-3 text-lg text-berry-500">{product.description}</p>
            <div className="mt-4 flex items-baseline gap-3"><span className="text-3xl font-bold text-berry-800">{formatNaira(product.price)}</span><span className="text-sm text-berry-400">{product.size}</span></div>
            <div className="mt-2 flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${product.availability === 'In stock' ? 'bg-sage-100 text-sage-700' : product.availability === 'Back in stock' ? 'bg-cream-200 text-cream-800' : 'bg-blush-100 text-blush-600'}`}><Check className="h-3 w-3" />{product.availability}</span></div>

            {/* Quantity + actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-blush-200 bg-white p-1"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-berry-600 hover:bg-blush-50" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button><span className="w-8 text-center text-sm font-semibold text-berry-700">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-berry-600 hover:bg-blush-50" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button></div>
              <button onClick={() => { for (let index = 0; index < quantity; index++) addToCart(product.slug); }} className="btn-primary"><ShoppingBag className="h-4 w-4" /> Add to Cart</button>
              <button onClick={() => toggleWishlist(product.slug)} className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${saved ? 'border-blush-400 bg-blush-50 text-blush-500' : 'border-blush-200 bg-white text-berry-400 hover:border-blush-300 hover:text-blush-500'}`} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}><Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} /></button>
            </div>
            <a href="/cart" className="btn-secondary mt-3 w-full sm:w-auto">Buy Now <ArrowRight className="h-4 w-4" /></a>

            {/* Quick perks */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center"><div className="rounded-3xl bg-blush-50 p-3"><Truck className="mx-auto h-5 w-5 text-blush-400" /><p className="mt-1 text-[0.7rem] font-medium text-berry-500">Delivered across Nigeria</p></div><div className="rounded-3xl bg-blush-50 p-3"><Shield className="mx-auto h-5 w-5 text-blush-400" /><p className="mt-1 text-[0.7rem] font-medium text-berry-500">Gentle, skin-friendly</p></div><div className="rounded-3xl bg-blush-50 p-3"><RotateCcw className="mx-auto h-5 w-5 text-blush-400" /><p className="mt-1 text-[0.7rem] font-medium text-berry-500">Easy returns</p></div></div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8"><h2 className="font-display text-xl font-medium text-berry-800">The details</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="font-semibold text-berry-700">What it does</dt><dd className="mt-1 text-berry-500">{product.whatItDoes}</dd></div><div><dt className="font-semibold text-berry-700">Who it's for</dt><dd className="mt-1 text-berry-500">{product.whoItsFor}</dd></div><div><dt className="font-semibold text-berry-700">How to use</dt><dd className="mt-1 text-berry-500">{product.howToUse}</dd></div><div><dt className="font-semibold text-berry-700">Key features</dt><dd className="mt-1"><ul className="space-y-1">{product.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-berry-500"><Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blush-400" />{feature}</li>)}</ul></dd></div><div><dt className="font-semibold text-berry-700">Size</dt><dd className="mt-1 text-berry-500">{product.size}</dd></div></dl></div>
          <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8"><h2 className="font-display text-xl font-medium text-berry-800">Reviews</h2><div className="mt-4 flex items-center gap-3"><span className="font-display text-4xl font-semibold text-berry-800">{product.rating}</span><div><div className="flex items-center gap-0.5">{[...Array(5)].map((_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.floor(product.rating) ? 'fill-gold-400 stroke-gold-400' : 'fill-blush-100 stroke-blush-200'}`} />)}</div><p className="mt-0.5 text-xs text-berry-400">{product.reviews.length} reviews</p></div></div><div className="mt-6 space-y-4">{product.reviews.map((review, index) => <div key={index} className="rounded-3xl bg-blush-50 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-berry-700">{review.name}</p><div className="flex items-center gap-0.5">{[...Array(5)].map((_, starIndex) => <Star key={starIndex} className={`h-3 w-3 ${starIndex < review.rating ? 'fill-gold-400 stroke-gold-400' : 'fill-blush-100 stroke-blush-200'}`} />)}</div></div><p className="mt-2 text-sm text-berry-500">{review.text}</p></div>)}</div><a href={getWhatsAppLink(`Hi Jazelle! I have a question about ${product.name}.`)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blush-500 hover:text-blush-600">Still have questions? Chat with us</a></div>
        </div>

        {/* Related */}
        {related.length > 0 && <div className="mt-14"><div className="mb-6 flex items-end justify-between"><div><span className="section-subtitle">You might also love</span><h2 className="section-title mt-2">Related picks</h2></div><a href="/shop" className="btn-ghost">View all <ArrowRight className="h-4 w-4" /></a></div><div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div></div>}
      </div>
    </main>
  );
}

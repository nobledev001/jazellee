import { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  ShoppingBag,
  Star,
  ArrowRight,
  Check,
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  CheckCircle2,
  Lock,
  MessageSquarePlus,
} from 'lucide-react';
import { getProduct, PRODUCTS } from '@/lib/catalog';
import { formatNaira } from '@/lib/format';
import { useStore } from '@/store/StoreContext';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { useAuth, supabase } from '@/lib/auth';
import ProductCard from '@/components/ProductCard';

interface DbProductReview {
  id: string;
  product_id?: string | null;
  product_slug: string;
  user_id?: string | null;
  reviewer_name: string;
  rating: number;
  text: string;
  is_approved: boolean;
  created_at: string;
}

export default function ProductDetailPage({ slug }: { slug: string }) {
  const { addToCart, toggleWishlist, isWishlisted, getProduct: getStoreProduct, products } = useStore();
  const { user } = useAuth();
  const product = getStoreProduct(slug) || getProduct(slug);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const [approvedReviews, setApprovedReviews] = useState<DbProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Leave a Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmittedNotice, setReviewSubmittedNotice] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
    setReviewSubmittedNotice(null);
    setReviewError(null);
  }, [slug]);

  useEffect(() => {
    if (user) {
      const defaultName =
        (user.user_metadata?.full_name as string) ||
        (user.email ? user.email.split('@')[0] : '');
      setReviewerName((prev) => prev || defaultName);
    }
  }, [user]);

  const loadApprovedReviews = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_slug', slug)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const filtered = (data as DbProductReview[]).filter(
          (r) => r.product_slug === slug && Boolean(r.is_approved)
        );
        setApprovedReviews(filtered);
      }
    } catch (err) {
      console.warn('[ProductDetailPage] Could not load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  }, [slug]);

  useEffect(() => {
    setLoadingReviews(true);
    loadApprovedReviews();

    const channelId = `product-reviews-${slug}-${Date.now()}`;
    let channel: unknown = null;
    if (typeof supabase?.channel === 'function') {
      try {
        channel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'product_reviews' }, () => {
            loadApprovedReviews();
          })
          .subscribe();
      } catch {
        // ignore
      }
    }

    const handleReviewChange = () => {
      loadApprovedReviews();
    };

    window.addEventListener('jazelle_reviews_updated', handleReviewChange);
    window.addEventListener('jazelle_db_change', handleReviewChange);
    window.addEventListener('storage', handleReviewChange);

    return () => {
      if (channel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      window.removeEventListener('jazelle_reviews_updated', handleReviewChange);
      window.removeEventListener('jazelle_db_change', handleReviewChange);
      window.removeEventListener('storage', handleReviewChange);
    };
  }, [slug, loadApprovedReviews]);

  if (!product) {
    return (
      <main className="container-jazelle py-20 text-center">
        <h1 className="section-title">Product not found</h1>
        <p className="mt-2 text-berry-400">This product may have sold out or moved.</p>
        <a href="/shop" className="btn-primary mt-6">Back to Shop</a>
      </main>
    );
  }

  const saved = isWishlisted(product.slug);
  const catalogList = products && products.length > 0 ? products : PRODUCTS;
  const related = catalogList
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 4);

  const reviewCount = approvedReviews.length;
  const displayRating =
    reviewCount > 0
      ? Number((approvedReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviewCount).toFixed(1))
      : product.rating;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanName = reviewerName.trim();
    const cleanText = reviewText.trim();

    if (!cleanName) {
      setReviewError('Please enter your name.');
      return;
    }
    if (cleanText.length < 5) {
      setReviewError('Please write a short review (at least 5 characters).');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);
    setReviewSubmittedNotice(null);

    try {
      const payload: Record<string, unknown> = {
        product_slug: product.slug,
        reviewer_name: cleanName,
        rating: reviewRating,
        text: cleanText,
        is_approved: false,
        created_at: new Date().toISOString(),
      };

      if (product.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id)) {
        payload.product_id = product.id;
      }
      if (user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)) {
        payload.user_id = user.id;
      }

      const { error } = await supabase.from('product_reviews').insert(payload);
      if (error) throw error;

      setReviewText('');
      setReviewRating(5);
      setReviewSubmittedNotice(
        'Thank you for your review! It has been submitted to our moderation queue and will appear on the storefront once approved by an admin.'
      );
      window.dispatchEvent(new CustomEvent('jazelle_reviews_updated'));
    } catch (err) {
      console.error('[ProductDetailPage] Review submission error:', err);
      setReviewError('Could not submit your review right now. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <main className="bg-cream-50">
      <div className="container-jazelle py-6 sm:py-10">
        <nav className="mb-6 flex items-center gap-2 text-xs text-berry-400">
          <a href="/" className="hover:text-blush-500">Home</a>
          <span>/</span>
          <a href="/shop" className="hover:text-blush-500">Shop</a>
          <span>/</span>
          <a href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-blush-500">{product.category}</a>
          <span>/</span>
          <span className="text-berry-600">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square overflow-hidden rounded-5xl bg-blush-50 shadow-soft">
              <img src={product.gallery[activeImage]} alt={product.name} className="h-full w-full object-cover" />
              {product.label && (
                <span className="absolute left-4 top-4 rounded-full bg-cream-50/90 px-3 py-1 text-xs font-bold text-berry-600 shadow-soft">
                  {product.label}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {product.gallery.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`h-20 w-20 overflow-hidden rounded-2xl border-2 transition-colors ${
                    activeImage === index ? 'border-blush-400' : 'border-transparent hover:border-blush-200'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${
                      index < Math.floor(displayRating)
                        ? 'fill-gold-400 stroke-gold-400'
                        : 'fill-blush-100 stroke-blush-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-berry-400">
                {displayRating} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            <h1 className="font-display text-3xl font-medium text-berry-800 sm:text-4xl">{product.name}</h1>
            <p className="mt-3 text-lg text-berry-500">{product.description}</p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-berry-800">{formatNaira(product.price)}</span>
              <span className="text-sm text-berry-400">{product.size}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  product.availability === 'In stock'
                    ? 'bg-sage-100 text-sage-700'
                    : product.availability === 'Back in stock'
                    ? 'bg-cream-200 text-cream-800'
                    : 'bg-blush-100 text-blush-600'
                }`}
              >
                <Check className="h-3 w-3" />
                {product.availability}
              </span>
            </div>

            {/* Quantity + actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-blush-200 bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-berry-600 hover:bg-blush-50"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-berry-700">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-berry-600 hover:bg-blush-50"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  for (let index = 0; index < quantity; index++) addToCart(product.slug);
                }}
                className="btn-primary"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
              <button
                onClick={() => toggleWishlist(product.slug)}
                className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                  saved
                    ? 'border-blush-400 bg-blush-50 text-blush-500'
                    : 'border-blush-200 bg-white text-berry-400 hover:border-blush-300 hover:text-blush-500'
                }`}
                aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>
            <button
              onClick={() => {
                for (let index = 0; index < quantity; index++) addToCart(product.slug);
                window.location.href = '/checkout';
              }}
              className="btn-secondary mt-3 w-full sm:w-auto cursor-pointer"
            >
              Buy Now <ArrowRight className="h-4 w-4" />
            </button>

            {/* Quick perks */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-3xl bg-blush-50 p-3">
                <Truck className="mx-auto h-5 w-5 text-blush-400" />
                <p className="mt-1 text-[0.7rem] font-medium text-berry-500">Delivered across Nigeria</p>
              </div>
              <div className="rounded-3xl bg-blush-50 p-3">
                <Shield className="mx-auto h-5 w-5 text-blush-400" />
                <p className="mt-1 text-[0.7rem] font-medium text-berry-500">Gentle, skin-friendly</p>
              </div>
              <div className="rounded-3xl bg-blush-50 p-3">
                <RotateCcw className="mx-auto h-5 w-5 text-blush-400" />
                <p className="mt-1 text-[0.7rem] font-medium text-berry-500">Easy returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details & Real Moderated Reviews */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8 h-fit">
            <h2 className="font-display text-xl font-medium text-berry-800">The details</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-berry-700">What it does</dt>
                <dd className="mt-1 text-berry-500">{product.whatItDoes}</dd>
              </div>
              <div>
                <dt className="font-semibold text-berry-700">Who it's for</dt>
                <dd className="mt-1 text-berry-500">{product.whoItsFor}</dd>
              </div>
              <div>
                <dt className="font-semibold text-berry-700">How to use</dt>
                <dd className="mt-1 text-berry-500">{product.howToUse}</dd>
              </div>
              <div>
                <dt className="font-semibold text-berry-700">Key features</dt>
                <dd className="mt-1">
                  <ul className="space-y-1">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-berry-500">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blush-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-berry-700">Size</dt>
                <dd className="mt-1 text-berry-500">{product.size}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-xl font-medium text-berry-800">Customer Reviews</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-display text-4xl font-semibold text-berry-800">{displayRating}</span>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < Math.floor(displayRating)
                            ? 'fill-gold-400 stroke-gold-400'
                            : 'fill-blush-100 stroke-blush-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-berry-400">
                    {reviewCount} verified {reviewCount === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {loadingReviews ? (
                  <p className="text-sm text-berry-400">Loading verified reviews…</p>
                ) : approvedReviews.length === 0 ? (
                  <div className="rounded-3xl bg-blush-50/60 p-5 text-center">
                    <p className="text-sm text-berry-500">No approved reviews for this product yet.</p>
                    <p className="text-xs text-berry-400 mt-1">Be the first to share your experience below!</p>
                  </div>
                ) : (
                  approvedReviews.map((review) => (
                    <div key={review.id} className="rounded-3xl bg-blush-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-berry-700">{review.reviewer_name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-sage-700">
                            <Check className="h-2.5 w-2.5 text-sage-600" /> Verified
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, starIndex) => (
                            <Star
                              key={starIndex}
                              className={`h-3 w-3 ${
                                starIndex < review.rating
                                  ? 'fill-gold-400 stroke-gold-400'
                                  : 'fill-blush-100 stroke-blush-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-berry-500 leading-relaxed">{review.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Leave a Review Form */}
            <div className="border-t border-blush-100 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquarePlus className="h-4 w-4 text-blush-500" />
                <h3 className="font-display text-lg font-medium text-berry-800">Leave a Review</h3>
              </div>

              {reviewSubmittedNotice && (
                <div className="mb-4 flex items-start gap-2.5 rounded-3xl bg-sage-50 border border-sage-200 p-4 text-xs sm:text-sm text-sage-800">
                  <CheckCircle2 className="h-4 w-4 text-sage-600 flex-shrink-0 mt-0.5" />
                  <span>{reviewSubmittedNotice}</span>
                </div>
              )}

              {reviewError && (
                <div className="mb-4 rounded-2xl bg-blush-50 border border-blush-200 px-4 py-3 text-xs text-blush-700">
                  {reviewError}
                </div>
              )}

              {user ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4 rounded-3xl bg-cream-50/70 border border-blush-100 p-4 sm:p-5">
                  <div>
                    <label className="block text-xs font-semibold text-berry-700 mb-1.5">Your Rating</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= (hoverRating ?? reviewRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="p-1 rounded-full hover:bg-blush-50 transition-colors cursor-pointer"
                            aria-label={`Rate ${star} out of 5 stars`}
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                active
                                  ? 'fill-gold-400 stroke-gold-400'
                                  : 'fill-blush-100 stroke-blush-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-xs font-medium text-berry-500">
                        {reviewRating} out of 5 stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-berry-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Amaka O."
                      required
                      className="input-jazelle !py-2.5 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-berry-700 mb-1">Your Review</label>
                    <textarea
                      rows={3}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={`How has ${product.name} worked for your skin?`}
                      required
                      className="input-jazelle !rounded-2xl !py-2.5 text-sm bg-white"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-berry-400">
                      Reviews are moderated by our team before going live.
                    </p>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="btn-primary !py-2.5 !px-5 text-xs sm:text-sm cursor-pointer disabled:opacity-60"
                    >
                      {submittingReview ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-3xl bg-blush-50/70 border border-blush-100 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-berry-700">Tried {product.name}?</p>
                    <p className="text-xs text-berry-400 mt-0.5">
                      Sign in to your customer account to leave a star rating and review.
                    </p>
                  </div>
                  <a
                    href={`/login?redirect=${encodeURIComponent(`/product/${product.slug}`)}`}
                    className="btn-secondary !py-2 !px-4 text-xs whitespace-nowrap"
                  >
                    <Lock className="h-3.5 w-3.5" /> Sign in to Review
                  </a>
                </div>
              )}
            </div>

            <a
              href={getWhatsAppLink(`Hi Jazelle! I have a question about ${product.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blush-500 hover:text-blush-600"
            >
              Still have questions? Chat with us
            </a>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-14">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="section-subtitle">You might also love</span>
                <h2 className="section-title mt-2">Related picks</h2>
              </div>
              <a href="/shop" className="btn-ghost">
                View all <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Star, Quote, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useStore } from '@/store/StoreContext';

interface ApprovedReview {
  id: string;
  product_id?: string | null;
  product_slug: string;
  reviewer_name: string;
  rating: number;
  text: string;
  is_approved: boolean;
  created_at: string;
}

export default function Testimonials() {
  const { getProduct } = useStore();
  const [reviews, setReviews] = useState<ApprovedReview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApprovedReviews = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const approved = (data as ApprovedReview[])
          .filter((r) => Boolean(r.is_approved))
          .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          })
          .slice(0, 6);
        setReviews(approved);
      }
    } catch (err) {
      console.warn('[Testimonials] Failed to load approved reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovedReviews();

    const channelId = `homepage-testimonials-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

    const handleUpdate = () => {
      loadApprovedReviews();
    };

    window.addEventListener('jazelle_reviews_updated', handleUpdate);
    window.addEventListener('jazelle_db_change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      if (channel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      window.removeEventListener('jazelle_reviews_updated', handleUpdate);
      window.removeEventListener('jazelle_db_change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadApprovedReviews]);

  if (!loading && reviews.length === 0) {
    return null;
  }

  return (
    <section className="container-jazelle py-14 sm:py-20" aria-label="Customer Testimonials">
      <div className="text-center mb-10 sm:mb-12">
        <span className="section-subtitle">Loved Across Nigeria</span>
        <h2 className="section-title mt-2">Real Words from the Haven</h2>
        <p className="text-berry-400 text-sm sm:text-base mt-2 max-w-lg mx-auto">
          Verified reviews from women making gentle, everyday self-care part of their routine.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="rounded-4xl bg-white p-6 shadow-soft h-52 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {reviews.map((rev) => {
            const product = getProduct(rev.product_slug);
            const productName = product?.name || rev.product_slug.replace(/-/g, ' ');

            return (
              <div
                key={rev.id}
                className="flex flex-col justify-between rounded-4xl bg-white p-6 sm:p-7 shadow-soft border border-blush-100/60 transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, starIdx) => (
                        <Star
                          key={starIdx}
                          className={`h-4 w-4 ${
                            starIdx < rev.rating
                              ? 'fill-gold-400 stroke-gold-400'
                              : 'fill-blush-100 stroke-blush-200'
                          }`}
                        />
                      ))}
                    </div>
                    <Quote className="h-5 w-5 text-blush-200 flex-shrink-0" />
                  </div>

                  <p className="text-sm sm:text-base text-berry-600 leading-relaxed">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-blush-100/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-berry-800">{rev.reviewer_name}</p>
                    <p className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-700 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-sage-600" />
                      Verified Review
                    </p>
                  </div>

                  <a
                    href={`/product/${rev.product_slug}`}
                    className="group inline-flex items-center gap-2 rounded-full bg-blush-50/80 hover:bg-blush-100 px-3 py-1.5 text-xs font-medium text-berry-700 transition-colors max-w-[180px]"
                  >
                    {product?.image && (
                      <img
                        src={product.image}
                        alt={productName}
                        className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <span className="truncate capitalize">{productName}</span>
                    <ArrowUpRight className="h-3 w-3 text-blush-500 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

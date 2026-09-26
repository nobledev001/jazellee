import { useEffect, useState, useCallback } from 'react';
import { Star, CheckCircle2, Trash2 } from 'lucide-react';
import { supabase, type DbReview } from '../supabase';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadReviews = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (Array.isArray(data)) {
        setReviews(data as DbReview[]);
      }
    } catch (err) {
      console.warn('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();

    const channelId = `admin-reviews-live-${Date.now()}`;
    let channel: unknown = null;
    if (typeof supabase?.channel === 'function') {
      try {
        channel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'product_reviews' }, () => {
            loadReviews();
          })
          .subscribe();
      } catch {
        // ignore
      }
    }

    const handleSync = () => {
      loadReviews();
    };

    window.addEventListener('jazelle_reviews_updated', handleSync);
    window.addEventListener('jazelle_db_change', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      if (channel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      window.removeEventListener('jazelle_reviews_updated', handleSync);
      window.removeEventListener('jazelle_db_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadReviews]);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setReviews((current) =>
      current.map((r) => (r.id === id ? { ...r, is_approved: newStatus } : r))
    );
    try {
      await supabase
        .from('product_reviews')
        .update({ is_approved: newStatus })
        .eq('id', id);
      window.dispatchEvent(new CustomEvent('jazelle_reviews_updated'));
      showToast(
        newStatus
          ? 'Review approved — now live on the storefront & homepage testimonials.'
          : 'Review hidden — removed from the storefront.'
      );
    } catch (err) {
      console.warn('Could not persist review status to Supabase:', err);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return;
    setReviews((current) => current.filter((r) => r.id !== id));
    try {
      await supabase.from('product_reviews').delete().eq('id', id);
      window.dispatchEvent(new CustomEvent('jazelle_reviews_updated'));
      showToast('Review deleted.');
    } catch (err) {
      console.warn('Could not delete review:', err);
    }
  };

  const pendingCount = reviews.filter((r) => !r.is_approved).length;
  const approvedCount = reviews.filter((r) => r.is_approved).length;

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return Boolean(r.is_approved);
    return true;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Reviews</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Moderate customer testimonials and ratings before they appear live on product pages and homepage.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'approved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading reviews…</div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No reviews match this filter.</div>
        ) : (
          <>
            {/* Mobile Card List (< 768px) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a
                        href={`/product/${rev.product_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-900 hover:text-pink-600 capitalize"
                      >
                        {rev.product_slug.replace(/-/g, ' ')}
                      </a>
                      <p className="text-xs text-gray-500 mt-0.5">by {rev.reviewer_name}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
                        rev.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rev.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    &ldquo;{rev.text}&rdquo;
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => toggleApproval(rev.id, rev.is_approved)}
                      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                        rev.is_approved
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {rev.is_approved ? 'Hide Review' : 'Approve Review'}
                    </button>
                    <button
                      onClick={() => deleteReview(rev.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Reviewer</th>
                    <th className="px-6 py-3">Rating</th>
                    <th className="px-6 py-3">Review</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 capitalize">
                        <a
                          href={`/product/${rev.product_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-pink-600 underline decoration-gray-200 hover:decoration-pink-400"
                        >
                          {rev.product_slug.replace(/-/g, ' ')}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{rev.reviewer_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-md">&ldquo;{rev.text}&rdquo;</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            rev.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rev.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleApproval(rev.id, rev.is_approved)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                              rev.is_approved
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {rev.is_approved ? 'Hide' : 'Approve'}
                          </button>
                          <button
                            onClick={() => deleteReview(rev.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

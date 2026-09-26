import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase, type DbReview } from '../supabase';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = () => {
    supabase
      .from('product_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && (data as DbReview[]).length > 0) {
          setReviews(data as DbReview[]);
        } else {
          // Seed initial display reviews if empty
          setReviews([
            {
              id: 'rev-1',
              product_id: 'p-1',
              product_slug: 'gentle-bloom-cleanser',
              user_id: null,
              reviewer_name: 'Amaka O.',
              rating: 5,
              text: 'My face feels clean but still soft after using this. It is now my everyday cleanser.',
              is_approved: true,
              created_at: new Date().toISOString(),
            },
            {
              id: 'rev-2',
              product_id: 'p-2',
              product_slug: 'sun-kissed-sunscreen',
              user_id: null,
              reviewer_name: 'Zainab M.',
              rating: 5,
              text: 'No heavy white cast and it sits so nicely under my makeup.',
              is_approved: true,
              created_at: new Date().toISOString(),
            },
            {
              id: 'rev-3',
              product_id: 'p-4',
              product_slug: 'rose-glow-body-oil',
              user_id: null,
              reviewer_name: 'Nneka I.',
              rating: 5,
              text: 'The glow is gorgeous without being greasy. I get compliments every time.',
              is_approved: true,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReviews();
  }, []);

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
    } catch (err) {
      console.warn('Could not persist review status to Supabase:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Reviews</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Moderate customer testimonials and ratings before they appear live.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No reviews submitted yet.</div>
        ) : (
          <>
            {/* Mobile Card List (< 768px) */}
            <div className="divide-y divide-gray-100 md:hidden">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 space-y-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 capitalize">
                        {rev.product_slug.replace(/-/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">by {rev.reviewer_name}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${
                      rev.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {rev.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    "{rev.text}"
                  </p>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => toggleApproval(rev.id, rev.is_approved)}
                      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors ${
                        rev.is_approved
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {rev.is_approved ? 'Hide Review' : 'Approve Review'}
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
                  {reviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 capitalize">
                        {rev.product_slug.replace(/-/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{rev.reviewer_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">"{rev.text}"</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          rev.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rev.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleApproval(rev.id, rev.is_approved)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            rev.is_approved ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {rev.is_approved ? 'Hide' : 'Approve'}
                        </button>
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

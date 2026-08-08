import React, { useEffect, useState } from 'react';
import { api } from '../../../utils/apiClient';
import { Loader2, Star } from 'lucide-react';

const StarRating = ({ count }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(count) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
    ))}
  </span>
);

export default function AdminReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/reviews?page=${page}&limit=20`)
      .then(response => {
        if (!response.ok) throw new Error(response.status);
        const payload = response.data || {};
        setReviews(Array.isArray(payload) ? payload : Array.isArray(payload.reviews) ? payload.reviews : []);
        setTotal(payload.pagination?.total ?? 0);
        setTotalPages(payload.pagination?.pages ?? 0);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load reviews.'); setLoading(false); });
  }, [page]);

  const filtered = reviews.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.reviewerName || '').toLowerCase().includes(q) ||
      (r.provider?.user?.name || '').toLowerCase().includes(q) ||
      (r.comment || '').toLowerCase().includes(q) ||
      (r.serviceCategory || '').toLowerCase().includes(q)
    );
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Reviews</h2>
          <p className="text-slate-500 text-xs">All reviews submitted by customers for providers.</p>
        </div>
        <div className="flex gap-4 text-center">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Total</span>
            <span className="block text-lg font-black text-slate-900">{total > 0 ? total : reviews.length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Avg Rating</span>
            <span className="block text-lg font-black text-amber-500">{avgRating}</span>
          </div>
        </div>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by reviewer, provider, comment, service..."
        className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
      />

      {loading && <div className="flex items-center gap-2 text-slate-400 text-xs"><Loader2 className="w-4 h-4 animate-spin" /> Loading reviews...</div>}
      {error && <p className="text-rose-600 text-xs font-semibold">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
          No reviews found.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(rev => (
          <div key={rev.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900">{rev.reviewerName || rev.reviewer?.name || 'Customer'}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  {rev.serviceCategory || 'General'}
                </span>
              </div>
              <div className="text-amber-400 text-sm font-bold tracking-wider">
                <StarRating count={rev.rating} />
                <span className="text-slate-500 text-xs font-semibold ml-1">({rev.rating}/5)</span>
              </div>
              {rev.comment && (
                <p className="text-slate-600 text-xs font-medium italic">"{rev.comment}"</p>
              )}
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p className="text-xs font-bold text-slate-700">
                Provider: <span className="text-indigo-700">{rev.provider?.user?.name || '—'}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-bold text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

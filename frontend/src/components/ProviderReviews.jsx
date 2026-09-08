import React, { useMemo, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const PER_PAGE = 3;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return String(value);
  }
}

function Stars({ rating }) {
  const safe = typeof rating === 'number' && !Number.isNaN(rating) ? rating : 0;
  const full = clamp(Math.round(safe), 0, 5);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-amber-500 font-black">★</span>
      <span className="text-xs font-black text-slate-900">{safe.toFixed(1)}</span>
      <span className="text-[10px] font-bold text-amber-400">({full}/5)</span>
    </span>
  );
}

function RatingBar({ value, max, label }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 text-[10px] font-black text-slate-500">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
        <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right text-[10px] font-bold text-slate-500">{value}</div>
    </div>
  );
}

export default function ProviderReviews({ rating, reviews }) {
  const [page, setPage] = useState(1);

  const safeReviews = useMemo(() => (Array.isArray(reviews) ? reviews : []), [reviews]);

  useEffect(() => {
    setPage(1);
  }, [safeReviews.length]);

  const computed = useMemo(() => {
    const list = safeReviews;

    let avg = 0;
    if (typeof rating === 'number' && !Number.isNaN(rating)) {
      avg = rating;
    } else if (list.length) {
      const sum = list.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 0), 0);
      avg = sum / list.length;
    }

    const ratingCounts = [0, 0, 0, 0, 0];
    for (const r of list) {
      const v = typeof r.rating === 'number' ? r.rating : 0;
      const bucket = clamp(Math.round(v), 1, 5) - 1;
      ratingCounts[bucket]++;
    }

    return { avg, count: list.length, ratingCounts };
  }, [safeReviews, rating]);

  // All reviews, newest first — no filters, just direct pagination.
  const sorted = useMemo(() => {
    const toTime = (r) => {
      if (!r?.date) return 0;
      const d = new Date(r.date);
      return !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    };
    return [...safeReviews].sort((a, b) => toTime(b) - toTime(a));
  }, [safeReviews]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PER_PAGE;
  const pageItems = sorted.slice(startIdx, startIdx + PER_PAGE);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Client Review Audit</h3>
        <p className="text-xs text-slate-500 font-semibold mt-1">Track quality signals and respond to feedback opportunities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6 rounded-2xl text-center space-y-2 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Feedback Score</span>
            <span className="text-3xl font-black text-amber-400 block flex items-center gap-1 justify-center"><Star className="w-6 h-6" /> {(computed.count ? computed.avg : 0).toFixed(1)}</span>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-tight">{computed.count} Customer Audits</span>
          </div>

          <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black text-slate-900">Rating distribution</div>
              <div className="text-[10px] font-bold text-slate-500">1★ → 5★</div>
            </div>

            {computed.count === 0 ? (
              <div className="text-center text-xs text-slate-400 italic font-semibold py-6">No histogram data.</div>
            ) : (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((star, idx) => (
                  <RatingBar key={star} value={computed.ratingCounts[idx]} max={Math.max(...computed.ratingCounts)} label={`${star}★`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-8 space-y-4">
          {sorted.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-xs text-slate-400 italic font-semibold">
              No reviews yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-slate-900">
                  {sorted.length} {sorted.length === 1 ? 'review' : 'reviews'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pageItems.map((rev, idx) => {
                  const comment = rev.comment ? String(rev.comment) : '';
                  return (
                    <div key={rev.id || idx} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 text-xs shadow-3xs">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="text-slate-900 font-black uppercase tracking-tight truncate">{rev.reviewerName || 'Anonymous'}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <Stars rating={rev.rating} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 font-mono block">{formatDate(rev.date)}</div>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black border border-slate-200 bg-slate-50 text-slate-700">
                              {(rev.serviceCategory || 'Other').toString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {comment ? (
                        <p className="text-slate-600 italic font-medium leading-relaxed">“{comment}”</p>
                      ) : (
                        <p className="text-slate-400 italic font-semibold">No comment provided.</p>
                      )}

                      {rev.bookingId ? (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400">Booking</div>
                          <div className="text-[10px] font-mono text-slate-700">{rev.bookingId}</div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <div className="text-[11px] font-bold text-slate-500 text-center">
                    Page {currentPage} of {totalPages}
                    <span className="text-slate-400 block sm:inline sm:ml-1">
                      · Showing {startIdx + 1}–{Math.min(startIdx + PER_PAGE, sorted.length)} of {sorted.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
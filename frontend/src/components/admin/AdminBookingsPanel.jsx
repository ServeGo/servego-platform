import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { normalizeBooking } from '../../utils/normalizeCustomerData';

const PAGE_SIZE = 20;

const STATUS_BADGES = {
  pending: { label: 'Awaiting partner', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  confirmed: { label: 'Dispatch set', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  ongoing: { label: 'In progress', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  completed: { label: 'Settled', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
};

function StatusBadge({ status }) {
  const key = (status || '').toLowerCase();
  const meta = STATUS_BADGES[key];
  if (!meta) return <span className="text-slate-400 text-[9px] uppercase font-bold">{status}</span>;
  return (
    <span className={`${meta.cls} border px-2 py-0.5 rounded text-[9px] font-extrabold uppercase`}>
      {meta.label}
    </span>
  );
}

function TimelineModal({ bookingId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/bookings/${bookingId}/timeline`)
      .then(res => {
        if (cancelled) return;
        if (res.ok) setData(res.data);
        else setError(res.data?.message || 'Failed to load timeline.');
      })
      .catch(() => { if (!cancelled) setError('Network error.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Booking Timeline</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{bookingId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Close timeline">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loading && <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading timeline...</div>}
          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Customer</span>
                  <span className="font-bold text-slate-800">{data.customer?.name || '—'}</span>
                  <span className="block text-slate-500 text-[10px]">{data.customer?.email}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Provider</span>
                  <span className="font-bold text-slate-800">{data.provider?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Service</span>
                  <span className="font-bold text-slate-800">{data.serviceCategory}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Current Status</span>
                  <StatusBadge status={data.currentStatus} />
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-3">Event Log</span>
                {(!data.timeline || data.timeline.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No events recorded.</p>
                ) : (
                  <ol className="relative border-l border-slate-200 space-y-4 ml-2">
                    {data.timeline.map((event, i) => (
                      <li key={i} className="ml-4">
                        <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />
                        <div className="flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-slate-700">{event.status}</span>
                            {event.note && <p className="text-[11px] text-slate-500 mt-0.5">{event.note}</p>}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingsPanel({ onOverrideCancel }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timelineBookingId, setTimelineBookingId] = useState(null);

  const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'];

  // Debounce the search box so each keystroke does not fire a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(async ({ cursor = null, append = false } = {}) => {
    const params = new URLSearchParams({ mode: 'cursor', limit: String(PAGE_SIZE) });
    if (statusFilter !== 'all') params.set('status', statusFilter.toUpperCase());
    if (debouncedSearch) params.set('adminSearch', debouncedSearch);
    if (cursor) params.set('cursor', cursor);

    if (append) setLoadingMore(true); else setLoading(true);
    setError('');

    const res = await api.get(`/bookings?${params.toString()}`);
    if (!res.ok) {
      setError(res.data?.message || 'Failed to load bookings.');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const data = res.data || {};
    const incoming = (data.bookings || []).map(normalizeBooking);
    setRows(prev => append ? [...prev, ...incoming] : incoming);
    setTotal(data.pagination?.total ?? 0);
    setNextCursor(data.pagination?.nextCursor ?? null);
    setHasMore(!!data.pagination?.hasMore);
    setLoading(false);
    setLoadingMore(false);
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchPage({ cursor: null, append: false });
  }, [fetchPage]);

  const loadMore = () => {
    if (!nextCursor || loadingMore || loading) return;
    fetchPage({ cursor: nextCursor, append: true });
  };

  return (
    <div className="space-y-6">
      {timelineBookingId && (
        <TimelineModal bookingId={timelineBookingId} onClose={() => setTimelineBookingId(null)} />
      )}

      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Global Transaction Escrows</h2>
        <p className="text-slate-500 text-xs">Live dispatch tracker, schedule audits, and order cancellations. Search by Booking ID to view the full event timeline.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by Booking ID, customer, provider..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-colors ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-3 px-5">Code ID</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Specialist</th>
                <th className="py-3 px-5">Schedule</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 italic">
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading bookings...</span>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-rose-600 font-semibold">{error}</td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 italic">No bookings match your filter.</td>
                </tr>
              )}
              {rows.map(bk => (
                <tr key={bk.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-5 font-mono font-bold text-slate-900 text-[11px]">{bk.id}</td>
                  <td className="py-4 px-5">
                    <span className="text-slate-950 block font-extrabold leading-tight">{bk.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{bk.customerPhone}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-slate-900 block font-extrabold leading-tight">{bk.providerName}</span>
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">{bk.serviceCategory}</span>
                  </td>
                  <td className="py-4 px-5">{bk.bookingDateLabel || bk.createdAt}</td>
                  <td className="py-4 px-5"><StatusBadge status={bk.status} /></td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setTimelineBookingId(bk.id)}
                        className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                      >
                        Timeline
                      </button>
                      {bk.status !== 'completed' && bk.status !== 'cancelled' && (
                        <button
                          onClick={() => onOverrideCancel(bk.id)}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings...
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-rose-600 font-semibold text-center py-8">{error}</p>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-8">No bookings match your filter.</p>
        )}
        {rows.map(bk => (
          <div key={bk.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-slate-900 text-xs">{bk.id}</span>
              <StatusBadge status={bk.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Customer</span>
                <span className="font-extrabold text-slate-900">{bk.customerName}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Specialist</span>
                <span className="font-extrabold text-slate-900">{bk.providerName}</span>
                <span className="block text-[10px] text-indigo-700 font-bold uppercase">{bk.serviceCategory}</span>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-600 font-semibold">
              {bk.bookingDateLabel || bk.createdAt}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setTimelineBookingId(bk.id)}
                className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
              >
                Timeline
              </button>
              {bk.status !== 'completed' && bk.status !== 'cancelled' && (
                <button
                  onClick={() => onOverrideCancel(bk.id)}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400 font-semibold">
          Showing {rows.length} of {total} booking{total === 1 ? '' : 's'}
        </p>
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore || loading}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-5 py-2.5 text-xs rounded-xl transition-colors"
          >
            {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Clock, Loader2, CalendarCheck, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { normalizeBooking } from '../../utils/normalizeCustomerData';

const PAGE_SIZE = 9;

const STATUS_BADGES = {
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  confirmed: { label: 'Dispatch set', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  ongoing: { label: 'In progress', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
};

// Admin filter buckets — Active (CONFIRMED + ONGOING) added after Pending.
const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', statuses: ['PENDING'] },
  { key: 'active', label: 'Active', statuses: ['CONFIRMED', 'ONGOING'] },
  { key: 'completed', label: 'Completed', statuses: ['COMPLETED'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
];

function StatusBadge({ status }) {
  const key = (status || '').toLowerCase();
  const meta = STATUS_BADGES[key] || ('' && {});
  if (!meta?.cls) return <span className="text-slate-400 text-[9px] uppercase font-bold">{status}</span>;
  return (
    <span className={`${meta.cls} inline-flex whitespace-nowrap border px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase`}>
      {meta.label}
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-4 px-5"><div className="h-2.5 w-24 rounded bg-slate-100" /></td>
          <td className="py-4 px-5"><div className="h-2.5 w-28 rounded bg-slate-100" /></td>
          <td className="py-4 px-5"><div className="h-2.5 w-24 rounded bg-slate-100" /></td>
          <td className="py-4 px-5"><div className="h-2.5 w-20 rounded bg-slate-100" /></td>
          <td className="py-4 px-5"><div className="h-4 w-16 rounded-full bg-slate-100" /></td>
          <td className="py-4 px-5"><div className="h-4 w-24 rounded bg-slate-100 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

function TimelineModal({ bookingId, bookingNumber, onClose }) {
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-overlay-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Booking Timeline</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{bookingNumber || '—'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors" aria-label="Close timeline">
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
  const [counts, setCounts] = useState({ PENDING: 0, CONFIRMED: 0, ONGOING: 0, COMPLETED: 0, CANCELLED: 0, TOTAL: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [timelineBooking, setTimelineBooking] = useState(null);

  // Debounce the search box so each keystroke does not fire a request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const currentStatuses = (STATUS_FILTERS.find((f) => f.key === statusFilter) || STATUS_FILTERS[0]).statuses;

  // Request sequencing: flipping tabs (Pending→Completed→Cancelled) faster than
  // the server responds must not let an older request for a previous filter
  // overwrite the rows of the currently selected filter. Only the latest
  // request is allowed to commit its result.
  const fetchSeqRef = useRef(0);

  const fetchPage = useCallback(async (targetPage = 1) => {
    const requestId = ++fetchSeqRef.current;
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(targetPage) });
    params.set('statuses', currentStatuses.join(','));
    if (debouncedSearch) params.set('adminSearch', debouncedSearch);

    setLoading(true);
    setError('');

    const res = await api.get(`/bookings?${params.toString()}`);
    if (!res.ok) {
      if (requestId !== fetchSeqRef.current) return;
      setError(res.data?.message || 'Failed to load bookings.');
      setRows([]);
      setLoading(false);
      return;
    }

    if (requestId !== fetchSeqRef.current) return;

    const data = res.data || {};
    const incoming = (data.bookings || []).map(normalizeBooking);
    setRows(incoming);
    if (data.counts) setCounts(data.counts);
    setPagination({
      page: Number(data.pagination?.page) || targetPage,
      limit: Number(data.pagination?.limit) || PAGE_SIZE,
      total: Number(data.pagination?.total) || incoming.length,
      pages: Number(data.pagination?.pages) || 1
    });
    setLoading(false);
  }, [statusFilter, debouncedSearch]);

  // The mount effect also reloads when the filter/search changes (fetchPage is
  // a new identity each time). Guard on the args so React StrictMode's dev
  // double-mount does not fire the same request twice, while a real
  // filter/search change (different key) still re-fetches.
  const lastFetchKeyRef = useRef('');
  useEffect(() => {
    const key = `${statusFilter}|${debouncedSearch}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    fetchPage(1);
  }, [fetchPage]);

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    fetchPage(nextPage);
  };

  const emptyTitle = pagination.total === 0 && !loading && !error
    ? 'No bookings yet'
    : 'Nothing in this view';
  const emptyHint = pagination.total === 0 && !loading && !error
    ? 'Bookings will appear here once customers start placing orders.'
    : `No ${statusFilter} bookings right now. Try a different filter.`;

  return (
    <div className="space-y-6">
      {timelineBooking && <TimelineModal bookingId={timelineBooking.id} bookingNumber={timelineBooking.number} onClose={() => setTimelineBooking(null)} />}

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Booking Management</h2>
          <p className="text-slate-500 text-xs mt-0.5">Track bookings, audit event timelines, and manage cancellations.</p>
        </div>
      </div>

      {/* Search + segmented filter */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by Booking No, customer, provider..."
            className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl w-full sm:w-fit">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-black transition-all ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <span className="flex flex-col items-center">
                  {f.label}
                  <span className="text-[9px] font-bold opacity-70 mt-0.5">
                    ({counts?.[f.statuses[0]] ?? 0})
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/70">
                <th className="py-3 px-5">Booking No</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Specialist</th>
                <th className="py-3 px-5">Schedule</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && <SkeletonRows />}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-rose-600 font-semibold">{error}</td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <p className="text-slate-900 text-sm font-extrabold">{emptyTitle}</p>
                      <p className="text-xs text-slate-500 font-medium">{emptyHint}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && rows.map(bk => (
                <tr key={bk.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-5 font-mono font-bold text-slate-900 text-[11px]">{bk.bookingNumber || '—'}</td>
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
                        onClick={() => setTimelineBooking({ id: bk.id, number: bk.bookingNumber })}
                        className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center gap-3 py-10 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-100" />
            <div className="h-2.5 w-32 rounded bg-slate-100" />
          </div>
        )}
        {!loading && error && (
          <p className="text-xs text-rose-600 font-semibold text-center py-8">{error}</p>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-14 px-6 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-slate-900 text-sm font-extrabold">{emptyTitle}</p>
            <p className="text-xs text-slate-500 font-medium max-w-xs">{emptyHint}</p>
          </div>
        )}
        {!loading && !error && rows.map(bk => (
          <div key={bk.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-slate-900 text-xs">{bk.bookingNumber || '—'}</span>
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
                onClick={() => setTimelineBooking({ id: bk.id, number: bk.bookingNumber })}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold px-3 py-1.5 text-[10px] rounded-lg transition-colors"
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
      {!loading && pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
          <span className="text-[11px] font-semibold text-slate-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} booking{pagination.total === 1 ? '' : 's'}
          </span>
          <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="px-2 text-[11px] font-extrabold text-slate-700 tabular-nums">
              Page {pagination.page} / {pagination.pages}
            </span>
            <button
              type="button"
              onClick={() => changePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
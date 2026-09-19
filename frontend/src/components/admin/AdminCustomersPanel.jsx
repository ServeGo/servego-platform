import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  FileSpreadsheet,
  Inbox
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { exportAllPages } from '../../utils/exportExcel';

const PAGE_SIZE = 9;

const CUSTOMER_EXPORT_COLUMNS = [
  { header: 'Customer Number', key: 'customerNumber' },
  { header: 'Name', key: 'name' },
  { header: 'Email', key: 'email' },
  { header: 'Phone', key: 'phone' },
  { header: 'Status', key: 'status' },
  { header: 'Address', key: 'address' },
  { header: 'Joined', key: 'joinedLabel' },
  { header: 'Last Updated', key: 'updatedLabel' },
];

const fmt = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  SUSPENDED: 'bg-amber-50 border-amber-200 text-amber-800',
  BLOCKED: 'bg-rose-50 border-rose-200 text-rose-800',
  PENDING: 'bg-slate-50 border-slate-200 text-slate-600',
};

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

// Avatar that shows the customer photo when present, and falls back to the
// initials block (like customer-side accounts) when there is no image or the
// image fails to load.
function CustomerAvatar({ name, src, className = 'w-12 h-12' }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    return (
      <div className={`${className} rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0`}>
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Customer'}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      className={`${className} rounded-xl object-cover border border-slate-200 shrink-0`}
    />
  );
}

export default function AdminCustomersPanel() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchReqId = useRef(0);

  const fetchData = useCallback(async (pageNo, limit, query) => {
    const requestId = ++fetchReqId.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ role: 'customer', page: String(pageNo), limit: String(limit) });
      if (query.trim()) q.set('search', query.trim());
      const res = await api.get(`/users?${q.toString()}`);
      if (requestId !== fetchReqId.current) return;
      if (res.ok) {
        setCustomers(res.data?.users || []);
        setTotal(res.data?.pagination?.total || 0);
        setTotalPages(res.data?.pagination?.pages || 0);
      } else {
        setCustomers([]);
      }
    } catch {
      if (requestId !== fetchReqId.current) return;
      setCustomers([]);
    } finally {
      if (requestId === fetchReqId.current) setLoading(false);
    }
  }, []);

  // Guard on the args so React StrictMode's dev double-mount does not fire the
  // same request twice, while a real page/search change (different key) still
  // re-fetches.
  const lastFetchKeyRef = useRef('');
  useEffect(() => {
    const key = `${page}|${search}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    fetchData(page, PAGE_SIZE, search);
  }, [fetchData, page, search]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const refresh = () => fetchData(page, PAGE_SIZE, search);

  const fetchAllCustomers = useCallback(async (pageNo, limit) => {
    const q = new URLSearchParams({ role: 'customer', page: String(pageNo), limit: String(limit) });
    if (search.trim()) q.set('search', search.trim());
    const res = await api.get(`/users?${q.toString()}`);
    if (!res.ok) return { rows: [], total: 0 };
    const rows = (res.data?.users || []).map((c) => ({
      id: c.id,
      customerNumber: c.customerNumber || null,
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      status: c.status || '',
      address: c.customerProfile?.address || c.address || '',
      joinedLabel: fmt(c.createdAt),
      updatedLabel: fmt(c.updatedAt),
    }));
    return { rows, total: res.data?.pagination?.total || 0 };
  }, [search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllPages({
        fetchPage: fetchAllCustomers,
        fileName: `customers-export-${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Customers',
        columns: CUSTOMER_EXPORT_COLUMNS,
      });
    } catch (err) {
      console.error('Customer export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) return;
    setPage(nextPage);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-slate-500 text-xs mt-0.5">Registered customers with full contact records, paginated for fast browsing.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search name, email, or phone..."
            className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-black text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-3/5" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Inbox className="w-7 h-7" />
          </div>
          <p className="text-slate-900 text-sm font-extrabold">
            {search.trim() ? 'No customers match your search' : 'No customers yet'}
          </p>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-xs">
            {search.trim()
              ? 'Try a different name, email, or phone number.'
              : 'Registered customers will appear here once they sign up.'}
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); }}
            className="mt-1 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {search.trim() ? 'Clear search' : 'Refresh'}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 flex flex-col shadow-2xs transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 items-center min-w-0">
                    <CustomerAvatar name={c.name} src={c.avatar} />
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate">{c.customerNumber || '—'}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black border whitespace-nowrap ${STATUS_STYLES[c.status] || STATUS_STYLES.ACTIVE}`}>
                    {c.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-600 grid grid-cols-2 gap-x-3 gap-y-2">
                  <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{c.phone || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase text-[9px] block">Address</span>
                    <span className="text-slate-800 font-black block whitespace-pre-wrap break-words">{c.customerProfile?.address || c.address || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 uppercase text-[9px] block">Joined</span>
                    <span className="text-slate-800 font-black block">{fmt(c.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            <span className="text-[11px] font-semibold text-slate-500">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} customer{total === 1 ? '' : 's'}
            </span>
            <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-2 text-[11px] font-extrabold text-slate-700 tabular-nums">
                Page {page} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages || totalPages === 0}
                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
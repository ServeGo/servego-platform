import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Mail,
  UserRound,
  ShieldCheck,
  XCircle,
  RefreshCw,
  Inbox,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../../../utils/apiClient';

const STATUS_BADGE = {
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
};

const STATUS_LABEL = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected'
};

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED'];

const ITEMS_PER_PAGE = 9;

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

function Avatar({ name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0">
      {initials(name)}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide whitespace-nowrap ${STATUS_BADGE[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {status === 'APPROVED' && <ShieldCheck className="w-3 h-3" />}
      {status === 'REJECTED' && <XCircle className="w-3 h-3" />}
      {STATUS_LABEL[status] || status || 'Unknown'}
    </span>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-slate-100" />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
            <div className="w-16 h-5 rounded-full bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
            <div className="space-y-2"><div className="h-2.5 bg-slate-100 rounded w-1/2" /><div className="h-3 bg-slate-100 rounded w-3/4" /></div>
            <div className="space-y-2"><div className="h-2.5 bg-slate-100 rounded w-1/2" /><div className="h-3 bg-slate-100 rounded w-3/4" /></div>
          </div>
          <div className="h-9 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="hidden md:block animate-pulse">
      <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-3 flex gap-8">
        {['Customer', 'Requested Service', 'Submitted', 'Location', 'Status', 'Assign / Action'].map((h) => (
          <div key={h} className="h-3 bg-slate-200 rounded w-24" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-6 py-5 border-b border-slate-100 flex items-center gap-8">
          <div className="flex items-center gap-3 w-52">
            <div className="w-10 h-10 rounded-full bg-slate-100" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded w-32" />
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-3 bg-slate-100 rounded w-32" />
          <div className="w-20 h-5 rounded-full bg-slate-100" />
          <div className="h-8 bg-slate-100 rounded-lg w-56" />
        </div>
      ))}
    </div>
  );
}

export default function AdminManualBookingRequestsTab({ providersList = [] }) {
  const [requests, setRequests] = useState([]);
  const [eligibleProviders, setEligibleProviders] = useState({});
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState({});

  const fetchReqId = useRef(0);

  const fetchRequests = useCallback(async (targetPage = 1, statusValue = 'PENDING') => {
    const requestId = ++fetchReqId.current;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ requestType: 'NO_PROVIDER', status: statusValue, page: String(targetPage), limit: String(ITEMS_PER_PAGE) });
      const res = await api.get(`/permanent-service-requests?${query.toString()}`);
      if (requestId !== fetchReqId.current) return;
      if (!res.ok) throw new Error(res.data?.message || 'Could not load manual booking requests.');
      setRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
      setPagination(res.data?.pagination || { page: targetPage, limit: ITEMS_PER_PAGE, total: 0, pages: 1 });
      setCounts(res.data?.counts?.byStatus || {});
    } catch (err) {
      if (requestId !== fetchReqId.current) return;
      setRequests([]);
      setError(err.message || 'Could not load manual booking requests.');
    } finally {
      if (requestId === fetchReqId.current) setLoading(false);
    }
  }, []);

  // Guard on the args so React StrictMode's dev double-mount does not fire the
  // same request twice, while a real page/status change (different key) still
  // re-fetches.
  const lastFetchKeyRef = useRef('');
  useEffect(() => {
    const key = `${page}|${status}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    fetchRequests(page, status);
  }, [fetchRequests, page, status]);

  // Fetch eligible providers ONLY for pending requests (only pending cards
  // render the assignment dropdown). Deduped by service name to avoid N+1.
  useEffect(() => {
    let cancelled = false;
    const pendingRequests = requests.filter((request) => request.status === 'PENDING');
    const serviceNames = [...new Set(
      pendingRequests
        .map((request) => String(request.serviceCategory || '').trim())
        .filter(Boolean)
    )];
    if (serviceNames.length === 0) {
      setEligibleProviders({});
      setLoadingProviders(false);
      return undefined;
    }
    setLoadingProviders(true);
    Promise.all(serviceNames.map(async (serviceName) => {
      try {
        const res = await api.get(`/admin/providers/by-approved-service?serviceName=${encodeURIComponent(serviceName)}`);
        return [serviceName.toLowerCase(), res.ok && Array.isArray(res.data) ? res.data : []];
      } catch {
        return [serviceName.toLowerCase(), []];
      }
    })).then((entries) => {
      if (!cancelled) {
        setEligibleProviders(Object.fromEntries(entries));
        setLoadingProviders(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setEligibleProviders({});
        setLoadingProviders(false);
      }
    });
    return () => { cancelled = true; };
  }, [requests]);

  const updateRequest = async (request, nextStatus) => {
    const providerId = assignments[request.id];
    if (nextStatus === 'APPROVED' && !providerId) return;
    setBusyId(request.id);
    setError('');
    try {
      const res = await api.patch(`/permanent-service-requests/${request.id}`, {
        status: nextStatus,
        assignedProviderId: nextStatus === 'APPROVED' ? providerId : null
      });
      if (!res.ok) throw new Error(res.data?.message || 'Could not update this request.');
      await fetchRequests(page, status);
    } catch (err) {
      setError(err.message || 'Could not update this request.');
    } finally {
      setBusyId(null);
    }
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    setPage(nextPage);
  };

  const filterTabs = STATUS_FILTERS.map((key) => ({
    key,
    label: STATUS_LABEL[key],
    count: counts[key] ?? 0
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Manual Booking Requests</h2>
          <p className="text-slate-500 text-xs mt-0.5">Customers whose service currently has no available provider.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchRequests(page, status)}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Segmented filter control */}
      <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start flex-wrap">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setStatus(t.key); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
              status === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            <span
              className={`min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-[9px] font-black tabular-nums ${
                status === t.key ? 'bg-slate-100 text-slate-500' : 'bg-white/80 text-slate-400'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-bold break-words">{error}</div>}

      {loading ? (
        <>
          <SkeletonCards />
          <SkeletonTable />
        </>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Inbox className="w-7 h-7" />
          </div>
          <p className="text-slate-900 text-sm font-extrabold">No {status.toLowerCase()} manual booking requests</p>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-xs">
            {status === 'PENDING'
              ? 'When a customer requests a service with no available provider, it will appear here for manual assignment.'
              : `No ${status.toLowerCase()} manual booking requests right now.`}
          </p>
          <button
            type="button"
            onClick={() => fetchRequests(1, status)}
            className="mt-1 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/70">
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6">Requested Service</th>
                    <th className="py-3 px-6">Submitted</th>
                    <th className="py-3 px-6">Location</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6">Assign / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requests.map((request) => {
                    const busy = busyId === request.id;
                    const serviceKey = String(request.serviceCategory || '').trim().toLowerCase();
                    const requestProviders = eligibleProviders[serviceKey] || [];
                    const pending = request.status === 'PENDING';
                    const customerName = request.customer?.name || 'Customer';
                    return (
                      <tr key={request.id} className={`transition-colors ${busy ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar name={customerName} />
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 truncate max-w-[160px]">{customerName}</div>
                              <div className="text-[10px] text-slate-400 font-semibold truncate max-w-[160px]">{request.customer?.phone || request.customer?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-extrabold text-slate-900">{request.serviceCategory || 'Service request'}</div>
                          {request.additionalInfo && (
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[220px] leading-snug line-clamp-2" title={request.additionalInfo}>
                              {request.additionalInfo}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-400" /> {formatDateTime(request.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-6 max-w-[200px]">
                          <div className="font-semibold text-slate-700 truncate" title={request.locationAddress || ''}>{request.locationAddress || '—'}</div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <StatusBadge status={request.status} />
                        </td>
                        <td className="py-4 px-6">
                          {pending ? (
                            <div className="flex flex-col gap-2 min-w-[220px]">
                              <select
                                value={assignments[request.id] || ''}
                                onChange={(e) => setAssignments((current) => ({ ...current, [request.id]: e.target.value }))}
                                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                                disabled={loadingProviders}
                              >
                                <option value="">{loadingProviders ? 'Loading providers...' : 'Select provider...'}</option>
                                {requestProviders.map((provider) => {
                                  const label = provider.name || provider.providerNumber || 'Unknown';
                                  const ineligible = provider.eligible === false;
                                  return (
                                    <option key={provider.id} value={provider.id}>
                                      {ineligible ? `${label} — ${provider.statusLabel || 'Not eligible'}` : label}
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateRequest(request, 'APPROVED')}
                                  disabled={busy || !assignments[request.id] || requestProviders.length === 0 || loadingProviders}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-[10px] shadow-2xs disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                                >
                                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Assign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateRequest(request, 'REJECTED')}
                                  disabled={busy}
                                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-2 rounded-lg text-[10px] disabled:bg-rose-100 disabled:text-rose-300 disabled:border-rose-200 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                                >
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                              </div>
                              {requestProviders.length === 0 && !loadingProviders && (
                                <p className="text-[9px] font-semibold text-amber-700">No provider is approved for this service yet.</p>
                              )}
                              {!loadingProviders && requestProviders.length > 0 && requestProviders.every((provider) => provider.eligible === false) && (
                                <p className="text-[9px] font-semibold text-amber-700">Statuses are shown for reference — you can assign any provider listed.</p>
                              )}
                            </div>
                          ) : request.status === 'APPROVED' ? (
                            <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              {request.assignedProvider?.user?.name || 'Provider assigned'}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-semibold">Request rejected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {requests.map((request) => {
              const busy = busyId === request.id;
              const serviceKey = String(request.serviceCategory || '').trim().toLowerCase();
              const requestProviders = eligibleProviders[serviceKey] || [];
              const pending = request.status === 'PENDING';
              return (
                <div key={request.id} className={`bg-white rounded-2xl border border-slate-200 shadow-2xs transition-all ${busy ? 'opacity-70' : 'hover:shadow-md hover:border-indigo-200'}`}>
                  <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Requested service</p>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 break-words">{request.serviceCategory || 'Service request'}</h3>
                      <p className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3" /> Submitted {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px]">
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-400"><UserRound className="w-3 h-3" /> Customer</span>
                        <p className="font-extrabold text-slate-800 mt-1 truncate">{request.customer?.name || '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-400"><Mail className="w-3 h-3" /> Email</span>
                        <p className="font-semibold text-slate-700 mt-1 break-all">{request.customer?.email || '—'}</p>
                      </div>
                      <div>
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-400"><Phone className="w-3 h-3" /> Phone</span>
                        <p className="font-semibold text-slate-700 mt-1">{request.customer?.phone || '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-slate-400"><MapPin className="w-3 h-3" /> Location</span>
                        <p className="font-semibold text-slate-700 mt-1 break-words">{request.locationAddress || '—'}</p>
                      </div>
                    </div>

                    {request.additionalInfo && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap break-words">{request.additionalInfo}</p>
                    )}
                    {request.status === 'APPROVED' && request.assignedProvider && (
                      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">Assigned to {request.assignedProvider.user?.name || 'provider'}</p>
                    )}
                    {request.status === 'REJECTED' && (
                      <p className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">Request rejected</p>
                    )}

                    {pending && (
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-wide text-slate-400" htmlFor={`mbr-provider-${request.id}`}>Assign provider</label>
                        <select
                          id={`mbr-provider-${request.id}`}
                          value={assignments[request.id] || ''}
                          onChange={(e) => setAssignments((current) => ({ ...current, [request.id]: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50"
                          disabled={loadingProviders}
                        >
                          <option value="">{loadingProviders ? 'Loading providers...' : 'Select provider...'}</option>
                          {requestProviders.map((provider) => {
                            const label = provider.name || provider.providerNumber || 'Unknown';
                            const ineligible = provider.eligible === false;
                            return (
                              <option key={provider.id} value={provider.id}>
                                {ineligible ? `${label} — ${provider.statusLabel || 'Not eligible'}` : label}
                              </option>
                            );
                          })}
                        </select>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => updateRequest(request, 'APPROVED')}
                            disabled={busy || !assignments[request.id] || requestProviders.length === 0 || loadingProviders}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 text-[11px] font-extrabold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Assign
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRequest(request, 'REJECTED')}
                            disabled={busy}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 text-[11px] font-extrabold disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                        {requestProviders.length === 0 && !loadingProviders && (
                          <p className="text-[10px] font-semibold text-amber-700">No provider is approved for this service yet.</p>
                        )}
                        {!loadingProviders && requestProviders.length > 0 && requestProviders.every((provider) => provider.eligible === false) && (
                          <p className="text-[10px] font-semibold text-amber-700">Statuses are shown for reference — you can assign any provider listed.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <span className="text-[11px] font-semibold text-slate-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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
        </>
      )}
    </div>
  );
}
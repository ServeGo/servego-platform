import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  CircuitBoard,
  CalendarDays,
  IndianRupee,
  MapPin,
  UserRound,
  RefreshCw,
  Inbox,
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

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED'];
const TYPE_FILTERS = ['PERMANENT', 'CUSTOM'];

const ITEMS_PER_PAGE = 9;

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

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

function TypeTag({ isCustom, engagementType }) {
  const label = isCustom ? 'Custom' : engagementType === 'CONTRACT' ? 'Contract' : 'Permanent';
  const cls = isCustom
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-teal-50 text-teal-700 border-teal-200';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-[9px] font-extrabold uppercase ${cls}`}>
      {isCustom && <CircuitBoard className="w-3 h-3" />}
      {label}
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
        {['Customer', 'Service', 'Location', 'Type', 'Details', 'Status', 'Assign / Action'].map((h) => (
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
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-3 bg-slate-100 rounded w-32" />
          <div className="h-5 w-20 rounded bg-slate-100" />
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="w-20 h-5 rounded-full bg-slate-100" />
          <div className="h-8 bg-slate-100 rounded-lg w-52" />
        </div>
      ))}
    </div>
  );
}

export default function AdminPermanentServicesTab({ providersList }) {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('PERMANENT');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [note, setNote] = useState('');
  const [counts, setCounts] = useState({ byStatus: {}, byType: {} });

  const fetchReqId = useRef(0);

  const providers = Array.isArray(providersList) ? providersList : [];

  const fetchRequests = useCallback(async (targetPage = 1, status = 'PENDING', reqType = 'PERMANENT') => {
    const requestId = ++fetchReqId.current;
    setLoading(true);
    const query = new URLSearchParams({ page: String(targetPage), limit: String(ITEMS_PER_PAGE) });
    query.set('status', status);
    query.set('requestType', reqType);
    try {
      const res = await api.get(`/permanent-service-requests?${query.toString()}`);
      if (requestId !== fetchReqId.current) return;
      if (res.ok && res.data) {
        setRequests(Array.isArray(res.data.requests) ? res.data.requests : []);
        setPagination(res.data.pagination || { page: targetPage, limit: ITEMS_PER_PAGE, total: 0, pages: 1 });
        setCounts(res.data.counts || { byStatus: {}, byType: {} });
      } else {
        setRequests([]);
        setPagination({ page: targetPage, limit: ITEMS_PER_PAGE, total: 0, pages: 1 });
        setCounts({ byStatus: {}, byType: {} });
      }
    } catch (err) {
      if (requestId !== fetchReqId.current) return;
      setRequests([]);
      setPagination({ page: targetPage, limit: ITEMS_PER_PAGE, total: 0, pages: 1 });
      setCounts({ byStatus: {}, byType: {} });
      console.error('Failed to fetch service requests:', err);
    } finally {
      if (requestId === fetchReqId.current) setLoading(false);
    }
  }, []);

  // Guard on the args so React StrictMode's dev double-mount does not fire the
  // same request twice, while a real page/filter change (different key) still
  // re-fetches.
  const lastFetchKeyRef = useRef('');
  useEffect(() => {
    const key = `${page}|${filter}|${typeFilter}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    fetchRequests(page, filter, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRequests, page, filter, typeFilter]);

  const changeFilter = (name) => {
    setFilter(name);
    setPage(1);
  };

  const changeTypeFilter = (name) => {
    setTypeFilter(name);
    setPage(1);
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    setPage(nextPage);
  };

  const handleApprove = async (request) => {
    const providerId = assignments[request.id];
    if (!providerId) return;
    if (processingId) return;
    setProcessingId(request.id);
    setProcessingAction('approve');
    const res = await api.patch(`/permanent-service-requests/${request.id}`, {
      status: 'APPROVED',
      assignedProviderId: providerId,
      adminNote: note.trim() || null
    });
    setProcessingId(null);
    setProcessingAction(null);
    if (res.ok) {
      setNote('');
      fetchRequests(page, filter, typeFilter);
    } else {
      window.alert(res.data?.message || res.data?.error || 'Could not approve the request.');
    }
  };

  const handleReject = async (request) => {
    if (processingId) return;
    const reason = window.prompt('Rejection note for the customer:');
    if (!reason || !reason.trim()) return;
    setProcessingId(request.id);
    setProcessingAction('reject');
    const res = await api.patch(`/permanent-service-requests/${request.id}`, {
      status: 'REJECTED',
      assignedProviderId: null,
      adminNote: reason.trim()
    });
    setProcessingId(null);
    setProcessingAction(null);
    if (res.ok) {
      fetchRequests(page, filter, typeFilter);
    } else {
      window.alert(res.data?.message || res.data?.error || 'Could not reject the request.');
    }
  };

  const statusFilterTabs = FILTERS.map((key) => ({
    key,
    label: STATUS_LABEL[key],
    count: counts.byStatus[key] ?? 0
  }));

  const typeFilterTabs = TYPE_FILTERS.map((key) => ({
    key,
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    count: counts.byType[key] ?? 0
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Service Requests</h2>
          <p className="text-slate-500 text-xs mt-0.5">Permanent/contract and custom service requests from customers. Assign a specialist to approve.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchRequests(page, filter, typeFilter)}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Segmented filter controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start flex-wrap">
          {statusFilterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => changeFilter(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                filter === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              <span
                className={`min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-[9px] font-black tabular-nums ${
                  filter === t.key ? 'bg-slate-100 text-slate-500' : 'bg-white/80 text-slate-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start flex-wrap">
          {typeFilterTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTypeFilter(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
                typeFilter === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              <span
                className={`min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-[9px] font-black tabular-nums ${
                  typeFilter === t.key ? 'bg-slate-100 text-slate-500' : 'bg-white/80 text-slate-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

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
          <p className="text-slate-900 text-sm font-extrabold">
            No {filter.toLowerCase()} {typeFilter.toLowerCase()} requests
          </p>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-xs">
            {filter === 'PENDING'
              ? 'When a customer submits a service request it will appear here for assignment.'
              : `No ${filter.toLowerCase()} requests in the ${typeFilter.toLowerCase()} category right now.`}
          </p>
          <button
            type="button"
            onClick={() => fetchRequests(1, filter, typeFilter)}
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
                    <th className="py-3 px-6">Service</th>
                    <th className="py-3 px-6">Location</th>
                    <th className="py-3 px-6">Type</th>
                    <th className="py-3 px-6">Details</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6">Assign / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requests.map((r) => {
                    const isBusy = processingId === r.id;
                    const isApproving = isBusy && processingAction === 'approve';
                    const isRejecting = isBusy && processingAction === 'reject';
                    const isCustom = r.requestType === 'CUSTOM';
                    const customerName = r.customer?.name || 'Customer';
                    return (
                      <tr key={r.id} className={`transition-colors ${isBusy ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar name={customerName} />
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 truncate max-w-[160px]">{customerName}</div>
                              <div className="text-[10px] text-slate-400 font-semibold truncate max-w-[160px]">{r.customer?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {isCustom && <CircuitBoard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                            <span className="capitalize">{isCustom ? r.customServiceName || r.serviceCategory : r.serviceCategory}</span>
                          </div>
                          {isCustom && r.customDescription && (
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5 max-w-[220px] leading-snug line-clamp-2" title={r.customDescription}>
                              {r.customDescription}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 max-w-[180px]">
                          <div className="font-semibold text-slate-700 truncate" title={r.locationAddress || ''}>{r.locationAddress || '—'}</div>
                          {!isCustom && r.serviceLatitude != null && (
                            <div className="text-[9px] text-slate-400 font-mono font-semibold">
                              {Number(r.serviceLatitude).toFixed(5)}, {Number(r.serviceLongitude).toFixed(5)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <TypeTag isCustom={isCustom} engagementType={r.engagementType} />
                          {!isCustom && <div className="text-[10px] text-slate-400 font-semibold mt-1">{durationText(r)}</div>}
                        </td>
                        <td className="py-4 px-6">
                          {isCustom ? (
                            <span className="text-slate-400 text-[10px] font-semibold">Name + description</span>
                          ) : (
                            <>
                              <div className="text-[10px] font-semibold text-slate-500">Start {formatDate(r.startDate)}</div>
                              <div className="font-bold text-slate-900">{formatMoney(r.monthlyBudget)}/mo</div>
                            </>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <StatusBadge status={r.status} />
                          {r.status === 'REJECTED' && r.adminNote && (
                            <div className="text-[9px] text-rose-500 font-semibold mt-1 max-w-[140px]">{r.adminNote}</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {r.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={assignments[r.id] || ''}
                                onChange={(e) => setAssignments((a) => ({ ...a, [r.id]: e.target.value }))}
                                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500 max-w-[160px]"
                              >
                                <option value="">Select specialist...</option>
                                {providers.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name || p.user?.name || p.providerNumber || 'Unnamed provider'}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleApprove(r)}
                                disabled={!assignments[r.id] || isBusy}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-[10px] shadow-2xs disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                              >
                                {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                {isApproving ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(r)}
                                disabled={isBusy}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-2 rounded-lg text-[10px] disabled:bg-rose-100 disabled:text-rose-300 disabled:border-rose-200 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                              >
                                {isRejecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                {isRejecting ? 'Rejecting...' : 'Reject'}
                              </button>
                            </div>
                          ) : r.status === 'APPROVED' ? (
                            <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              {r.assignedProvider?.user?.name || 'Specialist assigned'}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-semibold">—</span>
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
            {requests.map((r) => {
              const isBusy = processingId === r.id;
              const isApproving = isBusy && processingAction === 'approve';
              const isRejecting = isBusy && processingAction === 'reject';
              const isCustom = r.requestType === 'CUSTOM';
              const serviceName = isCustom ? r.customServiceName || r.serviceCategory : r.serviceCategory;
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border border-slate-200 shadow-2xs transition-all ${isBusy ? 'opacity-70' : 'hover:shadow-md hover:border-indigo-200'}`}
                >
                  <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        {isCustom && <CircuitBoard className="h-3.5 w-3.5 text-indigo-500" />}
                        {isCustom ? 'Custom request' : r.engagementType === 'CONTRACT' ? 'Contract hire' : 'Permanent hire'}
                      </div>
                      <h3 className="mt-1 truncate text-sm font-extrabold text-slate-900">{serviceName || 'Service request'}</h3>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px]">
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><UserRound className="h-3 w-3" /> Customer</span>
                        <p className="mt-1 truncate font-extrabold text-slate-800">{r.customer?.name || 'Customer'}</p>
                        <p className="truncate text-[10px] text-slate-500">{r.customer?.phone || r.customer?.email || 'No contact details'}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><MapPin className="h-3 w-3" /> Location</span>
                        <p className="mt-1 truncate font-bold text-slate-800">{r.locationAddress || 'Address not provided'}</p>
                      </div>
                      {!isCustom && <>
                        <div>
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><CalendarDays className="h-3 w-3" /> Starts</span>
                          <p className="mt-1 font-bold text-slate-800">{formatDate(r.startDate)}</p>
                        </div>
                        <div>
                          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><IndianRupee className="h-3 w-3" /> Budget</span>
                          <p className="mt-1 font-bold text-slate-800">{formatMoney(r.monthlyBudget)}/mo</p>
                          <p className="text-[9px] text-slate-500">{durationText(r)}</p>
                        </div>
                      </>}
                    </div>

                    {isCustom && r.customDescription && <p className="line-clamp-3 text-[11px] font-medium leading-relaxed text-slate-600">{r.customDescription}</p>}
                    {r.status === 'APPROVED' && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">Assigned to {r.assignedProvider?.user?.name || 'specialist'}</p>}
                    {r.status === 'REJECTED' && r.adminNote && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">Reason: {r.adminNote}</p>}

                    {r.status === 'PENDING' && (
                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-wide text-slate-400" htmlFor={`provider-${r.id}`}>Assign specialist</label>
                        <select
                          id={`provider-${r.id}`}
                          value={assignments[r.id] || ''}
                          onChange={(e) => setAssignments((a) => ({ ...a, [r.id]: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                        >
                          <option value="">Select specialist...</option>
                          {providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.user?.name || p.providerNumber || 'Unnamed provider'}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleApprove(r)}
                            disabled={!assignments[r.id] || isBusy}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:bg-emerald-300 transition-colors"
                          >
                            {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{isApproving ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(r)}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          >
                            {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}{isRejecting ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
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
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} request{pagination.total === 1 ? '' : 's'}
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

function durationText(r) {
  if (r.engagementType === 'CONTRACT') {
    if (r.contractDurationYears) return `${r.contractDurationYears} yr${r.contractDurationYears > 1 ? 's' : ''}`;
    if (r.contractDurationDays) return `${r.contractDurationDays} day${r.contractDurationDays > 1 ? 's' : ''}`;
    return '—';
  }
  return 'Ongoing';
}
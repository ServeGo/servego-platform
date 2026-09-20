import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Inbox, Briefcase, ShieldCheck, XCircle } from 'lucide-react';

import { useData, useUI } from '../context/AppContext';

function decodeHtmlEntities(str) {
  if (!str) return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

const STATUS_BADGE = {
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  DENIED: 'bg-rose-50 text-rose-700 border-rose-200'
};

const STATUS_LABEL = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  DENIED: 'Denied'
};

const ITEMS_PER_PAGE = 9;

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide whitespace-nowrap ${STATUS_BADGE[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {status === 'APPROVED' && <ShieldCheck className="w-3 h-3" />}
      {status === 'DENIED' && <XCircle className="w-3 h-3" />}
      {STATUS_LABEL[status] || status || 'Unknown'}
    </span>
  );
}

function Avatar({ name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0">
      {initials(name)}
    </div>
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
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-9 bg-slate-100 rounded-lg flex-1" />
            <div className="h-9 bg-slate-100 rounded-lg flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="hidden md:block animate-pulse">
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-3 flex gap-8">
        {['Provider', 'Service Name', 'Experience', 'Status', 'Description', 'Action'].map((h) => (
          <div key={h} className="h-3 bg-slate-200 rounded w-24" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-6 py-5 border-b border-slate-100 flex items-center gap-8">
          <div className="flex items-center gap-3 w-64">
            <div className="w-10 h-10 rounded-full bg-slate-100" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded w-28" />
          <div className="h-3 bg-slate-100 rounded w-16" />
          <div className="w-20 h-5 rounded-full bg-slate-100" />
          <div className="h-3 bg-slate-100 rounded flex-1" />
          <div className="h-8 bg-slate-100 rounded-lg w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AdminOtherServicesRequestsPanel() {
  const {
    providerServiceItems,
    providerServiceItemsPagination,
    providerServiceItemsCounts,
    fetchProviderServiceItems,
    approveProviderServiceRequest,
    denyProviderServiceRequest
  } = useData();
  const { runWithActionSpinner } = useUI();

  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(providerServiceItemsPagination.page || 1);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const allItems = Array.isArray(providerServiceItems) ? providerServiceItems : [];
  const { total = allItems.length, pages = 1 } = providerServiceItemsPagination;
  const safePage = Math.min(page, Math.max(1, pages));
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + allItems.length, total);
  const hasMultiplePages = total > ITEMS_PER_PAGE;

  const counts = providerServiceItemsCounts || {};
  const filterTabs = [
    { key: 'PENDING', label: 'Pending', count: counts.PENDING ?? 0 },
    { key: 'APPROVED', label: 'Approved', count: counts.APPROVED ?? 0 },
    { key: 'DENIED', label: 'Denied', count: counts.DENIED ?? 0 },
  ];

  // Load the first page on mount using the panel's page size, so the view is
  // always consistent with ITEMS_PER_PAGE (the shared context may load at a
  // different limit when another consumer touches the same state).
  // Guard so React StrictMode's dev double-mount does not fire the same mount
  // request twice (real re-mounts get a fresh ref).
  const mountedOnceRef = useRef(false);
  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;
    loadNow(1, 'PENDING');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNow = async (targetPage = safePage, status = statusFilter) => {
    setLoading(true);
    try {
      await fetchProviderServiceItems({ page: targetPage, limit: ITEMS_PER_PAGE, status });
    } finally {
      setLoading(false);
    }
  };

  const changeStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
    loadNow(1, status);
  };

  const goToPage = (targetPage) => {
    if (targetPage < 1 || (pages > 0 && targetPage > pages)) return;
    setPage(targetPage);
    loadNow(targetPage, statusFilter);
  };

  const handleApprove = async (item) => {
    if (processingId) return;
    setProcessingId(item.id);
    setProcessingAction('approve');
    try {
      await runWithActionSpinner(
        () => approveProviderServiceRequest(item.id),
        { message: 'Approving service request...' }
      );
      loadNow(safePage, statusFilter);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleDeny = async (item) => {
    if (processingId) return;
    const reason = window.prompt('Reason for denial?');
    if (!reason || !reason.trim()) return;

    setProcessingId(item.id);
    setProcessingAction('deny');
    try {
      await runWithActionSpinner(
        () => denyProviderServiceRequest(item.id, reason.trim()),
        { message: 'Denying service request...' }
      );
      loadNow(safePage, statusFilter);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Service Approvals</h2>
          <p className="text-slate-500 text-xs mt-0.5">Review provider requests before they can offer a new service.</p>
        </div>
        <button
          type="button"
          onClick={() => loadNow(safePage, statusFilter)}
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
            key={t.key || 'all'}
            type="button"
            onClick={() => changeStatusFilter(t.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${
              statusFilter === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            <span
              className={`min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-[9px] font-black tabular-nums ${
                statusFilter === t.key ? 'bg-slate-100 text-slate-500' : 'bg-white/80 text-slate-400'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <>
          <SkeletonCards />
          <SkeletonTable />
        </>
      ) : allItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Inbox className="w-7 h-7" />
          </div>
          <p className="text-slate-900 text-sm font-extrabold">
            No {statusFilter ? statusFilter.toLowerCase() : ''} service requests yet
          </p>
          <p className="text-slate-500 text-xs font-medium mt-1 max-w-xs">
            {statusFilter
              ? `There are no ${statusFilter.toLowerCase()} requests right now.`
              : 'When providers submit a new service for approval, it will appear here as Pending.'}
          </p>
          <button
            type="button"
            onClick={() => loadNow(1, statusFilter)}
            className="mt-1 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/70">
                  <th className="py-3 px-6">Provider</th>
                  <th className="py-3 px-6">Service Name</th>
                  <th className="py-3 px-6">Experience</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allItems.map((r) => {
                  const isRowBusy = processingId === r.id;
                  const isApproving = isRowBusy && processingAction === 'approve';
                  const isDenying = isRowBusy && processingAction === 'deny';
                  const providerName = r.provider?.user?.name || r.provider?.user?.email || 'Unknown';
                  return (
                    <tr key={r.id} className={`transition-colors ${isRowBusy ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar name={providerName} />
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate max-w-[180px]">{providerName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold font-mono truncate max-w-[180px]">
                              {r.provider?.providerNumber || r.provider?.user?.email || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-slate-900">{r.name}</td>
                      <td className="py-4 px-6 text-slate-700">{r.experienceYears != null ? `${r.experienceYears} yrs` : '—'}</td>
                      <td className="py-4 px-6 text-center"><StatusBadge status={r.approvalStatus} /></td>
                      <td className="py-4 px-6 text-slate-700 max-w-[260px] whitespace-pre-wrap">{decodeHtmlEntities(r.description) || '—'}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(r)}
                            disabled={r.approvalStatus !== 'PENDING' || isRowBusy}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-lg text-[10px] shadow-2xs disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                          >
                            {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            {isApproving ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeny(r)}
                            disabled={r.approvalStatus !== 'PENDING' || isRowBusy}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3.5 py-2 rounded-lg text-[10px] disabled:bg-rose-100 disabled:text-rose-300 disabled:border-rose-200 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                          >
                            {isDenying ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            {isDenying ? 'Denying...' : 'Deny'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list — tap-friendly, no horizontal scroll */}
          <div className="md:hidden space-y-3">
            {allItems.map((r) => {
              const isRowBusy = processingId === r.id;
              const isApproving = isRowBusy && processingAction === 'approve';
              const isDenying = isRowBusy && processingAction === 'deny';
              const isPending = r.approvalStatus === 'PENDING';
              const providerName = r.provider?.user?.name || r.provider?.user?.email || 'Unknown';
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border border-slate-200 shadow-2xs transition-all ${isRowBusy ? 'opacity-70' : 'hover:shadow-md hover:border-indigo-200'}`}
                >
                  <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={providerName} />
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 truncate max-w-[150px]">{providerName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold font-mono truncate">
                          {r.provider?.providerNumber || r.provider?.user?.email || ''}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={r.approvalStatus} />
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Service</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5 break-words">{r.name}</p>
                      </div>
                      {r.experienceYears != null && (
                        <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {r.experienceYears} yrs
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap break-words">
                      {decodeHtmlEntities(r.description) || '—'}
                    </p>

                    {isPending ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(r)}
                          disabled={isRowBusy}
                          className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2.5 rounded-xl text-[11px] shadow-2xs disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
                        >
                          {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          {isApproving ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeny(r)}
                          disabled={isRowBusy}
                          className="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-2.5 rounded-xl text-[11px] disabled:bg-rose-100 disabled:text-rose-300 disabled:border-rose-200 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDenying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          {isDenying ? 'Denying...' : 'Deny'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold italic pt-0.5">
                        <Briefcase className="w-3 h-3" /> This request is already resolved.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMultiplePages && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <span className="text-[11px] font-semibold text-slate-500">
                Showing {startIndex + 1}–{endIndex} of {total}
              </span>
              <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-3 py-2 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="px-2 text-[11px] font-extrabold text-slate-700 tabular-nums">
                  Page {safePage} / {pages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= pages}
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
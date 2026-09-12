import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { useData, useUI } from '../context/AppContext';

function decodeHtmlEntities(str) {
  if (!str) return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

export default function AdminOtherServicesRequestsPanel() {
  const {
    providerServiceItems,
    fetchProviderServiceItems,
    approveProviderServiceRequest,
    denyProviderServiceRequest
  } = useData();
  const { runWithActionSpinner } = useUI();

  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const allItems = Array.isArray(providerServiceItems) ? providerServiceItems : [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = allItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allItems.length);

  const loadNow = async () => {
    setLoading(true);
    try {
      await fetchProviderServiceItems();
    } finally {
      setLoading(false);
    }
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
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === 'APPROVED') {
      return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Approved</span>;
    }
    if (status === 'PENDING') {
      return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Pending</span>;
    }
    if (status === 'DENIED') {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Denied</span>;
    }
    return <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">Unknown</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base sm:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap truncate">Provider Service Approvals</h2>
        <button
          type="button"
          onClick={loadNow}
          disabled={loading}
          className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs disabled:bg-slate-700"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {allItems.length === 0 ? (

          <div className="p-12 text-center">
            <p className="text-slate-400 italic text-xs font-semibold">No pending service requests.</p>
            <p className="text-slate-500 text-[10px] mt-2">If you expected requests, refresh or check backend logs.</p>
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-6">Request ID</th>
                  <th className="py-3 px-6">Provider</th>
                  <th className="py-3 px-6">Service Name</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6">Experience</th>
                  <th className="py-3 px-6">Description</th>

                  <th className="py-3 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700">
                {pageItems.map((r) => {
                  const isRowBusy = processingId === r.id;
                  const isApproving = isRowBusy && processingAction === 'approve';
                  const isDenying = isRowBusy && processingAction === 'deny';
                  return (
                  <tr key={r.id} className={`transition-colors ${isRowBusy ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-900">
                        {r.provider?.user?.name || r.provider?.user?.email || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{r.provider?.user?.email || ''}</div>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-900">{r.name}</td>
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(r.approvalStatus)}
                    </td>
                    <td className="py-4 px-6 text-slate-700">{r.experienceYears != null ? `${r.experienceYears} Years` : '-'}</td>

                    <td className="py-4 px-6 text-slate-700 max-w-[260px] whitespace-pre-wrap">{decodeHtmlEntities(r.description) || '-'}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(r)}
                          disabled={r.approvalStatus !== 'PENDING' || isRowBusy}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-[10px] shadow-2xs disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        >
                          {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {isApproving ? 'Approving...' : 'Approve'}
                        </button>


                        <button
                          type="button"
                          onClick={() => handleDeny(r)}
                          disabled={r.approvalStatus !== 'PENDING' || isRowBusy}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-2 rounded-lg text-[10px] disabled:bg-rose-100 disabled:text-rose-300 disabled:border-rose-200 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        >
                          {isDenying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
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

          {/* Mobile card list — no horizontal scroll needed on phones */}
          <div className="md:hidden space-y-3 p-3">
            {pageItems.map((r) => {
              const isRowBusy = processingId === r.id;
              const isApproving = isRowBusy && processingAction === 'approve';
              const isDenying = isRowBusy && processingAction === 'deny';
              const isPending = r.approvalStatus === 'PENDING';
              return (
                <div
                  key={r.id}
                  className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 transition-colors ${isRowBusy ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {r.provider?.user?.name || r.provider?.user?.email || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold truncate">{r.provider?.user?.email || ''}</div>
                    </div>
                    {renderStatusBadge(r.approvalStatus)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-slate-900">{r.name}</span>
                      {r.experienceYears != null && (
                        <span className="text-[10px] font-bold text-slate-500">{r.experienceYears} yrs</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-400 break-all">{r.id}</div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {decodeHtmlEntities(r.description) || '-'}
                  </p>

                  <div className="pt-1 flex items-center justify-end gap-2 flex-wrap">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(r)}
                          disabled={isRowBusy}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-[10px] shadow-2xs disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        >
                          {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {isApproving ? 'Approving...' : 'Approve'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeny(r)}
                          disabled={isRowBusy}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-2 rounded-lg text-[10px] disabled:bg-rose-100 disabled:text-rose-300 disabled:border-rose-200 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                        >
                          {isDenying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {isDenying ? 'Denying...' : 'Deny'}
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold italic">This request is already resolved.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-3 px-3 md:px-6">
              <span className="text-[11px] font-semibold text-slate-500">
                Showing {startIndex + 1}–{endIndex} of {allItems.length}
              </span>
              <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                <span className="px-2 text-[11px] font-extrabold text-slate-700 tabular-nums">
                  Page {safePage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-[11px] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}

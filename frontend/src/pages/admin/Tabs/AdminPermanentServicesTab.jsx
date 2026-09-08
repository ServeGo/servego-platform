import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Briefcase, CheckCircle2, XCircle, CircuitBoard } from 'lucide-react';
import { api } from '../../../utils/apiClient';

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200'
};

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const TYPE_FILTERS = ['ALL', 'PERMANENT', 'CUSTOM'];

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const durationText = (r) => {
  if (r.engagementType === 'CONTRACT') {
    if (r.contractDurationYears) return `${r.contractDurationYears} yr${r.contractDurationYears > 1 ? 's' : ''}`;
    if (r.contractDurationDays) return `${r.contractDurationDays} day${r.contractDurationDays > 1 ? 's' : ''}`;
    return '—';
  }
  return 'Ongoing';
};

export default function AdminPermanentServicesTab({ providersList }) {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [filter, setFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [note, setNote] = useState('');

  const providers = Array.isArray(providersList) ? providersList : [];

  const fetchRequests = useCallback(async (page = 1, status = 'ALL', reqType = 'ALL') => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: '15' });
    if (status && status !== 'ALL') query.set('status', status);
    if (reqType && reqType !== 'ALL') query.set('requestType', reqType);
    const res = await api.get(`/permanent-service-requests?${query.toString()}`);
    if (res.ok && res.data) {
      setRequests(Array.isArray(res.data.requests) ? res.data.requests : []);
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } else {
      setRequests([]);
      setPagination({ page: 1, limit: 15, total: 0, pages: 1 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests(pagination.page, filter, typeFilter);
  }, [fetchRequests, filter, typeFilter]);

  const changePage = (page) => {
    if (page < 1 || page > pagination.pages) return;
    fetchRequests(page, filter, typeFilter);
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
      fetchRequests(pagination.page, filter, typeFilter);
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
      fetchRequests(pagination.page, filter, typeFilter);
    } else {
      window.alert(res.data?.message || res.data?.error || 'Could not reject the request.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Service Requests</h2>
          <p className="text-slate-500 text-xs">
            Permanent/contract and custom service requests from customers. Assign a specialist to approve.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRequests(pagination.page, filter, typeFilter)}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs disabled:bg-slate-700"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex flex-wrap gap-1.5 mr-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                filter === f
                  ? 'bg-teal-600 border-teal-700 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <span className="text-slate-300 text-xs font-bold">|</span>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                typeFilter === t
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold italic">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <p className="text-slate-400 italic text-xs font-semibold">No service requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Service</th>
                  <th className="py-3 px-6">Location</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Details</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6">Assign / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700">
                {requests.map((r) => {
                  const isBusy = processingId === r.id;
                  const isApproving = isBusy && processingAction === 'approve';
                  const isRejecting = isBusy && processingAction === 'reject';
                  const isCustom = r.requestType === 'CUSTOM';
                  return (
                    <tr key={r.id} className={`transition-colors ${isBusy ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900">{r.customer?.name || 'Customer'}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{r.customer?.email || ''}</div>
                      </td>
                      <td className="py-4 px-6 font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {isCustom && <CircuitBoard className="w-3.5 h-3.5 text-indigo-500" />}
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
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          isCustom
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          {isCustom ? 'Custom' : r.engagementType === 'CONTRACT' ? 'Contract' : 'Permanent'}
                        </span>
                        {!isCustom && <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{durationText(r)}</div>}
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
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {r.status}
                        </span>
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
                              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-teal-500 max-w-[160px]"
                            >
                              <option value="">Select specialist...</option>
                              {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name || p.user?.name || p.id}
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
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {r.assignedProvider?.user?.name || 'Specialist assigned'}
                          </div>
                        ) : r.status === 'CANCELLED' ? (
                          <span className="text-slate-400 text-[10px] font-semibold">Cancelled by customer</span>
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
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>
            Page {pagination.page} of {pagination.pages} · {pagination.total} request{pagination.total === 1 ? '' : 's'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => changePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

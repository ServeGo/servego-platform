import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, RefreshCw, ShieldAlert, ChevronDown, ChevronUp, Scale } from 'lucide-react';
import { api } from '../../../utils/apiClient';
import { normalizeDisputes } from '../../../utils/normalizeCustomerData';
import DisputeThread, { DisputeStatusBadge, disputeReasonLabel } from '../../../components/DisputeThread';

const FILTERS = ['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

const formatMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function AdminDisputesTab() {
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState({ open: 0, total: 0, byStatus: {}, totalRefunded: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchStats = useCallback(async () => {
    const res = await api.get('/admin/disputes/stats');
    if (res.ok && res.data) setStats(res.data);
  }, []);

  const fetchDisputes = useCallback(async (page = 1, status = 'ALL') => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), limit: '15' });
    if (status && status !== 'ALL') query.set('status', status);
    const res = await api.get(`/admin/disputes?${query.toString()}`);
    if (res.ok && res.data) {
      setDisputes(normalizeDisputes(res.data.disputes || []));
      setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
    } else {
      setDisputes([]);
      setPagination({ page: 1, limit: 15, total: 0, pages: 1 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchDisputes(pagination.page, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const refresh = () => {
    fetchStats();
    fetchDisputes(pagination.page, filter);
  };

  const changePage = (page) => {
    if (page < 1 || page > pagination.pages) return;
    fetchDisputes(page, filter);
  };

  const handleReply = async (message) => {
    if (!openId) return false;
    setBusy(true);
    const res = await api.post(`/disputes/${openId}/messages`, { message });
    setBusy(false);
    if (res.ok) { refresh(); return true; }
    window.alert(res.data?.message || res.data?.error || 'Could not send your message.');
    return false;
  };

  const handleResolve = async (resolution) => {
    if (!openId) return;
    const type = typeof resolution === 'string' ? resolution : resolution.type;
    const refundAmount = type === 'PARTIAL_REFUND' ? Number(resolution.amount) : undefined;
    const adminNote = window.prompt('Admin note for both parties (optional):') || undefined;
    setBusy(true);
    const res = await api.patch(`/disputes/${openId}/resolve`, { resolutionType: type, refundAmount, adminNote });
    setBusy(false);
    if (res.ok) { refresh(); } else { window.alert(res.data?.message || res.data?.error || 'Could not resolve the dispute.'); }
  };

  const handleReject = async () => {
    if (!openId) return;
    const adminNote = window.prompt('Rejection note for the customer:') || undefined;
    setBusy(true);
    const res = await api.patch(`/disputes/${openId}/reject`, { adminNote });
    setBusy(false);
    if (res.ok) { refresh(); } else { window.alert(res.data?.message || res.data?.error || 'Could not reject the dispute.'); }
  };

  const statCards = [
    { label: 'Open', value: stats.open, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'In Review', value: stats.byStatus.IN_REVIEW || 0, tone: 'text-sky-700 bg-sky-50 border-sky-200' },
    { label: 'Resolved', value: stats.byStatus.RESOLVED || 0, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Rejected', value: stats.byStatus.REJECTED || 0, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
    { label: 'Refunded', value: formatMoney(stats.totalRefunded), tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-teal-600" /> Disputes Section
          </h2>
          <p className="text-slate-500 text-xs">Review customer/specialist disputes, reply in-thread, and resolve with optional wallet refunds.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs disabled:bg-slate-700"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.tone}`}>
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-70">{s.label}</span>
            <span className="text-lg font-extrabold block mt-1">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
              filter === f ? 'bg-teal-600 border-teal-700 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold italic bg-white rounded-2xl border border-slate-200">Loading disputes…</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <ShieldAlert className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 italic text-xs font-medium">No disputes match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const open = openId === d.id;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : d.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{d.serviceCategory || 'Service'}</span>
                      <DisputeStatusBadge status={d.status} />
                      <span className="text-[10px] text-slate-500 font-bold">{d.raisedBy} · {d.customerName} vs {d.providerName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate max-w-xl">
                      {disputeReasonLabel(d.reason)} · {d.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {d.id} · {d.createdAtLabel} · Amount {formatMoney(d.bookingAmount)}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-400">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <DisputeThread
                      dispute={d}
                      currentUserId={null}
                      onReply={handleReply}
                      onResolve={handleResolve}
                      onReject={handleReject}
                      busy={busy}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Page {pagination.page} of {pagination.pages} · {pagination.total} dispute{pagination.total === 1 ? '' : 's'}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => changePage(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40">Prev</button>
            <button type="button" onClick={() => changePage(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

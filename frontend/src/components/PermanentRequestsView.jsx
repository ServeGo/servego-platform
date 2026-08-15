import React, { useState, useCallback, useEffect } from 'react';
import { Briefcase, Clock, CheckCircle2, XCircle, Ban, Info } from 'lucide-react';
import { api } from '../utils/apiClient';
import SkeletonLoader from './SkeletonLoader';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 border-amber-300 text-amber-800',
  APPROVED: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  REJECTED: 'bg-rose-100 border-rose-300 text-rose-800',
  CANCELLED: 'bg-slate-100 border-slate-300 text-slate-600'
};

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatMoney = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

export default function PermanentRequestsView({ onNavigate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/permanent-service-requests/mine');
    if (res.ok) {
      setRequests(Array.isArray(res.data) ? res.data : []);
      setError('');
    } else {
      setRequests([]);
      setError(res.data?.message || res.data?.error || 'Could not load your requests.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCancel = async (requestId) => {
    setCancellingId(requestId);
    const res = await api.post(`/permanent-service-requests/${requestId}/cancel`);
    setCancellingId(null);
    if (res.ok) {
      fetchRequests();
    } else {
      setError(res.data?.message || res.data?.error || 'Could not cancel the request.');
    }
  };

  const durationText = (r) => {
    if (r.engagementType === 'CONTRACT') {
      if (r.contractDurationYears) return `${r.contractDurationYears} year${r.contractDurationYears > 1 ? 's' : ''}`;
      if (r.contractDurationDays) return `${r.contractDurationDays} day${r.contractDurationDays > 1 ? 's' : ''}`;
      return '—';
    }
    return 'Ongoing';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 text-left">Permanent / Contract Requests</h3>
        <button
          onClick={fetchRequests}
          className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="list" count={3} />
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No Requests Yet</h4>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Request a permanent or contract-based service and our team will arrange everything for you.
          </p>
          <button
            onClick={() => onNavigate('services')}
            className="mt-5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{r.serviceCategory}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {r.engagementType === 'CONTRACT' ? 'Contract' : 'Permanent'} · {durationText(r)} · {formatMoney(r.monthlyBudget)}/mo
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${STATUS_STYLES[r.status] || 'bg-slate-100 border-slate-300 text-slate-600'}`}>
                  {r.status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-semibold">
                <InfoRow label="Start Date" value={formatDate(r.startDate)} />
                <InfoRow label="Submitted" value={formatDate(r.createdAt)} />
                {r.locationAddress && (
                  <InfoRow label="Service Location" value={r.locationAddress} />
                )}
              </div>

              {r.additionalInfo && (
                <p className="mt-3 text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                  <span className="font-extrabold text-slate-500 uppercase tracking-wide text-[9px] block mb-1">Notes</span>
                  {r.additionalInfo}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                {r.assignedProvider ? (
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                    {r.status === 'APPROVED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span>Assigned: {r.assignedProvider?.user?.name || 'Specialist'}</span>
                  </div>
                ) : r.status === 'REJECTED' ? (
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-rose-600">
                    <XCircle className="w-4 h-4" />
                    <span>{r.adminNote || 'Request declined'}</span>
                  </div>
                ) : r.status === 'CANCELLED' ? (
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <Ban className="w-4 h-4" />
                    <span>Cancelled by you</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-600">
                    <Clock className="w-4 h-4" />
                    <span>Awaiting admin review</span>
                  </div>
                )}

                {r.status === 'PENDING' && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    disabled={cancellingId === r.id}
                    className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  >
                    {cancellingId === r.id ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <span className="block text-[9px] uppercase tracking-widest font-black text-slate-400">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

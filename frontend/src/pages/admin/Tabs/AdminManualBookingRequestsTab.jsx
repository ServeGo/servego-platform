import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Phone, Mail, UserRound, XCircle } from 'lucide-react';
import { api } from '../../../utils/apiClient';

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200'
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN');
};

export default function AdminManualBookingRequestsTab({ providersList = [] }) {
  const [requests, setRequests] = useState([]);
  const [eligibleProviders, setEligibleProviders] = useState({});
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ requestType: 'NO_PROVIDER', status });
      const res = await api.get(`/permanent-service-requests?${query.toString()}`);
      if (!res.ok) throw new Error(res.data?.message || 'Could not load manual booking requests.');
      setRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
    } catch (err) {
      setRequests([]);
      setError(err.message || 'Could not load manual booking requests.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    let cancelled = false;
    const serviceNames = [...new Set(requests.map((request) => String(request.serviceCategory || '').trim()).filter(Boolean))];
    if (serviceNames.length === 0) {
      setEligibleProviders({});
      return undefined;
    }
    Promise.all(serviceNames.map(async (serviceName) => {
      const res = await api.get(`/providers/by-approved-service?serviceName=${encodeURIComponent(serviceName)}`);
      return [serviceName.toLowerCase(), res.ok && Array.isArray(res.data) ? res.data : []];
    })).then((entries) => {
      if (!cancelled) setEligibleProviders(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setEligibleProviders({});
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
      await fetchRequests();
    } catch (err) {
      setError(err.message || 'Could not update this request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Manual Booking Requests</h2>
          <p className="text-slate-500 text-xs mt-1">Customers whose service currently has no available provider.</p>
        </div>
        <button type="button" onClick={fetchRequests} disabled={loading} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold disabled:opacity-50">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED'].map((value) => (
          <button key={value} type="button" onClick={() => setStatus(value)} className={`px-3 py-1.5 rounded-full border text-[10px] font-extrabold uppercase ${status === value ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-slate-500 border-slate-200'}`}>
            {value}
          </button>
        ))}
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-bold">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs font-semibold">No manual booking requests found.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {requests.map((request) => {
            const busy = busyId === request.id;
            const serviceKey = String(request.serviceCategory || '').trim().toLowerCase();
            const requestProviders = eligibleProviders[serviceKey] || [];
            return (
              <article key={request.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Requested service</p>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">{request.serviceCategory || 'Service request'}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Submitted {formatDate(request.createdAt)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full border text-[9px] font-black uppercase ${STATUS_STYLES[request.status] || STATUS_STYLES.PENDING}`}>{request.status}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px]">
                  <div className="min-w-0"><span className="flex items-center gap-1 text-[9px] uppercase font-black text-slate-400"><UserRound className="w-3 h-3" /> Customer</span><p className="font-extrabold text-slate-800 mt-1">{request.customer?.name || '—'}</p></div>
                  <div className="min-w-0"><span className="flex items-center gap-1 text-[9px] uppercase font-black text-slate-400"><Mail className="w-3 h-3" /> Email</span><p className="font-semibold text-slate-700 mt-1 break-all">{request.customer?.email || '—'}</p></div>
                  <div><span className="flex items-center gap-1 text-[9px] uppercase font-black text-slate-400"><Phone className="w-3 h-3" /> Phone</span><p className="font-semibold text-slate-700 mt-1">{request.customer?.phone || '—'}</p></div>
                  <div className="sm:col-span-2"><span className="flex items-center gap-1 text-[9px] uppercase font-black text-slate-400"><MapPin className="w-3 h-3" /> Address</span><p className="font-semibold text-slate-700 mt-1">{request.locationAddress || '—'}</p></div>
                </div>

                <div><p className="text-[9px] uppercase tracking-widest font-black text-slate-400">Customer details</p><p className="text-xs text-slate-700 font-medium leading-relaxed mt-1 whitespace-pre-wrap">{request.additionalInfo || '—'}</p></div>

                {request.status === 'PENDING' ? (
                  <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 pt-3">
                    <select value={assignments[request.id] || ''} onChange={(e) => setAssignments((current) => ({ ...current, [request.id]: e.target.value }))} className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700">
                      <option value="">Select provider...</option>
                      {requestProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name || provider.providerNumber || 'Unknown'}</option>)}
                    </select>
                    <button type="button" onClick={() => updateRequest(request, 'APPROVED')} disabled={busy || !assignments[request.id] || requestProviders.length === 0} className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2 text-[10px] font-extrabold disabled:opacity-50">{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Assign</button>
                    <button type="button" onClick={() => updateRequest(request, 'REJECTED')} disabled={busy} className="inline-flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2 text-[10px] font-extrabold disabled:opacity-50"><XCircle className="w-3 h-3" /> Reject</button>
                    {requestProviders.length === 0 && (
                      <p className="sm:col-span-2 text-[10px] font-semibold text-amber-700">No active verified provider is approved for this service.</p>
                    )}
                  </div>
                ) : request.assignedProvider && (
                  <p className="text-xs font-bold text-emerald-700 border-t border-slate-100 pt-3">Assigned to {request.assignedProvider.user?.name || 'provider'}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

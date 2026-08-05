import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Plus, ShieldAlert, ChevronDown, ChevronUp, X } from 'lucide-react';
import { api } from '../utils/apiClient';
import { useApp } from '../context/AppContext';
import { normalizeDisputes } from '../utils/normalizeCustomerData';
import DisputeThread, { DisputeStatusBadge, disputeReasonLabel } from './DisputeThread';

const REASONS = ['QUALITY_ISSUE', 'SERVICE_NOT_PROVIDED', 'PRICING_ISSUE', 'DAMAGE', 'BEHAVIOR', 'NO_SHOW', 'OTHER'];

const lc = (v) => (v ?? '').toString().trim().toLowerCase();

export default function ProviderDisputesView({ providerId, bookings }) {
  const { currentUser } = useApp();
  const currentUserId = currentUser?.id;
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ bookingId: '', reason: 'BEHAVIOR', description: '', evidence: '' });
  const [formError, setFormError] = useState('');

  const completedBookings = (Array.isArray(bookings) ? bookings : []).filter(
    (b) => b.providerId === providerId && ['completed', 'reviewed'].includes(lc(b.status))
  );

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/disputes/mine');
    if (res.ok && Array.isArray(res.data)) setDisputes(normalizeDisputes(res.data));
    else setDisputes([]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const handleReply = async (message) => {
    if (!openId) return false;
    setBusy(true);
    const res = await api.post(`/disputes/${openId}/messages`, { message });
    setBusy(false);
    if (res.ok) { fetchDisputes(); return true; }
    window.alert(res.data?.message || res.data?.error || 'Could not send your message.');
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bookingId || form.description.trim().length < 10) {
      setFormError('Select a completed booking and describe the issue in at least 10 characters.');
      return;
    }
    setBusy(true);
    setFormError('');
    const res = await api.post('/disputes', {
      bookingId: form.bookingId,
      reason: form.reason,
      description: form.description.trim(),
      evidence: form.evidence.trim() ? [form.evidence.trim()] : [],
      raisedBy: 'PROVIDER'
    });
    setBusy(false);
    if (res.ok) {
      setForm({ bookingId: '', reason: 'BEHAVIOR', description: '', evidence: '' });
      setShowForm(false);
      fetchDisputes();
    } else {
      setFormError(res.data?.message || res.data?.error || 'Could not raise the dispute.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-slate-900 text-left">Disputes & Escalations</h3>
          <p className="text-slate-500 text-xs">Raise a dispute against a completed booking or reply to an open one.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Close Form' : 'Raise a Dispute'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <h4 className="text-sm font-extrabold text-slate-900">New dispute</h4>
          {completedBookings.length === 0 ? (
            <p className="text-xs italic text-slate-400 font-medium">
              You need at least one completed booking on this account to raise a dispute.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Booking</span>
                  <select
                    value={form.bookingId}
                    onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500"
                  >
                    <option value="">Select a completed booking…</option>
                    {completedBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.serviceCategory} · ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Reason</span>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500"
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>{disputeReasonLabel(r)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Describe the issue</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Tell support what happened (at least 10 characters)…"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500 resize-none"
                />
              </label>
              {formError && <p className="text-rose-600 text-[11px] font-bold">{formError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs disabled:bg-indigo-300 transition-colors flex items-center gap-1.5"
                >
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Dispute
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold italic">Loading disputes…</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <ShieldAlert className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 italic text-xs font-medium">No disputes on your bookings.</p>
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
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate max-w-md">
                      {disputeReasonLabel(d.reason)} · {d.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{d.id} · {d.createdAtLabel}</p>
                  </div>
                  <span className="shrink-0 text-slate-400">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </button>
                {open && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <DisputeThread
                      dispute={d}
                      currentUserId={currentUserId}
                      onReply={handleReply}
                      busy={busy}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

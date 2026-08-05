import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Inbox,
  RefreshCw,
  Clock,
  MapPin,
  User,
  IndianRupee,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Timer,
  ArrowLeftRight,
  AlertTriangle,
  LocateFixed
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/apiClient';

const LEAD_STATUS_LABELS = {
  NEW: 'New',
  VIEWED: 'Viewed',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  EXPIRED: 'Expired',
  TRANSFERRED: 'Transferred',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

const LEAD_STATUS_STYLES = {
  NEW: 'bg-amber-100 border-amber-300 text-amber-800',
  VIEWED: 'bg-sky-100 border-sky-300 text-sky-800',
  ACCEPTED: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  REJECTED: 'bg-rose-100 border-rose-300 text-rose-800',
  EXPIRED: 'bg-slate-100 border-slate-300 text-slate-600',
  TRANSFERRED: 'bg-indigo-100 border-indigo-300 text-indigo-800',
  COMPLETED: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  CANCELLED: 'bg-rose-100 border-rose-300 text-rose-800'
};

const BOOKING_STATUS_STYLES = {
  PENDING: 'bg-amber-100 border-amber-300 text-amber-800',
  CONFIRMED: 'bg-sky-100 border-sky-300 text-sky-800',
  ONGOING: 'bg-violet-100 border-violet-300 text-violet-800',
  COMPLETED: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  CANCELLED: 'bg-rose-100 border-rose-300 text-rose-800'
};

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
};

const fmtTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function useNowTick(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function formatCountdown(ms) {
  if (ms == null || Number.isNaN(ms)) return null;
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
}

export default function ProviderLeadsInbox({ providerId, updateBookingStatus }) {
  const { socketRef } = useApp();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('actionable');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [viewedIds, setViewedIds] = useState(() => new Set());

  const fetchLeads = useCallback(async (silent = false) => {
    if (!providerId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/leads');
      if (res.ok) {
        setLeads(Array.isArray(res.data?.leads) ? res.data.leads : []);
        setError('');
      } else {
        setError(res.data?.message || res.data?.error || 'Failed to load leads.');
      }
    } catch (e) {
      setError('Network error while loading leads.');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time: refresh whenever a lead/booking event arrives on the shared socket.
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return undefined;
    const events = [
      'newLead',
      'leadExpired',
      'leadAccepted',
      'leadRejected',
      'bookingUpdated',
      'bookingStatusChanged',
      'booking:cancelled',
      'notification'
    ];
    const handler = () => fetchLeads(true);
    events.forEach((ev) => socket.on(ev, handler));
    return () => events.forEach((ev) => socket.off(ev, handler));
  }, [socketRef, fetchLeads]);

  // Poll fallback every 30s (identical cadence to the app's booking poll).
  useEffect(() => {
    const id = window.setInterval(() => fetchLeads(true), 30000);
    return () => window.clearInterval(id);
  }, [fetchLeads]);

  const categorized = useMemo(() => {
    const actionable = leads.filter((l) => l.status === 'NEW' || l.status === 'VIEWED');
    const active = leads.filter((l) => {
      const bs = l.booking?.status;
      return bs === 'CONFIRMED' || bs === 'ONGOING';
    });
    const closed = leads.filter((l) => {
      const bs = l.booking?.status;
      return (
        bs === 'COMPLETED' ||
        bs === 'CANCELLED' ||
        l.status === 'EXPIRED' ||
        l.status === 'REJECTED' ||
        l.status === 'TRANSFERRED' ||
        l.status === 'COMPLETED'
      );
    });
    return { actionable, active, closed };
  }, [leads]);

  const counts = useMemo(
    () => ({
      actionable: categorized.actionable.length,
      active: categorized.active.length,
      closed: categorized.closed.length,
      all: leads.length
    }),
    [leads, categorized]
  );

  const filtered = useMemo(() => {
    let arr;
    if (filter === 'actionable') arr = categorized.actionable;
    else if (filter === 'active') arr = categorized.active;
    else if (filter === 'closed') arr = categorized.closed;
    else arr = leads;

    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((l) => {
        const hay = [
          l.serviceCategory,
          l.customer?.name,
          l.booking?.locationAddress,
          l.booking?.city,
          l.booking?.instructions,
          l.id,
          l.booking?.id
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leads, categorized, filter, query]);

  const markViewed = useCallback(
    async (lead) => {
      if (lead.status !== 'NEW') return;
      if (viewedIds.has(lead.id)) return;
      setViewedIds((prev) => new Set(prev).add(lead.id));
      try {
        await api.patch(`/leads/${lead.id}/view`, {});
      } catch {
        // non-critical — status will resync on next refresh
      }
    },
    [viewedIds]
  );

  const handleAccept = async (lead) => {
    if (!window.confirm('Accept this lead? The booking will be confirmed for you.')) return;
    setBusyId(lead.id);
    setActionError('');
    try {
      const res = await api.patch(`/leads/${lead.id}/accept`, {});
      if (res.ok) {
        await fetchLeads(true);
      } else {
        setActionError(res.data?.message || res.data?.error || 'Could not accept the lead.');
      }
    } catch (e) {
      setActionError('Network error while accepting the lead.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (lead) => {
    if (!window.confirm('Decline this request? Other providers can still accept it.')) return;
    setBusyId(lead.id);
    setActionError('');
    try {
      const res = await api.patch(`/leads/${lead.id}/reject`, { reason: 'PROVIDER_DECLINED' });
      if (res.ok) {
        await fetchLeads(true);
      } else {
        setActionError(res.data?.message || res.data?.error || 'Could not decline the lead.');
      }
    } catch (e) {
      setActionError('Network error while declining the lead.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStartWork = async (lead) => {
    if (!lead.booking?.id) return;
    const result = await updateBookingStatus(lead.booking.id, 'ongoing', 'Work started.');
    if (result && !result.error) await fetchLeads(true);
    else setActionError(result?.error || 'Could not start work.');
  };

  const handleComplete = async (lead) => {
    if (!lead.booking?.id) return;
    const code = window.prompt('Ask the customer for their 4-digit verification code to complete the job:');
    if (!code) return;
    const result = await updateBookingStatus(lead.booking.id, 'completed', 'Completed.', code.replace(/\D/g, '').slice(0, 4));
    if (result && !result.error) await fetchLeads(true);
    else setActionError(result?.error || 'Could not complete the job.');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight text-left">Lead Inbox</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Review requests fast — leads expire and pass to the next provider when you decline or wait too long.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
              {[
                { id: 'actionable', label: 'Action Required' },
                { id: 'active', label: 'Active Duty' },
                { id: 'closed', label: 'Closed' },
                { id: 'all', label: 'All' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                    filter === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                  {counts[t.id] > 0 && <span className="opacity-70"> ({counts[t.id]})</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client, category, address, ID..."
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2 text-xs font-bold outline-none"
              />
              <button
                onClick={() => fetchLeads()}
                disabled={loading}
                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {actionError}
        </div>
      )}

      {loading && filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-xs font-semibold">
          Loading your leads...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyInbox filter={filter} />
      ) : (
        <div className="space-y-4">
          {filtered.map((lead) => (
            <LeadCardItem
              key={lead.id}
              lead={lead}
              busy={busyId === lead.id}
              onOpen={() => markViewed(lead)}
              onAccept={() => handleAccept(lead)}
              onReject={() => handleReject(lead)}
              onStartWork={() => handleStartWork(lead)}
              onComplete={() => handleComplete(lead)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyInbox({ filter }) {
  const copy = {
    actionable: {
      title: 'No pending requests',
      desc: 'When a customer books a service in your zone, the offer lands here. Act fast to keep it.'
    },
    active: {
      title: 'No active duty',
      desc: 'Jobs you accept move here so you can start work and complete them.'
    },
    closed: {
      title: 'Nothing closed yet',
      desc: 'Completed, cancelled, and expired leads will be archived here.'
    },
    all: {
      title: 'No leads yet',
      desc: 'Your lead history will appear here once customers start booking.'
    }
  }[filter] || { title: 'No leads yet', desc: 'New requests will appear here.' };

  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs max-w-md mx-auto">
      <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-4" />
      <h4 className="text-base font-bold text-slate-900">{copy.title}</h4>
      <p className="text-slate-500 text-xs mt-1 font-medium">{copy.desc}</p>
    </div>
  );
}

function LeadCardItem({ lead, busy, onOpen, onAccept, onReject, onStartWork, onComplete }) {
  const now = useNowTick(lead.status === 'NEW' || lead.status === 'VIEWED');
  const booking = lead.booking || {};
  const actionable = lead.status === 'NEW' || lead.status === 'VIEWED';
  const expiryMs = lead.expiryTime ? new Date(lead.expiryTime).getTime() - now : null;
  const expired = expiryMs != null && expiryMs <= 0;
  const bookingStatus = booking.status || 'PENDING';

  useEffect(() => {
    onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-xs p-6 relative text-left hover:border-teal-200 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${LEAD_STATUS_STYLES[lead.status] || 'bg-slate-100 border-slate-300 text-slate-600'}`}>
            {LEAD_STATUS_LABELS[lead.status] || lead.status}
          </span>
          <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${BOOKING_STATUS_STYLES[bookingStatus] || 'bg-slate-100 border-slate-300 text-slate-600'}`}>
            Booking: {bookingStatus}
          </span>
          {lead.transferCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full">
              <ArrowLeftRight className="w-3 h-3" /> Reassigned ×{lead.transferCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actionable && lead.expiryTime && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black rounded-full px-2.5 py-1 border ${
                expired
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : expiryMs != null && expiryMs < 120000
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              {expired ? 'Expired' : `Expires in ${formatCountdown(expiryMs)}`}
            </span>
          )}
          <span className="text-[10px] font-mono font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded">ID: {lead.id.slice(0, 12)}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-teal-600" />
            {lead.serviceCategory} Request
          </h4>
          <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
            <User className="w-3.5 h-3.5" /> {lead.customer?.name || 'Customer'}
            {lead.distanceKm != null && (
              <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                <MapPin className="w-3 h-3" /> {Number(lead.distanceKm).toFixed(1)} km away
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {booking.amount != null && (
            <span className="text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 inline-flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> {fmtMoney(booking.amount)}
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-bold">{fmtTime(lead.createdAt)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-bold text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block mb-1">Service Address</span>
          <span className="text-slate-800 leading-tight block">{booking.locationAddress || '—'}{booking.city ? `, ${booking.city}` : ''}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block mb-1">Customer Requirements</span>
          <p className="text-slate-700 font-semibold">"{booking.instructions || 'No special notes.'}"</p>
        </div>
      </div>

      <div className="flex gap-2 justify-end flex-wrap items-center">
        {(bookingStatus === 'CONFIRMED' || bookingStatus === 'ONGOING') && (
          <ProviderLocationShare bookingId={booking.id} />
        )}
        {actionable ? (
          <>
            <button
              onClick={onReject}
              disabled={busy}
              className="bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 px-4 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={busy}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {busy ? 'Processing...' : 'Accept & Confirm'}
            </button>
          </>
        ) : bookingStatus === 'CONFIRMED' ? (
          <button
            onClick={onStartWork}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" /> Start Work
          </button>
        ) : bookingStatus === 'ONGOING' ? (
          <button
            onClick={onComplete}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Mark Completed (verify code)
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 font-semibold inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> No action needed
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Streams the provider's device GPS to the customer in real time for a
 * confirmed/ongoing booking. Uses the live socket when connected (fast path)
 * and falls back to the REST endpoint automatically. The browser's
 * `watchPosition` cadence is already bounded by the browser + server throttle.
 */
function ProviderLocationShare({ bookingId }) {
  const { shareProviderLocation } = useApp();
  const [sharing, setSharing] = useState(false);
  const [statusText, setStatusText] = useState('Share Live Location');
  const [tone, setTone] = useState('slate');
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const startSharing = () => {
    if (!navigator.geolocation) {
      setStatusText('Geolocation not supported');
      setTone('rose');
      return;
    }
    setSharing(true);
    setStatusText('Locating…');
    setTone('amber');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatusText('Live · sharing position');
        setTone('emerald');
        shareProviderLocation(bookingId, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'Permission denied — enable GPS'
            : err.code === 2
              ? 'Position unavailable'
              : 'GPS timed out';
        setStatusText(msg);
        setTone('rose');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  };

  const stopSharing = () => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setSharing(false);
    setStatusText('Share Live Location');
    setTone('slate');
  };

  const styles = {
    slate: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500',
    amber: 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400',
    rose: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <button
      type="button"
      onClick={sharing ? stopSharing : startSharing}
      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 mr-auto ${styles[tone]}`}
    >
      <LocateFixed className={`w-3.5 h-3.5 ${sharing ? 'animate-pulse' : ''}`} />
      {statusText}
    </button>
  );
}

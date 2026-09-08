import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Inbox,
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
  LocateFixed,
  Navigation,
  UserCheck,
  Phone,
  Send,
  FileText
} from 'lucide-react';
import { useRealtime, useData } from '../context/AppContext';
import { api } from '../utils/apiClient';
import { getErrorInfo } from '../utils/errorMessages';
import SkeletonLoader from './SkeletonLoader';
import QuotationModal from './QuotationModal';

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

const ARRIVAL_RADIUS_M = 1000;

// A GPS fix is only trusted when its reported accuracy is at least this good.
// Poor fixes (e.g. 500 m accuracy inside a 1 km radius) prove nothing, so the
// provider is routed to the manual "Arrive & Confirm" path instead of a
// wrongly-enabled "Arrived" button.
const ARRIVAL_ACCURACY_M = 300;

// Straight-line distance between two { latitude, longitude } points in metres.
// The 1 km "mark arrival" gate is a proximity check, not turn-by-turn distance,
// so haversine is deliberately used instead of the maps driving distance.
const haversineMeters = (a, b) => {
  if (!a || !b) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
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
  const { socketRef } = useRealtime();
  const { mergeBooking, removeBooking } = useData();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('actionable');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionErrorAction, setActionErrorAction] = useState(null);
  const [viewedIds, setViewedIds] = useState(() => new Set());
  const [quoteLead, setQuoteLead] = useState(null);

  // Rule 19: resolve friendly copy + optional recovery action from the backend
  // code instead of echoing a raw message.
  const showActionError = (payload, fallback) => {
    const info = getErrorInfo(payload, fallback);
    setActionError(info.message);
    setActionErrorAction(info.action);
  };

  const fetchLeads = useCallback(async (silent = false) => {
    if (!providerId) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/leads');
      if (res.ok) {
        setLeads(Array.isArray(res.data?.leads) ? res.data.leads : []);
        setError('');
      } else {
        setError(getErrorInfo(res.data, 'Failed to load leads.').message);
      }
    } catch (e) {
      setError(getErrorInfo(e, 'Failed to load leads.').message);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time: upsert/patch lead cards from the granular socket payloads instead
  // of refetching the whole inbox. The 30s poll below is the reconciliation net.
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return undefined;

    // `buildLeadPayload` (backend) → shape compatible with a `GET /leads` row.
    const toLead = (payload) => {
      if (!payload?.leadId) return null;
      return {
        id: payload.leadId,
        bookingId: payload.bookingId ?? payload.booking?.id ?? null,
        serviceCategory: payload.serviceCategory ?? null,
        status: payload.status ?? 'NEW',
        distanceKm: payload.distanceKm ?? null,
        notes: payload.notes ?? null,
        expiryTime: payload.expiryTime ?? null,
        transferCount: payload.transferCount ?? 0,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        customer: payload.customer || null,
        booking: payload.booking || null
      };
    };

    // New / transferred offer (newLead) — show it immediately.
    const handleNewLead = (payload) => {
      const lead = toLead(payload);
      if (!lead) return;
      setLeads(prev => {
        const idx = prev.findIndex(l => l.id === lead.id);
        if (idx === -1) return [lead, ...prev];
        const next = [...prev];
        next[idx] = lead;
        return next;
      });
    };

    // Offer is no longer current (accepted by another provider / reassigned
    // away) — the backend drops these from GET /leads, so drop them here too.
    const handleOfferClosed = (payload) => {
      const bookingId = payload?.bookingId ?? payload?.booking?.id;
      if (!bookingId) return;
      setLeads(prev => prev.filter(l => l.bookingId !== bookingId));
    };

    // Lead reached a terminal state (EXPIRED, etc.) — merge the payload fields.
    const handleLeadState = (payload) => {
      const lead = toLead(payload);
      if (!lead?.id) return;
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...lead } : l));
    };

    // The embedded booking changed status (CONFIRMED/ONGOING/CANCELLED…) —
    // patch it in place, and if this provider accepted (booking → CONFIRMED)
    // move the actionable lead to the Active Duty tab.
    const handleBookingStatus = (payload) => {
      const bookingId = payload?.bookingId;
      const status = payload?.status || payload?.booking?.status;
      if (!bookingId || !status) return;
      setLeads(prev => prev.map(l => {
        if (l.bookingId !== bookingId) return l;
        const leadStatus = (l.status === 'NEW' || l.status === 'VIEWED') &&
          (status === 'CONFIRMED' || status === 'ONGOING')
          ? 'ACCEPTED'
          : l.status;
        return { ...l, status: leadStatus, booking: { ...(l.booking || {}), status } };
      }));
    };

    const handlers = {
      newLead: handleNewLead,
      leadExpired: handleLeadState,
      leadCancelled: handleOfferClosed,
      leadReassigned: handleOfferClosed,
      bookingUpdated: handleBookingStatus,
      bookingStatusChanged: handleBookingStatus,
      'booking:cancelled': handleBookingStatus,
      'booking:statusChanged': handleBookingStatus,
      // A quotation was submitted/revised/decided for one of my bookings —
      // pull the canonical inbox instead of trusting the partial card, so the
      // card can never revert to "Submit Quotation" on a live quotation.
      quotation: () => fetchLeads(true)
    };
    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
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
    // Closed = jobs actually finished. Cancelled/expired/rejected/transferred
    // leads stay reachable only via the "All" tab.
    const closed = leads.filter((l) => {
      const bs = l.booking?.status;
      return bs === 'COMPLETED' || l.status === 'COMPLETED';
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

    return [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [leads, categorized, filter]);

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
        // The accept response is the canonical CONFIRMED booking — merge it into
        // the jobs list (replaces the PENDING row or prepends for a new one).
        setLeads(prev => prev.map(l =>
          l.id === lead.id
            ? { ...l, status: 'ACCEPTED', booking: { ...(l.booking || {}), status: 'CONFIRMED' } }
            : l
        ));
        if (res.data?.id) mergeBooking(res.data);
      } else {
        showActionError(res.data, 'Could not accept the lead.');
      }
    } catch (e) {
      showActionError(e, 'Could not accept the lead.');
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
        // The declined offer leaves this provider's inbox (their offer is closed).
        setLeads(prev => prev.filter(l => l.id !== lead.id));
        // If the request was re-pointed to the next provider, drop the stale
        // PENDING row from the jobs list. When it settled the booking:cancelled
        // socket event marks the booking CANCELLED in place.
        if (lead.bookingId && res.data?.status === 'PENDING') removeBooking(lead.bookingId);
      } else {
        showActionError(res.data, 'Could not decline the lead.');
      }
    } catch (e) {
      showActionError(e, 'Could not decline the lead.');
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (lead) => {
    if (!lead.booking?.id) return;
    setBusyId(lead.id);
    setActionError('');
    try {
      const result = await updateBookingStatus(lead.booking.id, 'completed', 'Completed.');
      if (result && !result.error) {
        setLeads(prev => prev.map(l => l.bookingId === lead.bookingId
          ? { ...l, booking: { ...(l.booking || {}), status: 'COMPLETED' } }
          : l
        ));
      } else showActionError(result, 'Could not complete the job.');
    } catch (e) {
      showActionError(e, 'Could not complete the job.');
    } finally {
      setBusyId(null);
    }
  };

  const handleQuotationSubmitted = (result) => {
    // `submitQuotation` returns the raw quotation row (with items + status
    // SUBMITTED) plus a scalar-only booking — patch the card in place AND
    // reconcile with the canonical GET /leads so a stale/socket race can never
    // leave the card asking for a fresh quotation right after submission.
    const quotation = result?.quotation;
    const bookingStatus = result?.booking?.status;
    setLeads((prev) =>
      prev.map((l) => {
        if (!quoteLead || l.bookingId !== quoteLead.bookingId) return l;
        const status = l.status;
        const acceptedAsActive =
          status === 'NEW' || status === 'VIEWED'
            ? bookingStatus === 'CONFIRMED' || bookingStatus === 'ONGOING'
              ? 'ACCEPTED'
              : status
            : status;
        return {
          ...l,
          status: acceptedAsActive,
          booking: {
            ...(l.booking || {}),
            ...(bookingStatus ? { status: bookingStatus } : {}),
            ...(quotation ? { quotation } : {})
          }
        };
      })
    );
    setQuoteLead(null);
    if (quotation) fetchLeads(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl w-full sm:w-fit">
        {[
          { id: 'actionable', label: 'Action Required' },
          { id: 'active', label: 'Active Duty' },
          { id: 'closed', label: 'Closed' },
          { id: 'all', label: 'All' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all text-center ${
              filter === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] sm:text-xs font-black leading-tight whitespace-nowrap">
              {t.label}
              {counts[t.id] > 0 && <span className="ml-1 opacity-70">({counts[t.id]})</span>}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {actionError}
          {actionErrorAction && (
            <button
              onClick={() => {
                setActionError('');
                setActionErrorAction(null);
                fetchLeads(true);
              }}
              className="ml-1 underline font-black hover:text-amber-900"
            >
              {actionErrorAction}
            </button>
          )}
        </div>
      )}

      {loading && filtered.length === 0 ? (
        <SkeletonLoader type="list" count={4} />
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
              onQuote={() => setQuoteLead(lead)}
              onComplete={() => handleComplete(lead)}
            />
          ))}
        </div>
      )}

      {quoteLead && (
        <QuotationModal
          booking={quoteLead.booking || {}}
          existingQuotation={quoteLead.booking?.quotation || null}
          onClose={() => setQuoteLead(null)}
          onSubmitted={handleQuotationSubmitted}
        />
      )}
    </div>
  );
}

function QuotationActionButtons({ quotation, busy, onQuote, arrived }) {
  const status = quotation && String(quotation.status).toUpperCase();
  // A live quotation (submitted / accepted / still pending) always supersedes
  // the submit flow — only a missing or a closed/declined quotation should ask
  // the provider to submit again.
  const liveQuote = Boolean(quotation) && (status === 'SUBMITTED' || status === 'ACCEPTED' || status === 'PENDING');
  const accepted = status === 'ACCEPTED';
  const total = Number(quotation?.totalAmount) || 0;

  if (liveQuote) {
    if (accepted) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Quotation {total > 0 ? `${fmtMoney(total)} ` : ''}accepted — work has started
        </span>
      );
    }
    return (
      <>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-300 rounded-full px-3 py-2">
          <Send className="w-3.5 h-3.5" />
          Quotation {total > 0 ? `${fmtMoney(total)} ` : ''}sent — awaiting customer's decision
        </span>
        <button
          onClick={onQuote}
          disabled={busy}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5" /> Edit Quotation
        </button>
      </>
    );
  }

  // Submission is gated behind arrival (phase ARRIVED): the provider must
  // reach the customer before the quote can be sent. Rule 19 — never a bare
  // disabled button, the provider is told exactly what unlocks it.
  const arrivalPending = !arrived;

  return (
    <>
      {arrivalPending && (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <Navigation className="w-3.5 h-3.5" />
          Arrive at the customer's location with GPS on to submit the quotation
        </span>
      )}
      <button
        onClick={onQuote}
        disabled={busy || arrivalPending}
        title={arrivalPending ? "Arrive at the customer's location first." : undefined}
        className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" /> {busy ? 'Processing...' : 'Submit Quotation'}
      </button>
    </>
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
      desc: 'Jobs you have finished will be archived here.'
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

function LeadCardItem({ lead, busy, onOpen, onAccept, onReject, onQuote, onComplete }) {
  const { getBookingLocation } = useRealtime();
  const now = useNowTick(lead.status === 'NEW' || lead.status === 'VIEWED');
  const booking = lead.booking || {};
  const actionable = lead.status === 'NEW' || lead.status === 'VIEWED';
  const expiryMs = lead.expiryTime ? new Date(lead.expiryTime).getTime() - now : null;
  const expired = expiryMs != null && expiryMs <= 0;
  const bookingStatus = booking.status || 'PENDING';
  // Rule: the customer's number is only shown while the booking is live.
  // Once the customer cancels, the backend strips it and the UI never renders it.
  const canShowPhone = bookingStatus !== 'CANCELLED';

  // Dispatch phase read live-first (socket/realtime) with the persisted value
  // from GET /leads as the reload fallback.
  const providerPhase = getBookingLocation(booking.id)?.providerPhase || booking.providerPhase || null;
  const arrived = providerPhase === 'ARRIVED';

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
            {canShowPhone && lead.customer?.phone && (
              <a
                href={`tel:${lead.customer.phone}`}
                className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 hover:bg-teal-100 hover:border-teal-300 transition-colors"
              >
                <Phone className="w-3 h-3" /> {lead.customer.phone}
              </a>
            )}
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
          <>
            <ProviderDispatchControls booking={booking} />
            <ProviderLocationShare bookingId={booking.id} />
          </>
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
          <QuotationActionButtons
            quotation={booking.quotation || (Array.isArray(booking.quotations) ? booking.quotations[0] : null)}
            busy={busy}
            onQuote={onQuote}
            arrived={arrived}
          />
        ) : bookingStatus === 'ONGOING' ? (
          <button
            onClick={onComplete}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> {busy ? 'Processing...' : 'Mark Completed'}
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
 * and falls back to the REST endpoint automatically. GPS ticks are throttled
 * client-side in `shareProviderLocation` (time + movement gates) before they
 * reach the network; the server applies its own minimum interval as a second
 * gate.
 */
function ProviderLocationShare({ bookingId }) {
  const { shareProviderLocation } = useRealtime();
  const [sharing, setSharing] = useState(false);
  const [statusText, setStatusText] = useState('Share Live Location');
  const [tone, setTone] = useState('slate');
  const watchIdRef = useRef(null);

  useEffect(() => {
    // Location sharing defaults to ON: this control only mounts for a
    // CONFIRMED/ONGOING booking, i.e. the moment the offer was accepted — so
    // the GPS watch starts immediately. The provider can still toggle it off.
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    startSharing();
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        shareProviderLocation(bookingId, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
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

/**
 * Dispatch lifecycle controls for a confirmed/ongoing booking: the provider
 * signals "On My Way" (→ ON_THE_WAY) then "Arrived" (→ ARRIVED). The customer
 * sees the phase update live on their tracking screen.
 *
 * "On My Way" is optional — the provider may jump straight to "Arrived".
 * "Arrived" gating (Plan B):
 * - GPS path: only actionable once a TRUSTED fix (accuracy ≤ 300 m) is within
 *   1 km of the destination pin. The destination prefers the live echo and
 *   falls back to the booking's service coordinates shipped in GET /leads.
 * - Manual path: when no trustworthy fix exists (no fix / permission denied /
 *   poor accuracy), the provider never gets stuck — a "Arrive & Confirm"
 *   dialog lets them signal arrival with source='manual' and records
 *   `arrivedSource` for audit.
 */
function ProviderDispatchControls({ booking }) {
  const { getBookingLocation, setProviderDispatchPhase } = useRealtime();
  const [busy, setBusy] = useState(false);
  const [manualConfirm, setManualConfirm] = useState(false);

  const live = getBookingLocation(booking.id);
  const phase = live?.providerPhase || booking.providerPhase || null;
  const arrived = phase === 'ARRIVED';

  const liveFix =
    live?.latitude != null && live?.longitude != null
      ? { latitude: live.latitude, longitude: live.longitude }
      : null;
  const destination =
    live?.destination?.latitude != null && live?.destination?.longitude != null
      ? { latitude: live.destination.latitude, longitude: live.destination.longitude }
      : booking.serviceLatitude != null && booking.serviceLongitude != null
        ? { latitude: Number(booking.serviceLatitude), longitude: Number(booking.serviceLongitude) }
        : null;
  const distanceM = haversineMeters(liveFix, destination);

  const accuracy = live?.accuracy != null ? Number(live.accuracy) : null;
  // Trust the fix only when accuracy is known-good; missing accuracy falls back
  // to trusting it (fix present = reasonable signal).
  const fixTrusted = liveFix != null && (accuracy == null || accuracy <= ARRIVAL_ACCURACY_M);
  const withinArrivalRadius = distanceM != null && distanceM <= ARRIVAL_RADIUS_M;
  const canAutoArrive = fixTrusted && withinArrivalRadius;
  const gpsUnavailable = liveFix == null || !fixTrusted;

  const fire = async (nextPhase, source) => {
    setBusy(true);
    try {
      const res = await setProviderDispatchPhase(booking.id, nextPhase, source);
      if (!res?.ok) console.warn('Dispatch update failed:', res?.error || res?.message);
    } finally {
      setBusy(false);
    }
  };

  const arrivalHint =
    distanceM != null
      ? `${(distanceM / 1000).toFixed(1)} km away — be within 1 km to mark arrival`
      : 'Enable GPS sharing to mark arrival';

  return (
    <div className="flex items-center gap-2 mr-auto flex-wrap">
      {!arrived && phase !== 'ON_THE_WAY' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => fire('ON_THE_WAY')}
          className="px-3 py-2 text-xs font-bold rounded-xl transition-all border bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Navigation className="w-3.5 h-3.5" />
          On My Way
        </button>
      )}
      {!arrived && canAutoArrive && (
        <button
          type="button"
          disabled={busy}
          onClick={() => fire('ARRIVED', 'gps')}
          className="px-3 py-2 text-xs font-bold rounded-xl transition-all border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1.5 disabled:opacity-50"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Arrived
        </button>
      )}
      {!arrived && gpsUnavailable && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => setManualConfirm(true)}
            className="px-3 py-2 text-xs font-bold rounded-xl transition-all border bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1.5 disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Arrive &amp; Confirm
          </button>
          <span className="text-[10px] font-semibold text-amber-700 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {liveFix == null
              ? 'GPS unavailable — confirm arrival manually'
              : `GPS accuracy is low (${Math.round(accuracy)} m) — confirm you're at the address`}
          </span>
        </>
      )}
      {!arrived && !gpsUnavailable && !canAutoArrive && (
        <>
          <button
            type="button"
            disabled
            title={arrivalHint}
            className="px-3 py-2 text-xs font-bold rounded-xl border bg-slate-50 text-slate-400 border-slate-200 flex items-center gap-1.5 disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Arrived
          </button>
          <span className="text-[10px] font-semibold text-slate-400 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {arrivalHint}
          </span>
        </>
      )}
      {arrived && (
        <span className="px-3 py-2 text-xs font-bold rounded-xl border bg-emerald-600/10 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" />
          Arrived at customer
        </span>
      )}

      {manualConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full text-left">
            <h4 className="text-sm font-extrabold text-slate-900">Confirm your arrival?</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              We couldn't detect a reliable GPS fix. Confirm you are already at the customer's service address to
              submit your quotation.
            </p>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                type="button"
                onClick={() => setManualConfirm(false)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualConfirm(false);
                  fire('ARRIVED', 'manual');
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400"
              >
                Confirm Arrival
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

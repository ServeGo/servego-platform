import React, { useState } from 'react';
import { Calendar, MapPin, FileText, MessageSquare, Navigation, UserCheck, Hourglass, IndianRupee, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LiveTrackingMap } from './LiveTrackingMap';
import ChatPanel from './ChatPanel';
import { useRealtime, useToast } from '../context/AppContext';
import { SERVICE_FEE_DEFAULT } from './QuotationModal';

function DispatchStepper({ phase }) {
  const steps = [
    { key: null, label: 'Confirmed', icon: Calendar, desc: 'Provider assigned' },
    { key: 'ON_THE_WAY', label: 'On the way', icon: Navigation, desc: 'Provider is travelling to you' },
    { key: 'ARRIVED', label: 'Arrived', icon: UserCheck, desc: 'Provider is at your location' }
  ];
  const reached = (stepKey) => {
    if (stepKey === null) return true;
    if (stepKey === 'ON_THE_WAY') return phase === 'ON_THE_WAY' || phase === 'ARRIVED';
    return phase === 'ARRIVED';
  };

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        const active = reached(step.key);
        const Icon = step.icon;
        return (
          <div key={step.key ?? 'start'} className="flex-1 flex items-center gap-1">
            <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 ${active ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="leading-none">
                <span className={`text-[9px] font-extrabold uppercase tracking-wide block ${active ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                <span className="hidden sm:block text-[9px] text-slate-400 font-semibold">{step.desc}</span>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${reached(steps[idx + 1].key) ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingCard({ 
  booking, 
  onDownloadReceipt, 
  onCancel, 
  onReview,
  onQuotationConfirm,
  onQuotationCancel,
  chatOpen,
  onToggleChat,
  onSendMessage
}) {
  const { getBookingLocation } = useRealtime();
  const { showToast } = useToast();
  const liveLocation = getBookingLocation(booking.id);
  const dispatchPhase = liveLocation?.providerPhase || booking.providerPhase || null;
  const timeline = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
  const [cancelling, setCancelling] = useState(false);
  const quotation = booking.quotation || null;
  const quotationSubmitted = quotation && String(quotation.status).toUpperCase() === 'SUBMITTED';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs p-4 sm:p-5 text-left">
      {/* Top line panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-100 mb-4 text-[11px] font-bold">
        <div className="flex justify-start w-full sm:w-auto">
          <StatusBadge status={booking.status} />
        </div>

        <div className="flex justify-end w-full sm:w-auto min-w-0">
          <span className="text-slate-400 uppercase tracking-tight">Booking {booking.bookingNumber ? 'No' : 'ID'}: <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded break-all">{booking.bookingNumber || booking.id}</span></span>
        </div>
      </div>

      {/* Meta and description column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-4 mb-4 border-b border-slate-100/60">
        {booking.status === 'pending' ? (
          <div className="md:col-span-4 flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg shrink-0 border border-amber-200 bg-amber-50 flex items-center justify-center">
              <Hourglass className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-800 text-[13px] leading-snug">Your request has been sent to all eligible specialists</h4>
              <span className="text-[11px] text-slate-500 font-medium leading-snug block mt-0.5">The first specialist to accept your job will be assigned. You can track their details here once confirmed.</span>
            </div>
          </div>
        ) : (
          <div className="md:col-span-4 flex items-start gap-3">
            <img className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200" src={booking.providerAvatar} alt={booking.providerName || 'Provider avatar'} />
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Assigned Expert</span>
              <h4 className="font-bold text-slate-800 text-sm">{booking.providerName}</h4>
              <span className="text-xs text-slate-500 font-medium">{booking.serviceCategory}</span>
            </div>
          </div>
        )}

        <div className="md:col-span-5 space-y-2 text-xs font-semibold text-slate-500">
          <div className="flex gap-1.5 items-start">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-800 flex-1 min-w-0 leading-snug">{booking.bookingDateLabel || booking.createdAt}</span>
          </div>
          <div className="flex gap-1.5 items-start">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-700 flex-1 min-w-0 leading-tight break-words text-[11px]" title={booking.locationAddress}>{booking.locationAddress}</span>
          </div>
          {booking.instructions && (
            <div className="flex gap-1.5 items-start">
              <span className="bg-indigo-50 text-indigo-700 font-bold px-1 rounded text-[9px] uppercase border border-indigo-100 shrink-0 mt-0.5">Note</span>
              <span className="italic flex-1 min-w-0 leading-snug">"{booking.instructions}"</span>
            </div>
          )}
        </div>

        <div className="md:col-span-3 text-left md:text-right flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-2">
          {booking.status === 'completed' && (
            <button 
              onClick={() => onDownloadReceipt(booking)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors shadow-3xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Receipt</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Tracking Map */}
      {['confirmed', 'ongoing', 'in_progress', 'en_route'].includes(booking.status) && (
        <div className="mb-6 rounded-xl overflow-hidden border border-slate-200">
          <LiveTrackingMap booking={booking} liveLocation={liveLocation} />
        </div>
      )}

      {/* Dispatch stepper (Uber-style): requested → on the way → arrived */}
      {['confirmed', 'ongoing', 'in_progress', 'en_route'].includes(booking.status) && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-2 block">Dispatch Progress</span>
          <DispatchStepper phase={liveLocation?.providerPhase || booking.providerPhase || null} />
        </div>
      )}

      {/* Timeline */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 mb-3">
        <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-2 block">Tracking Timeline</span>
        {timeline.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">No tracking events available for this booking yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch">
            {timeline.map((hist, idx) => (
              <div key={idx} className="flex-1 relative flex sm:flex-col gap-2 items-start text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-200">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-slate-800 uppercase tracking-tight text-[10px]">{hist.status}</span>
                </div>
                <div className="pl-7 sm:pl-0 sm:mt-1 font-semibold">
                  <p className="text-slate-600 text-[10px] leading-tight mt-0.5">{hist.note}</p>
                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{formatTimelineTime(hist.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live quotation review — the customer decides to confirm (work starts)
          or decline (pays the flat service fee). Never shown for other states. */}
      {booking.status === 'confirmed' && quotationSubmitted && (
        <QuotationReviewPanel
          booking={booking}
          quotation={quotation}
          onConfirm={onQuotationConfirm}
          onCancel={onQuotationCancel}
        />
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {(booking.status === 'pending' || (booking.status === 'confirmed' && !quotationSubmitted)) && dispatchPhase !== 'ARRIVED' && (
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              if (cancelling) return;
              if (window.confirm('Are you sure you want to cancel this booking?')) {
                setCancelling(true);
                try {
                  const result = await onCancel(booking.id, 'cancelled', 'Cancelled by customer');
                  if (result?.error) {
                    showToast({ title: 'Could not cancel booking', message: result.error, type: 'error' });
                  }
                } finally {
                  setCancelling(false);
                }
              }
            }}
            className={`px-4 py-2 border rounded-lg text-xs font-bold whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cancelling ? 'bg-rose-50 text-rose-700 border-rose-200' : 'border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600'}`}
          >
            {cancelling ? 'Processing…' : 'Cancel Booking'}
          </button>
        )}

        {['confirmed', 'in_progress', 'en_route', 'ongoing'].includes(booking.status) && (
          <button 
            type="button"
            disabled
            onClick={onToggleChat}
            className="px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat with Specialist</span>
          </button>
        )}

        {['completed', 'reviewed'].includes(booking.status) && !booking.reviewed && (
          <button 
            onClick={() => onReview(booking)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-bold rounded-lg text-xs transition-colors border border-indigo-500/10 shadow-sm"
          >
            Review & Rate
          </button>
        )}
        
        {['completed', 'reviewed'].includes(booking.status) && booking.reviewed && (
          <span className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase px-4 py-2 rounded-xl border border-slate-200 tracking-wide">
            Verified Review Shared
          </span>
        )}
      </div>

      {chatOpen && (
        <ChatPanel
          booking={booking}
          onSend={onSendMessage}
        />
      )}
    </div>
  );
}

function formatTimelineTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

/**
 * The customer's decision panel for a submitted quotation. Confirming starts
 * the work (booking CONFIRMED → ONGOING); declining cancels the booking and
 * debits the flat ₹serviceFee from the wallet (unchanged when the customer asks
 * for another provider — the booking returns to the pool). Both actions POST
 * to dedicated quotation endpoints; the parent re-pulls the canonical booking
 * on success (rules 16 + 17: never optimistic for anything that moves money
 * or switches state).
 */
function QuotationReviewPanel({ booking, quotation, onConfirm, onCancel }) {
  const { showToast } = useToast();
  const items = Array.isArray(quotation?.items) ? quotation.items : [];
  const fee = Number(quotation?.serviceFee) || SERVICE_FEE_DEFAULT;
  const total = Number(quotation?.totalAmount) || fee + items.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const [decision, setDecision] = useState(null); // null | 'confirm' | 'cancel'
  const [anotherProvider, setAnotherProvider] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const runAction = async (fn, successMsg) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await fn();
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    showToast({ title: successMsg, type: 'success' });
    setDecision(null);
    setBusy(false);
  };

  return (
    <div className="mb-4 bg-teal-50/70 border-2 border-teal-200 rounded-2xl p-5 text-left">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-black text-slate-900">Quotation from {booking.providerName}</h4>
            <p className="text-[11px] text-slate-500 font-semibold">
              The specialist has priced the job. Confirm to start work, or decline — a fee of ₹{fee} applies.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-bold text-slate-600">servego24 Service Fee</span>
            <span className="text-sm font-black text-teal-700">₹{Number(fee).toLocaleString('en-IN')}</span>
          </div>
          {items.length === 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-400 italic">No itemised charges — just the service fee</span>
            </div>
          )}
          {items.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-700">{row.purpose}</span>
              <span className="text-sm font-bold text-slate-800">₹{Number(row.amount || 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900">
            <span className="text-xs font-black text-white uppercase tracking-wide">Total to Pay</span>
            <span className="text-base font-black text-white flex items-center gap-1.5 whitespace-nowrap">
              <IndianRupee className="w-4 h-4 shrink-0" /> {total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {error}
          </div>
        </div>
      )}

      {decision === null && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setDecision('cancel')}
            className="flex-1 sm:flex-none px-2 sm:px-5 py-2.5 border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all disabled:opacity-50"
          >
            <span className="sm:hidden">Decline</span>
            <span className="hidden sm:inline">Decline · Pay ₹{Number(fee).toLocaleString('en-IN')}</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => onConfirm(booking.id), 'Work started')}
            className="flex-1 sm:flex-none px-2 sm:px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] sm:text-xs font-black whitespace-nowrap transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {busy ? 'Processing…' : <span><span className="sm:hidden">Confirm &amp; Start</span><span className="hidden sm:inline">Confirm &amp; Start Work</span></span>}
          </button>
        </div>
      )}

      {decision === 'cancel' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-600 font-semibold">
            Declining cancels this booking. A flat ₹{Number(fee).toLocaleString('en-IN')} service fee is billed to your
            account for the specialist's time — it is paid to the specialist either way.
          </p>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={anotherProvider}
              onChange={(e) => { setAnotherProvider(e.target.checked); if (!e.target.checked) setError(''); }}
              className="mt-0.5 w-4 h-4 accent-teal-600"
            />
            <span className="text-xs font-semibold text-slate-700 leading-snug">
              Ask servego24 to find another specialist instead <span className="text-slate-400 font-medium">(₹{Number(fee).toLocaleString('en-IN')} fee still applies — please tell us why)</span>
            </span>
          </label>
          {anotherProvider && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Reason for requesting another specialist <span className="text-rose-600">*</span></label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="e.g. The specialist wasn't able to take on the job as discussed."
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => { setDecision(null); setError(''); setReason(''); }}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy || (anotherProvider && !reason.trim())}
              onClick={() => runAction(() => onCancel(booking.id, anotherProvider, reason.trim()), anotherProvider ? 'Finding another specialist' : 'Booking cancelled')}
              className="flex-1 sm:flex-none px-2 sm:px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] sm:text-xs font-black whitespace-nowrap transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Processing…' : (
                <span>
                  <span className="sm:hidden">{anotherProvider ? 'Decline & Next' : 'Decline & Cancel'}</span>
                  <span className="hidden sm:inline">{anotherProvider ? 'Decline & Next Specialist' : 'Decline & Cancel'} · ₹{Number(fee).toLocaleString('en-IN')}</span>
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {  const styles = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-sky-100 text-sky-800 border-sky-200',
    en_route: 'bg-amber-500 text-slate-900 border-amber-400 animate-pulse',
    ongoing: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
  };
  const labels = {
    pending: 'Waiting for Specialist',
    confirmed: 'Confirmed',
    en_route: 'Specialist En-Route',
    ongoing: 'Ongoing Job',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return (
    <span className={`${styles[status] || 'bg-slate-100'} px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border`}>
      {labels[status] || status}
    </span>
  );
}

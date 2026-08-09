import React from 'react';
import { Calendar, MapPin, FileText, MessageSquare, ShieldCheck, Navigation, UserCheck, Hourglass } from 'lucide-react';
import { LiveTrackingMap } from './LiveTrackingMap';
import ChatPanel from './ChatPanel';
import { useApp } from '../context/AppContext';

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
  customerVerificationCode,
  onDownloadReceipt, 
  onCancel, 
  onReview,
  chatOpen,
  onToggleChat,
  chatInput,
  setChatInput,
  onSendMessage
}) {
  const { getBookingLocation } = useApp();
  const liveLocation = getBookingLocation(booking.id);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs p-5 sm:p-6 text-left">
      {/* Top line panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4 mb-5 text-xs font-bold">
        <div>
          <span className="text-slate-400 uppercase tracking-tight">Booking ID: <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{booking.id}</span></span>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {/* Meta and description column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-6 mb-5 border-b border-slate-100/60">
        {booking.status === 'pending' ? (
          <div className="md:col-span-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl shrink-0 border border-amber-200 bg-amber-50 flex items-center justify-center">
              <Hourglass className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wide">Waiting for Specialist</span>
              <h4 className="font-bold text-slate-800 text-sm">Your request has been sent to all eligible specialists</h4>
              <span className="text-xs text-slate-500 font-medium">The first specialist to accept your job will be assigned. You can track their details here once confirmed.</span>
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
          <div className="flex gap-1.5 items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-800">{booking.bookingDateLabel || booking.createdAt}</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-700 leading-tight">{booking.locationAddress}</span>
          </div>
          {booking.instructions && (
            <div className="flex gap-1.5 items-center">
              <span className="bg-indigo-50 text-indigo-700 font-bold px-1 rounded text-[9px] uppercase border border-indigo-100">Note</span>
              <span className="italic">"{booking.instructions}"</span>
            </div>
          )}
        </div>

        <div className="md:col-span-3 text-left md:text-right flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-2">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block leading-none">Booked</span>
            <span className="text-xs font-bold text-slate-700 block mt-1">{new Date(booking.createdAt).toLocaleDateString()}</span>
          </div>

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
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-4">
        <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-3 block">Tracking Timeline</span>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch">
          {booking.statusHistory?.map((hist, idx) => (
            <div key={idx} className="flex-1 relative flex sm:flex-col gap-2 items-start text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-200">
                  {idx + 1}
                </div>
                <span className="font-bold text-slate-800 uppercase tracking-tight text-[10px]">{hist.status}</span>
              </div>
              <div className="pl-7 sm:pl-0 sm:mt-1 font-semibold">
                <p className="text-slate-600 text-[10px] leading-tight mt-0.5">{hist.note}</p>
                <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Code */}
      {['confirmed', 'in_progress', 'en_route', 'ongoing'].includes(booking.status) && customerVerificationCode && (
        <div className="mb-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">Your Verification Code</span>
          </div>
          <p className="text-[10px] text-indigo-600 font-semibold mb-2">Share this 4-digit code with the specialist to start the service</p>
          <div className="text-4xl font-black text-indigo-700 tracking-[0.3em] font-mono bg-white rounded-xl py-3 border border-indigo-100 shadow-sm">
            {customerVerificationCode}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {['confirmed', 'in_progress', 'en_route', 'ongoing'].includes(booking.status) && (
          <button 
            type="button"
            onClick={onToggleChat}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-3xs ${chatOpen ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{chatOpen ? 'Hide Chat' : 'Chat with Specialist'}</span>
          </button>
        )}

        {['pending', 'confirmed'].includes(booking.status) && (
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to cancel this booking?')) {
                onCancel(booking.id, 'cancelled', 'Cancelled by customer');
              }
            }}
            className="px-4 py-2 border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
          >
            Cancel Booking
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
          input={chatInput}
          setInput={setChatInput}
          onSend={onSendMessage}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
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

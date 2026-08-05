import React, { useState } from 'react';
import { Send, ShieldAlert, User, UserCheck, BadgeCheck } from 'lucide-react';

const STATUS_STYLES = {
  open: 'bg-amber-50 text-amber-800 border-amber-300',
  in_review: 'bg-sky-50 text-sky-800 border-sky-300',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

const REASON_LABELS = {
  QUALITY_ISSUE: 'Quality issue',
  SERVICE_NOT_PROVIDED: 'Service not provided',
  PRICING_ISSUE: 'Pricing issue',
  DAMAGE: 'Damage caused',
  BEHAVIOR: 'Professional behavior',
  NO_SHOW: 'No show / late arrival',
  OTHER: 'Other'
};

export function disputeStatusLabel(status) {
  return (status || 'open').replace('_', ' ');
}

export function disputeReasonLabel(reason) {
  return REASON_LABELS[reason] || REASON_LABELS.OTHER;
}

export function DisputeStatusBadge({ status }) {
  const key = (status || 'open').toLowerCase();
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${STATUS_STYLES[key] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {disputeStatusLabel(key)}
    </span>
  );
}

export function formatDisputeTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DisputeThread({ dispute, currentUserId, onReply, onResolve, onReject, busy = false }) {
  const [message, setMessage] = useState('');
  const [resolution, setResolution] = useState(null);

  const isAdmin = typeof onResolve === 'function';
  const canReply = ['open', 'in_review'].includes(dispute?.status) && (isAdmin || currentUserId);

  const submitReply = async (e) => {
    e.preventDefault();
    if (!message.trim() || !onReply) return;
    const ok = await onReply(message.trim());
    if (ok) setMessage('');
  };

  const submitResolve = async () => {
    if (!resolution) return;
    await onResolve(resolution);
  };

  return (
    <div className="space-y-4">
      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
          Customer: <span className="text-slate-800">{dispute.customerName}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-teal-600" />
          Specialist: <span className="text-slate-800">{dispute.providerName}</span>
        </span>
        {dispute.serviceCategory && (
          <span className="text-slate-400">{dispute.serviceCategory}</span>
        )}
        {dispute.bookingAmount > 0 && (
          <span className="text-slate-400">
            Booking amount: <span className="text-slate-800">₹{Number(dispute.bookingAmount).toLocaleString('en-IN')}</span>
          </span>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Raised by {dispute.raisedBy === 'PROVIDER' ? 'Specialist' : 'Customer'} · {disputeReasonLabel(dispute.reason)}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{dispute.description}</p>
        {dispute.evidence?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dispute.evidence.map((ev, i) => (
              <span key={i} className="text-[9px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">
                {typeof ev === 'string' ? ev : ev?.name || ev?.url || 'attachment'}
              </span>
            ))}
          </div>
        )}
        {dispute.adminNote && (
          <div className="mt-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-600">
            <span className="text-rose-600 font-extrabold block mb-0.5">Admin note</span>
            {dispute.adminNote}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {dispute.messages?.length === 0 && (
          <p className="text-[11px] italic text-slate-400 font-medium text-center py-3">
            No messages yet. Start the conversation below.
          </p>
        )}
        {dispute.messages.map((m) => {
          const mine = m.senderId === currentUserId || (isAdmin && m.senderRole === 'admin');
          const roleLabel = m.senderRole === 'admin' ? 'Admin' : m.senderRole === 'customer' ? 'Customer' : 'Specialist';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 border ${mine ? 'bg-indigo-600 text-white border-indigo-700 rounded-br-md' : 'bg-white text-slate-700 border-slate-200 rounded-bl-md'}`}>
                <div className={`text-[9px] font-black uppercase tracking-wide mb-1 flex items-center gap-1 ${mine ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {m.senderRole === 'admin' && <BadgeCheck className="w-3 h-3" />}
                  {roleLabel}
                </div>
                <p className="text-xs font-medium leading-relaxed">{m.message}</p>
                <span className={`text-[9px] font-mono block mt-1 ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {formatDisputeTime(m.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin resolution controls */}
      {isAdmin && ['open', 'in_review'].includes(dispute.status) && (
        <div className="border-t border-slate-200 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { type: 'FULL_REFUND', label: 'Full Refund' },
              { type: 'PARTIAL_REFUND', label: 'Partial Refund' },
              { type: 'NO_REFUND', label: 'No Refund' }
            ].map((r) => (
              <button
                key={r.type}
                type="button"
                onClick={() => setResolution(r.type)}
                disabled={busy}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border transition-all disabled:opacity-50 ${resolution === r.type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {resolution && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {resolution === 'PARTIAL_REFUND' && (
                <input
                  type="number"
                  min="0"
                  placeholder="Refund amount ₹"
                  onChange={(e) => setResolution({ type: 'PARTIAL_REFUND', amount: e.target.value })}
                  className="w-36 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-teal-500"
                />
              )}
              <button
                type="button"
                onClick={submitResolve}
                disabled={busy || (resolution === 'PARTIAL_REFUND' && !resolution.amount)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase disabled:bg-emerald-300 transition-colors"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={async () => { if (onReject && window.confirm('Reject this dispute without a refund?')) await onReject(); }}
                disabled={busy}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border border-rose-200 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reply box */}
      {canReply && (
        <form onSubmit={submitReply} className="flex items-end gap-2 pt-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder={isAdmin ? 'Write a message to both parties…' : 'Write a reply…'}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 resize-none"
          />
          <button
            type="submit"
            disabled={!message.trim() || busy}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:bg-slate-300 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      )}

      {!canReply && (
        <p className="text-[10px] italic text-slate-400 font-medium text-center py-1">
          This dispute is closed.
        </p>
      )}
    </div>
  );
}

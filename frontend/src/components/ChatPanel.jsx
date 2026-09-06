import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '../context/AppContext';

const QUICK_REPLIES = [
  { label: "I'm at the location", message: "I'm at the location now." },
  { label: 'Please call me', message: 'Please call me when you arrive.' },
  { label: 'Are you on your way?', message: 'Are you on your way?' },
];

/**
 * Quick-reply chat for the customer (Rapido/Uber style). No free-text input —
 * the customer picks from preset messages so the specialist gets a clear,
 * standard signal without a live interaction loop.
 */
export default function ChatPanel({ booking, onSend, sending }) {
  const { showToast } = useToast();
  const [sendingKey, setSendingKey] = useState(null);
  const isSending = sending ?? (sendingKey !== null);

  const quickSend = async (message) => {
    if (isSending) return;
    setSendingKey(message);
    try {
      const result = await onSend(booking.id, message, 'customer');
      if (result && result.ok === false) {
        showToast({ title: 'Could not send message', message: result.error, type: 'error' });
      }
    } finally {
      setSendingKey(null);
    }
  };

  return (
    <div className="mt-4 border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden flex flex-col h-80 animate-fade-in shadow-xs text-left">
      <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">Quick Messages</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-200 px-2 py-0.5 rounded">ID: {booking.id}</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col min-h-0 bg-white">
        {(!booking.messages || booking.messages.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <h5 className="font-extrabold text-slate-800 text-xs">Send a quick message to {booking.providerName}</h5>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] font-medium">
              Tap a preset message below — no need to type.
            </p>
          </div>
        ) : (
          booking.messages.map((m) => {
            const isSelf = m.senderRole === 'customer';
            return (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${isSelf ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'}`}>
                  {m.text}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-bold uppercase">
                  <span>{m.senderName.split(' ')[0]}</span>
                  <span>•</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-slate-200 bg-white flex gap-2 shrink-0">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q.message}
            type="button"
            disabled={isSending}
            onClick={() => quickSend(q.message)}
            className="flex-1 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 text-[10px] font-bold rounded-xl px-2 py-2.5 transition-colors disabled:opacity-50"
          >
            {isSending && sendingKey === q.message ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatPanel({ booking, input, setInput, onSend, sending }) {
  const [localSending, setLocalSending] = useState(false);
  const isSending = sending ?? localSending;
  return (
    <div className="mt-4 border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden flex flex-col h-80 animate-fade-in shadow-xs text-left">
      <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider">Direct Specialist Support</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-200 px-2 py-0.5 rounded">ID: {booking.id}</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col min-h-0 bg-white">
        {(!booking.messages || booking.messages.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <h5 className="font-extrabold text-slate-800 text-xs">Chat with {booking.providerName}</h5>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] font-medium">
              Coordinate arrival times, landmarks, or specific job details here.
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

      <form 
        onSubmit={async (e) => { e.preventDefault(); if (!input.trim()) return; setLocalSending(true); try { await onSend(booking.id, input, 'customer'); setInput(''); } finally { setLocalSending(false); } }}
        className="p-2 border-t border-slate-200 bg-white flex gap-2 shrink-0"
      >
        <input 
          type="text"
          placeholder="Type message to specialist..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none"
        />
        <button 
          type="submit"
          disabled={isSending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-all w-8 h-8 flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  );
}

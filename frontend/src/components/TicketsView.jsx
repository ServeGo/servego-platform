import React from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function TicketsView({ tickets, onSubmit, subject, setSubject, message, setMessage, success, submitting }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
      {/* Raise Ticket */}
      <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="font-bold text-slate-900 text-sm">Raise a New Ticket</h4>
        <p className="text-slate-500 text-xs mt-1 font-medium">Contact support for billing, refunds, or complaints.</p>

        {success && (
          <div className="my-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold">
            ✔ Ticket successfully dispatched
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="Payment Refund Support">Payment Refund Support</option>
              <option value="Accidental Damage Claim">Accidental Damage Claim</option>
              <option value="Specialist Behavior Complaint">Behavior Complaint</option>
              <option value="Account & Profile Settings">Account Settings</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Details *</label>
            <textarea
              rows={3}
              required
              placeholder="Describe your issue clearly..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
          </button>
        </form>
      </div>

      {/* Ticket History */}
      <div className="lg:col-span-7 space-y-4">
        <h4 className="font-bold text-slate-900 text-sm">Help Desk History</h4>
        
        {tickets.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium italic">No support tickets found.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">ID: {t.id}</span>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{t.subject}</h5>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[9px] uppercase font-black rounded-full border ${t.status === 'open' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {t.status}
                  </span>
                </div>

                <p className="text-slate-600 text-xs italic font-medium leading-relaxed">"{t.message}"</p>

                {t.response && (
                  <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-lg text-xs leading-relaxed text-slate-700 font-medium">
                    <span className="font-extrabold text-indigo-600 block mb-1">Support Response:</span>
                    "{t.response}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

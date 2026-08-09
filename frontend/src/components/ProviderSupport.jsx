import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ProviderSupport({
  tickets = [],
  onSubmit,
  subject,
  setSubject,
  message,
  setMessage,
  success,
  submitting
}) {

  // Keep for future expansion; currently UI uses raw ticket status.
  // const statusPill = (normStatus) => {
  //   const s = normStatus || '';
  //   if (s === 'OPEN') {
  //     return {
  //       text: 'OPEN',
  //       className:
  //         'bg-amber-50 border-amber-200 text-amber-800'
  //     };
  //   }
  //   if (s === 'RESOLVED' || s === 'CLOSED') {
  //     return {
  //       text: s === 'RESOLVED' ? 'RESOLVED' : 'CLOSED',
  //       className:
  //         'bg-emerald-50 border-emerald-200 text-emerald-800'
  //     };
  //   }
  //   return { text: normStatus || 'UNKNOWN', className: 'bg-slate-50 border-slate-200 text-slate-700' };
  // };

  return (
    <div className="space-y-6 text-left">
      <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Partner Support Desk</h3>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="font-extrabold text-slate-900 text-sm uppercase">Submit Support Ticket</h4>
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold">✔ Ticket raised successfully</div>}
          <form onSubmit={onSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Category *</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 outline-none" placeholder="e.g. Payment Delay" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Details *</label>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 outline-none" placeholder="Concern description..." />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl shadow-sm transition-all uppercase tracking-widest text-[10px] disabled:opacity-50 flex items-center justify-center gap-1.5">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {submitting ? 'Submitting...' : 'Submit Regional Ticket'}
            </button>
          </form>
        </div>

        <div className="md:col-span-7 space-y-4">
          <h4 className="font-extrabold text-slate-900 text-sm uppercase">Raised Assistance Queue</h4>
          {tickets.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 italic text-xs font-semibold">No active tickets found.</div>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-1.5 py-0.5 rounded">#{t.id}</span>
                      <h5 className="font-black text-slate-900 text-xs mt-1 uppercase">{t.subject}</h5>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                        String(t.status || '').toUpperCase() === 'OPEN'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {String(t.status || '').toUpperCase()}
                    </span>

                  </div>
                  <p className="text-slate-600 font-medium text-xs italic">"{t.message}"</p>
                  {t.response && (
                    <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-lg text-xs leading-relaxed text-slate-700">
                      <span className="font-black text-indigo-600 block mb-1">Response:</span> "{t.response}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

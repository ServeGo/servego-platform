import React from 'react';
import { Info } from 'lucide-react';
import { TICKET_STATUS, normalizeTicketStatus } from '../../utils/normalizeAdminData';


export default function AdminTicketsPanel({ tickets, activeTicketId, ticketResponse, setTicketResponse, setActiveTicketId, handleTicketResolveSubmit }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Support Tickets & Escalation Desk</h2>
        <p className="text-slate-500 text-xs">Respond to complaints, authorize refunds, edit credentials, and modify ticket properties.</p>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <Info className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 italic text-xs">No active help tickets raised by residents or partners.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => {
            const isReplying = activeTicketId === t.id;
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded block w-fit mb-1">{t.id}</span>
                    <h4 className="font-extrabold text-slate-950 text-sm">{t.subject}</h4>
                    <span className="text-xs text-slate-400 mt-1 block">
                      From Representative: <span className="font-bold text-slate-700">{t.name}</span> ({t.email})
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                  normalizeTicketStatus(t.status) === TICKET_STATUS.OPEN
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {normalizeTicketStatus(t.status)}
                  </span>

                </div>

                <p className="text-slate-705 text-xs italic font-semibold leading-relaxed">"{t.message}"</p>

                {t.response && (
                  <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl text-xs font-semibold leading-relaxed">
                    <span className="text-teal-700 font-extrabold block mb-1">Response Resolution:</span>
                    "{t.response}"
                  </div>
                )}

                {normalizeTicketStatus(t.status) === TICKET_STATUS.OPEN && (
                  <div className="pt-2">
                    {!isReplying ? (

                      <button
                        onClick={() => {
                          setActiveTicketId(t.id);
                          setTicketResponse('');
                        }}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-extrabold p-2 px-4 rounded-lg text-xs tracking-tight transition-colors focus:outline-none"
                      >
                        Write Resolution Response
                      </button>
                    ) : (
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wide">Write response *</label>
                        <textarea
                          value={ticketResponse}
                          onChange={(e) => setTicketResponse(e.target.value)}
                          rows={2}
                          placeholder="Greetings We completed escrow checkouts analysis and approved refund credit parameters..."
                          className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-850 focus:bg-white focus:outline-none outline-none border border-slate-300 focus:border-teal-600 transition-all"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setActiveTicketId(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleTicketResolveSubmit(t.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-2xs border border-emerald-500/10"
                          >
                            Authorize Settlement
                          </button>
                        </div>
                      </div>
                    )}
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


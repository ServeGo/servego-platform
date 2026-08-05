import React, { useState } from 'react';
import { MessageSquare, User, Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ChatPanel from './ChatPanel';

export default function LeadCard({ 
  lead, 
  onAccept, 
  onReject, 
  onTravel, 
  onStartWork, 
  onFinishWork,
  chatOpen,
  onToggleChat,
  chatInput,
  setChatInput,
  onSendMessage
}) {
  const [verificationCode, setVerificationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);

  const handleCompleteWithCode = async () => {
    setCodeError('');
    if (!verificationCode.trim() || verificationCode.trim().length !== 4) {
      setCodeError('Please enter the 4-digit verification code from the customer.');
      return;
    }
    setCodeSubmitting(true);
    try {
      await onFinishWork(lead.id, verificationCode.trim());
    } finally {
      setCodeSubmitting(false);
    }
  };
  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 overflow-hidden shadow-xs p-6 relative text-left">
      <div className="absolute top-6 right-6 text-right">
        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full border ${lead.status === 'pending' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-indigo-100 border-indigo-300 text-indigo-800'}`}>
          {lead.status === 'pending' ? 'Offer Received' : 'Active Duty'}
        </span>
      </div>

      <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mb-3 inline-block">ID: {lead.id}</span>
      <h4 className="text-base font-extrabold text-slate-900">{lead.serviceCategory} Request</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-bold text-xs text-slate-500 my-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block mb-1">Booked</span>
          <span className="text-slate-800">{lead.bookingDateLabel || lead.createdAt}</span>
        </div>
        
        <div>
          <span className="text-[10px] text-slate-400 uppercase block mb-1">Client Address</span>
          <span className="text-slate-800 leading-tight block">{lead.locationAddress}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase block mb-1">Service</span>
          <span className="text-indigo-600 font-black text-sm">{lead.serviceCategory}</span>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Customer Requirements</span>
        <p className="text-slate-700 text-xs font-semibold">
          <User className="w-3.5 h-3.5 inline-block mr-0.5" /> {lead.customerName || 'Client'}: <span className="text-slate-400 italic font-medium">"{lead.instructions || 'No special notes.'}"</span>
        </p>
      </div>

      <div className="mb-6">
        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Status Timeline</span>
        <div className="flex flex-wrap gap-2">
          {['pending', 'confirmed', 'ongoing', 'completed'].map(s => {
            const labels = {
              pending: 'Offer',
              confirmed: 'Accepted',
              ongoing: 'Work',
              completed: 'Done'
            };
            const order = ['pending', 'confirmed', 'ongoing', 'completed'];
            const currentIdx = order.indexOf(lead.status);
            const sIdx = order.indexOf(s);
            const isDone = sIdx <= currentIdx && currentIdx !== -1;
            const isActive = s === lead.status;
            return (
              <span
                key={s}
                className={`px-2 py-1 text-[10px] font-black rounded-xl border ${
                  isActive
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                    : isDone
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {labels[s]}
              </span>
            );
          })}
        </div>
      </div>


      <div className="flex gap-2 justify-end flex-wrap">
        <button 
          onClick={onToggleChat}
          className="mr-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 focus:outline-none"
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span>{chatOpen ? 'Hide Chat' : 'Chat with Client'}</span>
        </button>

        {lead.status === 'pending' && (
          <>
            <button
              onClick={() => { if (window.confirm('Decline this lead proposal?')) onReject(lead.id); }}
              className="bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 px-4 py-2 text-xs font-bold rounded-xl transition-all"
            >
              Decline
            </button>
            <button
              onClick={() => { if (window.confirm('Accept this job offer?')) onAccept(lead.id); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-xl transition-all"
            >
              Accept Job
            </button>
          </>
        )}


        {lead.status === 'confirmed' && (
          <button
            onClick={() => onStartWork(lead.id)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" /> Start Work
          </button>
        )}

        {lead.status === 'ongoing' && (
          <div className="w-full">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">Verify with Customer Code</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold mb-3">Ask the customer for their 4-digit verification code to complete the job.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodeError(''); }}
                  placeholder="0000"
                  maxLength={4}
                  className="flex-1 bg-white border border-emerald-300 rounded-xl px-4 py-2.5 text-center text-xl font-black text-emerald-700 tracking-[0.2em] font-mono outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleCompleteWithCode}
                  disabled={codeSubmitting || verificationCode.length !== 4}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {codeSubmitting ? 'Verifying...' : 'Complete Job'}
                </button>
              </div>
              {codeError && <p className="text-[10px] text-rose-600 font-bold mt-2">{codeError}</p>}
            </div>
          </div>
        )}
      </div>

      {chatOpen && (
        <ChatPanel 
          booking={lead}
          input={chatInput}
          setInput={setChatInput}
          onSend={onSendMessage}
        />
      )}
    </div>
  );
}

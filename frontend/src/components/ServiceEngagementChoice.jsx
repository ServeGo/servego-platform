import React from 'react';
import { CalendarClock, Briefcase } from 'lucide-react';

export default function ServiceEngagementChoice({ serviceName, onTemporary, onPermanent, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full relative shadow-2xl animate-fade-in text-left">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">How would you like to hire?</h3>
            <p className="text-slate-500 text-xs font-medium">{serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Exit
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onTemporary}
            className="cursor-pointer w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-white transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">One-Time Service (Instant Booking)</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Need a quick fix?
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Offered instantly to top local specialists — the first available pro accepts and books directly.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onPermanent}
            className="cursor-pointer w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-600 bg-white transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Ongoing / Contract Service</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Need long-term support?
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  Share your project details, and our team will arrange and match the right specialist for you.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
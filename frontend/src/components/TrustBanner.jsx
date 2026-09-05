import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function TrustBanner({ onBrowse }) {
  return (
    <section className="bg-slate-900 text-white py-16 px-4 border-y border-slate-800">
      <div className="max-w-6xl mx-auto rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 lg:p-10 shadow-[0_30px_120px_-30px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <span className="text-teal-400 font-bold uppercase tracking-[0.25em] text-[11px]">ServeGo Trust Guarantee</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mt-2">A lead-based marketplace, not a listings board</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed font-medium">
              Every request is broadcast to eligible specialists at once, every provider is approved before they
              can work, and the admin team stays involved from onboarding to support.
            </p>

            <div className="mt-6 space-y-3 text-xs">
              <TrustPoint title="Verified specialist onboarding" desc="Provider profiles are reviewed and approved by the admin team before they can receive jobs." />
              <TrustPoint title="Broadcast, don't wait" desc="Your request is offered to every eligible specialist in your area at once — the first to accept gets the job." />
              <TrustPoint title="Admin oversight" desc="Services, reviews, providers, and support tickets are moderated from a central admin panel." />
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="bg-slate-950/80 border border-slate-800 rounded-[24px] p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 rounded border border-teal-500/30">
                Customer-friendly model
              </span>
              <h3 className="text-xl font-bold mt-3 leading-tight">No prepayment. Cash after the job.</h3>
              <p className="text-slate-300 text-xs mt-2 font-medium">
                Pay the specialist directly after the work is done — cash is the supported payment mode today.
              </p>

              <ul className="mt-4 space-y-2 text-[11px] text-slate-400 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  Free to join — no subscription or monthly fee for specialists.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  Final charges are agreed with the specialist before the job starts.
                </li>
              </ul>

              <button
                onClick={onBrowse}
                className="mt-6 bg-teal-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-teal-800 text-xs transition-colors flex items-center gap-1 shadow-md border border-teal-500/20 cursor-pointer"
              >
                <span>Browse Services</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustPoint({ title, desc }) {
  return (
    <div className="flex gap-2.5">
      <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded-full h-fit mt-0.5 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5" />
      </div>
      <div>
        <h4 className="font-bold text-slate-200">{title}</h4>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{desc}</p>
      </div>
    </div>
  );
}

import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function TrustBanner({ onBookAC }) {
  return (
    <section className="bg-slate-900 text-white py-14 px-4 border-y border-slate-800">
      <div className="max-w-6xl mx-auto rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 lg:p-10 shadow-[0_30px_120px_-30px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <span className="text-teal-400 font-bold uppercase tracking-[0.25em] text-[11px]">ServeGo Trust Guarantee</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mt-2">A premium marketplace built for trust, speed, and quality</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-3 leading-relaxed font-medium">
              ServeGo brings together verified providers, secure bookings, and admin-supported operations so customers can book confidently and professionals can grow their business reliably.
            </p>

            <div className="mt-6 space-y-3 text-xs">
              <TrustPoint title="Verified provider profiles" desc="Each professional is approved and visible through the platform with clear service readiness." />
              <TrustPoint title="Smart booking and lead handling" desc="Requests are routed through a reliable marketplace flow designed for quick response and clear follow-up." />
              <TrustPoint title="Consistent support and oversight" desc="Admin controls help maintain quality standards, service visibility, and customer confidence." />
            </div>
          </div>
          
          <div className="lg:col-span-5 relative">
            <div className="bg-slate-950/80 border border-slate-800 rounded-[24px] p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold uppercase tracking-[0.25em] px-2 py-0.5 rounded border border-teal-500/30">Launch Special</span>
              <h3 className="text-xl font-bold mt-3 leading-tight">Book AC Servicing or Cleanups & Save 15%</h3>
              <p className="text-slate-300 text-xs mt-2 font-medium">Promo valid till the end of this month for all homes in Hyderabad.</p>
              
              <div className="mt-6 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-[0.2em]">Use Code</span>
                  <span className="text-sm font-mono font-bold tracking-wider bg-slate-900 px-2.5 py-1 rounded border border-white/10 inline-block mt-1">HYDHEAT15</span>
                </div>
                <button 
                  onClick={onBookAC}
                  className="bg-teal-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-teal-800 text-xs transition-colors flex items-center gap-1 shadow-md border border-teal-500/20 cursor-pointer"
                >
                  <span>Book AC Repair</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
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

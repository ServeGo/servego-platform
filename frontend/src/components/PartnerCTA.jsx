import React from 'react';
import { ArrowRight, Clock, Briefcase } from 'lucide-react';

export default function PartnerCTA({ onApply }) {
  return (
    <section className="bg-slate-100 border-y border-slate-200 py-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 bg-gradient-to-br from-white via-emerald-50/70 to-slate-50 p-8 sm:p-12 rounded-[32px] border border-slate-200 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.25)]">
        <div className="max-w-xl text-left">
          <span className="text-emerald-600 font-bold uppercase tracking-[0.25em] text-[11px]">For Skilled Professionals</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">Grow your service business with ServeGo</h3>
          <p className="text-slate-500 text-sm sm:text-base mt-2 font-medium">
            Whether you are looking for contract jobs or long-term placements, ServeGo helps you connect with qualified customers through verified onboarding and lead-based opportunities.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <ServiceType icon={Clock} label="Lead-based work" sub="Short-term requests" />
            <ServiceType icon={Briefcase} label="Permanent roles" sub="Long-term placement" />
          </div>
        </div>
        
        <button 
          onClick={onApply}
          className="bg-slate-900 hover:bg-emerald-700 text-white font-bold px-6 py-4 rounded-2xl text-sm transition-all shadow-md shrink-0 whitespace-nowrap self-stretch sm:self-auto flex items-center justify-center gap-2 cursor-pointer" 
        >
          <span>Apply Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

function ServiceType({ icon: Icon, label, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-emerald-600" />
      </div>
      <div>
        <div className="text-slate-900 font-semibold text-sm leading-none">{label}</div>
        <div className="text-slate-400 text-[11px] mt-1">{sub}</div>
      </div>
    </div>
  );
}
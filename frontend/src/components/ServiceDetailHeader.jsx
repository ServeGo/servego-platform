import React from 'react';

export default function ServiceDetailHeader({ categoryMeta }) {
  return (
    <div className="bg-slate-950 rounded-2xl p-8 sm:p-10 text-white mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-indigo-500/10 text-left">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,#1e1b4b_0%,transparent_70%)] opacity-40 pointer-events-none" />
      <div className="relative z-10 max-w-2xl">
        <span className="text-indigo-400 font-bold uppercase tracking-wider text-xs">Vetted Hub Specialists</span>
        <h2 className="text-2xl sm:text-3.5xl font-extrabold font-sans mt-2 tracking-tight leading-none">
          Licensed {categoryMeta.name}s
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
          {categoryMeta.description} Send your request to every eligible specialist in your area and get the fastest vetted response.
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap gap-2 shrink-0 bg-white/5 border border-white/10 p-3 rounded-xl items-center text-xs font-bold text-slate-350">
        <span>Starting SLA: <span className="font-extrabold text-indigo-400">Within 60 Mins</span></span>
        <span className="text-slate-600">•</span>
        <span className="font-mono">Starts ₹{categoryMeta.basePrice}</span>
      </div>
    </div>
  );
}

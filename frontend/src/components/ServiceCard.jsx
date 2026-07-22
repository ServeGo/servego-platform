import React from 'react';
import { ArrowRight, Star } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

export default function ServiceCard({ 
  category, 
  providers, 
  onSelect, 
  onIssueClick 
}) {
  const safeProviders = Array.isArray(providers) ? providers : [];
  // Prefer server-derived count; fall back to client-side count
  const activeCount = typeof category.activeSpecialistCount === 'number'
    ? category.activeSpecialistCount
    : safeProviders.filter(
        (p) => (p.category || '').toLowerCase() === (category.name || '').toLowerCase() && p.isVerified
      ).length;

  const verifiedProviders = safeProviders.filter(
    (p) => (p.category || '').toLowerCase() === (category.name || '').toLowerCase() && p.isVerified
  );
  const bestRating = verifiedProviders.length > 0
    ? Math.max(...verifiedProviders.map(p => p.rating))
    : 5.0;


  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between text-left">
      <div className="p-5 sm:p-6">
        {/* Header line */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CategoryIcon name={category.name} className="w-5 h-5" />
          </div>

        </div>

        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight">{category.name}</h3>
        <p className="text-slate-505 text-xs mt-2 line-clamp-3 leading-relaxed font-semibold">{category.description}</p>

        {/* Popular issues checklist */}
        <div className="mt-4">
          <span className="text-[11px] font-bold text-slate-650 block mb-2 uppercase tracking-wide">Most Popular Requests:</span>
          <div className="flex flex-wrap gap-1.5">
            {category.popularIssues.slice(0, 3).map((issue, idx) => (
              <span 
                key={idx}
                onClick={() => onIssueClick(issue)}
                className="bg-slate-50 hover:bg-indigo-55 hover:text-indigo-600 cursor-pointer text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200/60 transition-colors"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Foot action banner */}
      <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-650">
        <div>
          <span className="font-bold text-slate-700 block text-[11px]">
            {activeCount} Active Specialists
          </span>
          <span className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
            <Star className="w-3 h-3 inline-block" /> {bestRating} Highest
          </span>
        </div>

        <button 
          onClick={() => onSelect(category.name)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2 px-3 rounded-lg text-xs transition-all flex items-center gap-1 group shadow-xs focus:outline-none"
        >
          <span>Book Now</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowRight, Star, Users } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

/**
 * Modern service category card — rounded glass-tile design with gradient
 * icon, rating + specialist pill meta, clickable popular-request chips and a
 * full-width Book Now action.
 */
export default function ServiceCard({
  category,
  providers,
  onSelect,
  onIssueClick,
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
    ? Math.max(...verifiedProviders.map((p) => p.rating))
    : 5.0;

  const issues = Array.isArray(category.popularIssues)
    ? category.popularIssues.slice(0, 3)
    : [];

  return (
    <article className="relative group flex flex-col justify-between bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-[0_26px_56px_-26px_rgba(15,23,42,0.35)] hover:-translate-y-1 hover:border-teal-300 transition-all text-left">
      {/* Accent bar appears on hover */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/15 to-indigo-500/15 text-teal-700 flex items-center justify-center ring-1 ring-teal-500/10 shrink-0">
            <CategoryIcon name={category.name} className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 text-[10px] font-black flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              {bestRating}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
              <Users className="w-3 h-3" />
              {activeCount} active
            </span>
          </div>
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-slate-900 tracking-tight capitalize">
          {category.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium line-clamp-3">
          {category.description}
        </p>

        {issues.length > 0 && (
          <div className="mt-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-2">
              Popular requests
            </span>
            <div className="flex flex-wrap gap-1.5">
              {issues.map((issue, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onIssueClick(issue)}
                  className="bg-slate-50 hover:bg-teal-50 hover:text-teal-700 cursor-pointer text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200/70 transition-colors"
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1">
        <button
          type="button"
          onClick={() => onSelect(category.id || category.name)}
          className="w-full bg-slate-900 hover:bg-teal-600 text-white font-black text-xs rounded-2xl py-3 flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
        >
          Book Now
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
}
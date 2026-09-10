import React from 'react';
import { ArrowRight, Star, Users } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

/**
 * Service category card — image left, rating top-left, specialist count
 * top-right, service details in the middle, full-width Book Now at bottom.
 */
export default function ServiceCard({
  category,
  providers,
  onSelect,
}) {
  const safeProviders = Array.isArray(providers) ? providers : [];
  const activeCount = typeof category.activeSpecialistCount === 'number'
    ? category.activeSpecialistCount
    : safeProviders.filter(
        (p) => (p.category || '').toLowerCase() === (category.name || '').toLowerCase() && p.isVerified
      ).length;

  const avgRating = Number(category.avgRating) || 0;

  return (
    <article className="relative group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-teal-300 transition-all text-left">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top row: rating left, specialist count right */}
      <div className="flex items-center justify-between px-5 pt-4 sm:px-6 sm:pt-5">
        {avgRating > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 text-[11px] font-black">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            {avgRating.toFixed(1)}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-1 text-[11px] font-bold">
          <Users className="w-3 h-3" />
          {activeCount} active
        </span>
      </div>

      {/* Middle: image left + name & description right */}
      <div className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-1 ring-slate-200 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-500/15 to-indigo-500/15 text-teal-700 flex items-center justify-center ring-1 ring-teal-500/10 shrink-0">
            <CategoryIcon name={category.name} className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight capitalize">
            {category.name}
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed font-medium line-clamp-2">
            {category.description}
          </p>
        </div>
      </div>

      {/* Bottom: centered full-width Book Now */}
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <button
          type="button"
          onClick={() => onSelect(category.id || category.name)}
          className="w-full bg-slate-900 hover:bg-teal-600 text-white text-xs sm:text-sm rounded-2xl py-3 flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
        >
          <span className="font-black">Book Now</span>
          <span className="text-[10px] sm:text-[11px] font-bold text-teal-100">₹199/-</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
}

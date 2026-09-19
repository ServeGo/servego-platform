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

      {/* Image takes the upper half of the card; metadata remains readable on it. */}
      <div className="relative h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-teal-500/15 to-indigo-500/15">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-teal-500/15 to-indigo-500/15 text-teal-700 flex items-center justify-center">
            <CategoryIcon name={category.name} className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-slate-950/10 pointer-events-none" />
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 text-white border border-white/20 px-2.5 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-sm">
          <Users className="w-3 h-3" />
          {activeCount} active
        </span>
      </div>

      {/* Service information and booking action */}
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight capitalize">
            {category.name}
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed font-medium line-clamp-2">
            {category.description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(category.id || category.name)}
          className="mt-5 w-full bg-slate-900 hover:bg-teal-600 text-white text-xs sm:text-sm rounded-2xl py-3 flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"
        >
          <span className="font-black">Book Now</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
}

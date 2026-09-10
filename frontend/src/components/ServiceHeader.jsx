import React from 'react';
import { MapPin, Search, X } from 'lucide-react';

const QUICK_FILTERS = ['Electrician', 'Plumber', 'AC Repair', 'Deep Cleaning', 'Painting'];

/**
 * Compact search header — dark pill-shaped bar with location, search input
 * and popular quick-filter chips. Mobile-first, no hero headline.
 */
export default function ServiceHeader({
  selectedArea,
  inputSearch,
  setInputSearch,
  onSearchSubmit,
  onSearchChange,
  onQuick,
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-slate-950 text-white px-4 py-4 sm:px-6 sm:py-5 mb-6">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl text-left">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-teal-400 mb-3">
          <MapPin className="w-3 h-3" />
          {selectedArea || 'Hyderabad'}
        </div>

        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 bg-white rounded-xl p-1.5 pl-3 shadow-lg">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => {
              const v = e.target.value;
              setInputSearch(v);
              onSearchChange?.(v);
            }}
            placeholder="Search services…"
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          {inputSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setInputSearch('');
                onSearchChange?.('');
              }}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search services"
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg px-3 sm:px-5 py-2 text-xs transition-colors shrink-0 flex items-center justify-center"
          >
            <Search className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="text-slate-500 font-bold uppercase tracking-wider mr-0.5">Popular:</span>
          {QUICK_FILTERS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQuick?.(q)}
              className="bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-bold px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
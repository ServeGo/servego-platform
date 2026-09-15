import React from 'react';
import { Search, X, ShieldCheck } from 'lucide-react';

/**
 * Compact search header — dark pill-shaped bar with search input
 * and popular quick-filter chips. Mobile-first, no hero headline.
 */
export default function ServiceHeader({
  topServices,
  inputSearch,
  setInputSearch,
  onSearchSubmit,
  onSearchChange,
  onQuick,
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-slate-950 text-white px-4 py-6 sm:px-6 sm:py-7 mb-6">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl text-left">
        <header className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
            Find Trusted Professionals
          </h2>
          <span className="inline-flex items-center gap-1 bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0">
            <ShieldCheck className="w-2.5 h-2.5" />
            Verified Professionals
          </span>
        </header>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-teal-400" />
            Verified &amp; Rated
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline">Transparent pricing</span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline">Hyderabad-wide coverage</span>
        </p>

        {/* Search bar — min-h keeps a comfortable ~44px touch target on phones */}
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 bg-white rounded-2xl p-1.5 pl-3 shadow-lg">
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
            className="flex-1 min-w-0 min-h-10 bg-transparent text-sm sm:text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />
          {inputSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setInputSearch('');
                onSearchChange?.('');
              }}
              className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search services"
            className="font-bold rounded-xl px-2 sm:px-5 min-h-10 text-xs sm:text-sm transition-colors shrink-0 flex items-center justify-center gap-1.5 text-slate-700 hover:text-slate-900 sm:bg-teal-600 sm:hover:bg-teal-500 sm:text-white"
          >
            <Search className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        {topServices.length > 0 && (
          <div className="mt-3.5 text-[10px]">
            <span className="text-slate-500 font-bold uppercase tracking-wider">Popular:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {topServices.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => onQuick?.(svc.name)}
                  className="bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  {svc.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
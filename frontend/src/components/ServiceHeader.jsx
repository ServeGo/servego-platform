import React from 'react';
import { MapPin, Search, X } from 'lucide-react';

const QUICK_FILTERS = ['Electrician', 'Plumber', 'AC Repair', 'Deep Cleaning', 'Painting'];

/**
 * Modern services hero — dark, glowy, mobile-first. Doubles as the search bar:
 * live-debounced (parent) with a clear button and popular quick filters.
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
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white px-5 py-8 sm:px-10 sm:py-10 mb-8">
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-indigo-600/25 blur-3xl" />
      <div className="absolute top-8 right-10 w-3 h-3 rounded-full bg-teal-400/70 animate-ping" />

      <div className="relative z-10 max-w-3xl text-left">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-teal-400">
          <MapPin className="w-3 h-3" />
          {selectedArea || 'Hyderabad'}
        </div>

        <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
          What do you need done <span className="text-teal-400">today?</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium max-w-xl leading-relaxed">
          Browse trusted services — vetted specialists dispatched across {selectedArea || 'Hyderabad'} in under 60 minutes.
        </p>

        <form onSubmit={onSearchSubmit} className="mt-6 flex items-center gap-2 bg-white rounded-2xl p-2 pl-3 sm:pl-4 shadow-[0_20px_50px_-20px_rgba(45,212,191,0.45)]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => {
              const v = e.target.value;
              setInputSearch(v);
              onSearchChange?.(v);
            }}
            placeholder="Search plumber, AC repair…"
            className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
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
            className="bg-teal-600 hover:bg-teal-500 text-white font-black rounded-xl px-3 sm:px-6 py-2.5 text-xs transition-colors shadow-sm shrink-0 flex items-center justify-center"
          >
            <Search className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="text-slate-500 font-bold uppercase tracking-wider mr-0.5">Popular:</span>
          {QUICK_FILTERS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQuick?.(q)}
              className="bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-bold px-3 py-1 rounded-full transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
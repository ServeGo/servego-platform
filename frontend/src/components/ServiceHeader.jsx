import React from 'react';
import { Search, X } from 'lucide-react';

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
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          What do you need done <span className="text-teal-400">today?</span>
        </h1>

        <form onSubmit={onSearchSubmit} className="mt-4 flex items-center gap-2 bg-white rounded-xl p-1.5 pl-3 shadow-[0_20px_50px_-20px_rgba(45,212,191,0.45)] max-w-xl">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => {
              const v = e.target.value;
              setInputSearch(v);
              onSearchChange?.(v);
            }}
            placeholder="Search service"
            className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          {inputSearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setInputSearch('');
                onSearchChange?.('');
              }}
              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search services"
            className="bg-teal-600 hover:bg-teal-500 text-white font-black rounded-lg px-3 py-2 text-[10px] transition-colors shadow-sm shrink-0 flex items-center justify-center"
          >
            <Search className="w-3.5 h-3.5 sm:hidden" />
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
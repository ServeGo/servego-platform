import React from 'react';
import { Search } from 'lucide-react';

export default function ServiceHeader({
  selectedArea,
  inputSearch,
  setInputSearch,
  onSearchSubmit,
  onSearchChange,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-slate-200">
      <div className="text-left">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
          <span>Hyderabad Hub</span>
          {selectedArea && (
            <span className="bg-indigo-100 text-indigo-805 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
              📍 {selectedArea}
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-sans text-slate-900 mt-2 tracking-tight leading-none">
          Our Professional Home Checklist
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium">
          Browse, filter, and compare top service tiers. Vetted specialists dispatched within 60 minutes.
        </p>
      </div>

      {/* Inline search bar */}
      <form onSubmit={onSearchSubmit} className="flex gap-2 w-full md:w-96 text-xs">
        <div className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 flex items-center text-slate-800">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => {
              const v = e.target.value;
              setInputSearch(v);
              onSearchChange?.(v);
            }}
            placeholder="Query plumber, painting, etc..."
            className="w-full bg-transparent text-xs font-semibold outline-none text-slate-850 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          />
        </div>
        <button 
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-5 py-2.5 text-xs transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          Filter
        </button>
      </form>
    </div>
  );
}

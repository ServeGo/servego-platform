import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useData } from '../context/AppContext';
import CategoryIcon from './CategoryIcon';

export default function CategoryGrid({ categories, providers, onCategoryClick, onSeeAll }) {
  const { services: backendServices } = useData();

  // Prefer the live backend catalog used by the Services page. If the parent
  // does not provide a list yet, fall back to the app context data fetched from /services.
  const safeProviders = Array.isArray(providers) ? providers : [];
  const sourceCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : Array.isArray(backendServices)
      ? backendServices
      : [];

  const safeCategories = sourceCategories
    .filter((cat) => cat && cat.isHidden !== true && cat.hidden !== true)
    .sort((a, b) => {
      const aCount = typeof a.activeSpecialistCount === 'number' ? a.activeSpecialistCount : 0;
      const bCount = typeof b.activeSpecialistCount === 'number' ? b.activeSpecialistCount : 0;
      if (bCount !== aCount) return bCount - aCount;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto">
      <div className="rounded-[32px] border border-slate-200 bg-white/80 p-6 sm:p-8 shadow-[0_25px_80px_-25px_rgba(15,23,42,0.2)] backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div>
            <span className="text-teal-700 font-bold uppercase tracking-[0.25em] text-[11px]">Categories</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900 mt-1 leading-none">What can we help you solve?</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">Pick from our list of high-quality home services</p>
          </div>
          <button 
            onClick={onSeeAll}
            className="mt-4 md:mt-0 inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold group transition-all text-xs focus:outline-none"
          >
            <span>See All Services</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {safeCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No services are currently available to display.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeCategories.map((cat) => {
          // Prefer server-derived count; fall back to client-side count for static entries
          const activeCount = typeof cat.activeSpecialistCount === 'number'
            ? cat.activeSpecialistCount
            : safeProviders.filter(
                (p) => (p.category || '').toLowerCase() === (cat.name || '').toLowerCase() && p.isVerified
              ).length;
          
          return (
            <div 
              key={cat.id}
              onClick={() => onCategoryClick(cat.name || cat.id)}
              className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 group-hover:bg-teal-700 group-hover:text-white transition-all border border-teal-500/10">
                  <CategoryIcon name={cat.name} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors uppercase tracking-tight">{cat.name}</h3>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2">{cat.description}</p>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
                <span className="text-slate-500 font-medium">{activeCount} Active Specialists</span>
                {cat.basePrice && <span className="text-teal-700 font-extrabold">Starts from ₹{cat.basePrice}</span>}
              </div>
            </div>
          );
        })}
          </div>
        )}
      </div>
    </section>
  );
}

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useData } from '../context/AppContext';
import ServiceCard from './ServiceCard';
import SkeletonLoader from './SkeletonLoader';

export default function CategoryGrid({ categories, providers, onCategoryClick, onSeeAll }) {
  const { services: backendServices } = useData();

  const safeProviders = Array.isArray(providers) ? providers : [];
  const sourceCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : Array.isArray(backendServices)
      ? backendServices
      : [];

  const topSix = sourceCategories
    .filter((cat) => cat && cat.isHidden !== true && cat.hidden !== true)
    .sort((a, b) => {
      const aCount = typeof a.activeSpecialistCount === 'number' ? a.activeSpecialistCount : 0;
      const bCount = typeof b.activeSpecialistCount === 'number' ? b.activeSpecialistCount : 0;
      if (bCount !== aCount) return bCount - aCount;
      return String(a.name || '').localeCompare(String(b.name || ''));
    })
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between">
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

      {topSix.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <SkeletonLoader type="card" count={6} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {topSix.map((cat) => (
            <ServiceCard
              key={cat.id}
              category={cat}
              providers={safeProviders}
              onSelect={(id) => onCategoryClick(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

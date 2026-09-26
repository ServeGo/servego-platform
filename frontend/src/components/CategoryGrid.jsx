import React from 'react';
import { AlertTriangle, ChevronRight, RefreshCw, WifiOff } from 'lucide-react';
import { useData } from '../context/AppContext';
import ServiceCard from './ServiceCard';
import SkeletonLoader from './SkeletonLoader';

export default function CategoryGrid({
  categories,
  providers,
  onCategoryClick,
  onSeeAll,
  loading = false,
  error = null,
  stale = false,
  onRetry
}) {
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

  // Only a failure with nothing to show is an error state. A failed background
  // revalidation behind real data is just a nudge, never an empty grid.
  const hasData = topSix.length > 0;

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
          className="mt-4 md:mt-0 self-end md:self-auto inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold group transition-all text-xs focus:outline-none"
        >
          <span>See All Services</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

        {loading && !hasData ? (
          // The grid classes go on SkeletonLoader itself, not a wrapper div.
          // A wrapper puts the grid on the parent and the skeleton items on a
          // single inner block, so all six stack in one column while the real
          // cards below sit in three columns.
          <SkeletonLoader
            type="card"
            count={6}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          />
        ) : !hasData && error ? (
        // Rule 19: say what happened and what to do next. This replaced a bare
        // "No services available yet" that also appeared on every transient
        // network failure.
        <div
          role="alert"
          className="text-center py-14 sm:py-20 bg-white rounded-3xl border border-amber-200 shadow-2xs max-w-xl mx-auto px-6"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <WifiOff className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 tracking-tight">We couldn&apos;t load our services</h3>
          <p className="text-xs text-slate-500 mt-2 font-medium max-w-sm mx-auto leading-relaxed">
            {error}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={onSeeAll}
              className="inline-flex items-center gap-2 border border-slate-300 hover:border-teal-400 text-slate-800 hover:text-teal-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
            >
              Browse All Services
            </button>
          </div>
        </div>
      ) : !hasData ? (
        <div className="text-center py-14 sm:py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs max-w-xl mx-auto px-6">
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 tracking-tight">No services available yet</h3>
          <p className="text-xs text-slate-500 mt-2 font-medium max-w-sm mx-auto leading-relaxed">
            Check back soon — new services are being added.
          </p>
          <button
            onClick={onSeeAll}
            className="mt-6 bg-slate-900 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
          >
            Browse All Services
          </button>
        </div>
      ) : (
        <>
          {stale && (
            <p className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Showing a saved copy of our services. Prices and availability may have changed.
            </p>
          )}
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
        </>
      )}
    </section>
  );
}

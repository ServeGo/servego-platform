import React, { useState } from 'react';
import { MapPin, RadioTower, ShieldCheck, Sparkles } from 'lucide-react';
import { useData, useUI } from '../context/AppContext';

// Components
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import HowItWorks from '../components/HowItWorks';
import TrustBanner from '../components/TrustBanner';
import RealtimeFeatures from '../components/RealtimeFeatures';
import SkeletonLoader from '../components/SkeletonLoader';

export const Home = ({ onNavigate }) => {
  const {
    selectedArea, setArea,
    searchQuery, setSearchQuery, setCategory,
  } = useUI();
  const { providers, services, servicesLoading } = useData();

  const [inputQuery, setInputQuery] = useState(searchQuery);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(inputQuery);
    setCategory(null);
    // Encode query params into the URL so the Services page can read them on mount
    const params = new URLSearchParams();
    if (inputQuery.trim()) params.set('query', inputQuery.trim());
    if (selectedArea) params.set('location', selectedArea);
    const qs = params.toString();
    window.history.pushState({}, '', `/services${qs ? `?${qs}` : ''}`);
    onNavigate('services');
  };

  const handleCategoryClick = (catNameOrId) => {
    setCategory(catNameOrId);
    onNavigate('service-details', catNameOrId);
  };

  const handleQuickSearch = (term) => {
    setInputQuery(term);
    setSearchQuery(term);
    onNavigate('services');
  };

  const handleSeeAll = () => {
    setCategory(null);
    onNavigate('services');
  };

  // Live services come from the API (includes activeSpecialistCount). While the
  // first load is in flight we render a skeleton grid so the page never flashes
  // the "no services" empty state before data actually arrives.
  const hasServices = Array.isArray(services) && services.length > 0;
  const providerCount = Array.isArray(providers) ? providers.length : 0;
  const areaLabel = selectedArea || 'Hyderabad';

  return (
    <div id="home-page" className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_24%,_rgba(20,184,166,0.1),_transparent_24%),radial-gradient(circle_at_88%_58%,_rgba(245,158,11,0.08),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f5_100%)]">
      <Hero
        onSearch={handleSearchSubmit}
        selectedArea={selectedArea}
        setArea={setArea}
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        onQuickSearch={handleQuickSearch}
      />

      <section aria-label="servego24 marketplace status" className="relative z-10 -mt-7 px-4">
        <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:grid-cols-3">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Live catalog</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{hasServices ? `${services.length} services ready` : 'Loading services'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <RadioTower className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Ready to respond</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{providerCount || 'Verified'} specialists</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Serving now</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{areaLabel}</p>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" aria-label="Verified marketplace" />
          </div>
        </div>
      </section>

      {servicesLoading && !hasServices ? (
        <section aria-label="Loading services" className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-700">Explore services</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Find the right expert</h2>
            </div>
          </div>
          <SkeletonLoader type="card" count={6} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" />
        </section>
      ) : (
        <CategoryGrid
          categories={hasServices ? services : []}
          providers={providers}
          onCategoryClick={handleCategoryClick}
          onSeeAll={handleSeeAll}
        />
      )}

      <HowItWorks />

      <TrustBanner onBrowse={() => onNavigate('services')} />

      <RealtimeFeatures />

    </div>
  );
};

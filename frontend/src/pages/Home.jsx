import React, { useState } from 'react';
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
  return (
    <div id="home-page" className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_24%,_rgba(20,184,166,0.1),_transparent_24%),radial-gradient(circle_at_88%_58%,_rgba(245,158,11,0.08),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f5_100%)]">
      <Hero
        onSearch={handleSearchSubmit}
        selectedArea={selectedArea}
        setArea={setArea}
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        services={services}
      />

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

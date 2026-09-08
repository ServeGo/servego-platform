import React, { useState } from 'react';
import { Clock3, MapPin, RadioTower, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { useData, useUI } from '../context/AppContext';

// Components
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import BannerCarousel from '../components/BannerCarousel';
import HowItWorks from '../components/HowItWorks';
import TrustBanner from '../components/TrustBanner';
import RealtimeFeatures from '../components/RealtimeFeatures';
import SkeletonLoader from '../components/SkeletonLoader';

function StatusMetricCard({ icon, title, accent }) {
  return (
    <div className="flex items-center justify-center gap-3 border-b border-slate-100 px-3 py-4 text-center last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:px-6 md:py-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] md:h-16 md:w-16 ${accent}`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 md:text-[12px] md:tracking-[0.16em]">{title}</p>
      </div>
    </div>
  );
}

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
        <div className="mx-auto grid max-w-6xl grid-cols-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] md:grid-cols-4">
          <StatusMetricCard
            icon={<Zap className="h-6 w-6" />}
            title="Fast Booking"
            accent="bg-[#e9f6ff] text-[#0f3f7f]"
          />
          <StatusMetricCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Verified Professionals"
            accent="bg-[#e8fff2] text-[#0b7a59]"
          />
          <StatusMetricCard
            icon={<Users className="h-6 w-6" />}
            title="Wide Service Categories"
            accent="bg-[#eef8ff] text-[#0e5e7f]"
          />
          <StatusMetricCard
            icon={<Clock3 className="h-6 w-6" />}
            title="24/7 Support"
            accent="bg-[#ecfff5] text-[#0d8d60]"
          />
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

      <div className="mt-8 sm:mt-10">
        <BannerCarousel onNavigate={onNavigate} />
      </div>

      <div className="mt-10 sm:mt-14">
        <HowItWorks />
      </div>

      <TrustBanner onBrowse={() => onNavigate('services')} />

      <RealtimeFeatures />

      <section aria-label="Serving Hyderabad" className="relative z-10 px-3 pb-7 sm:px-4 sm:pb-8 lg:px-4 lg:pb-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[22px] border border-slate-200/80 bg-[#f3f7f6] shadow-[0_28px_70px_-50px_rgba(15,23,42,0.6)] sm:rounded-[24px]">
          <div className="flex flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-6 lg:py-4">
            <div className="w-full lg:w-[46%]">
              <h2 className="text-[1.9rem] font-black tracking-[-0.06em] text-slate-900 sm:text-[2.3rem] lg:text-[3.4rem] lg:leading-[0.95]">
                Serving Hyderabad
              </h2>
              <p className="mt-1 text-base font-medium text-slate-600 sm:text-lg lg:text-xl">
                Quick. Reliable. Local.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-2.5 lg:gap-3">
                {[
                  'Across Hyderabad',
                  'Local Experts',
                  'Faster Service',
                  'More Cities Coming Soon',
                ].map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm sm:px-3.5 sm:text-sm lg:px-4 lg:text-[0.95rem]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0f172a] text-[10px] text-white sm:h-6 sm:w-6">
                      •
                    </span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative w-full overflow-hidden lg:w-[54%]">
              <div className="relative flex min-h-[170px] items-end justify-end overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.9),rgba(139,190,229,0.35)_28%,rgba(11,162,163,0.12)_52%,transparent_62%)] sm:min-h-[200px] lg:min-h-[230px]">
                <img
                  src="/images/hyderbad image.png"
                  alt="Hyderabad city illustration"
                  className="h-[170px] w-full object-contain object-bottom sm:h-[200px] lg:h-[240px]"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-slate-300 bg-white/75 px-2.5 py-1.5 shadow-sm backdrop-blur-sm sm:bottom-4 sm:right-4 sm:gap-2.5 sm:px-3 sm:py-1.5 lg:bottom-5 lg:right-5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f172a] text-[10px] font-bold text-white sm:h-7 sm:w-7 lg:h-8 lg:w-8">
                    •
                  </span>
                  <span className="text-xs font-bold tracking-tight text-slate-800 sm:text-sm lg:text-lg">Hyderabad</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

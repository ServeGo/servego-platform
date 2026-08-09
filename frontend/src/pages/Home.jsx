import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

// Components
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import TrustBanner from '../components/TrustBanner';
import HowItWorks from '../components/HowItWorks';
import AppPromo from '../components/AppPromo';
import PartnerCTA from '../components/PartnerCTA';

export const Home = ({ onNavigate }) => {
  const { 
    selectedArea, setArea, 
    searchQuery, setSearchQuery, setCategory, providers, services
  } = useApp();

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

  // Use live services from API (includes activeSpecialistCount); fall back to empty while loading
  const displayCategories = Array.isArray(services) && services.length > 0 ? services : [];

  return (
    <div id="home-page" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)]">
      <Hero 
        onSearch={handleSearchSubmit}
        selectedArea={selectedArea}
        setArea={setArea}
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        onQuickSearch={handleQuickSearch}
      />

      <CategoryGrid 
        categories={displayCategories}
        providers={providers}
        onCategoryClick={handleCategoryClick}
        onSeeAll={() => { setCategory(null); onNavigate('services'); }}
      />

      <TrustBanner onBookAC={() => handleCategoryClick('AC Repair')} />

      <HowItWorks />

      <AppPromo />

      <PartnerCTA onApply={() => onNavigate('partner')} />
    </div>
  );
};


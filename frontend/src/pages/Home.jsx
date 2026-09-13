import React, { useState } from 'react';
import { useData, useUI } from '../context/AppContext';
import { useSEO } from '../hooks/useSEO';

// Components
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import HowItWorks from '../components/HowItWorks';
import SkeletonLoader from '../components/SkeletonLoader';
import LiveTrackingShowcase from '../components/home/LiveTrackingShowcase';
import BeforeAfterProof from '../components/home/BeforeAfterProof';
import CoverageArea from '../components/home/CoverageArea';
import QualityAudit from '../components/home/QualityAudit';
import MarketplaceSections from '../components/home/MarketplaceSections';

const HOME_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://servego24.com/#organization',
      name: 'ServeGo24',
      url: 'https://servego24.com',
      logo: 'https://servego24.com/favicon.png',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-1800-410-2026',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi', 'Telugu'],
      },
      sameAs: [
        'https://www.instagram.com/servego_24/',
        'https://www.linkedin.com/company/servego24',
        'https://www.youtube.com/@servego24',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://servego24.com/#website',
      url: 'https://servego24.com',
      name: 'ServeGo24',
      description: 'On-demand home services marketplace in India',
      publisher: { '@id': 'https://servego24.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://servego24.com/services?query={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'LocalBusiness',
      '@id': 'https://servego24.com/#localbusiness',
      name: 'ServeGo24',
      description:
        'On-demand home services marketplace connecting customers with verified electricians, plumbers, AC technicians, cleaners and more in Hyderabad.',
      url: 'https://servego24.com',
      telephone: '+91-1800-410-2026',
      email: 'support@servego.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Mindspace',
        addressLocality: 'Hyderabad',
        addressRegion: 'Telangana',
        postalCode: '500081',
        addressCountry: 'IN',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 17.4399, longitude: 78.3489 },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '06:00',
        closes: '22:00',
      },
      areaServed: [
        { '@type': 'City', name: 'Hyderabad' },
        { '@type': 'City', name: 'Secunderabad' },
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Home Services',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Electrician Services' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Plumbing Services' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'AC Repair & Service' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Home Cleaning' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carpentry Services' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'CCTV Installation' } },
        ],
      },
    },
  ],
};

export const Home = ({ onNavigate, onBecomePartner }) => {
  const {
    selectedArea, setArea,
    searchQuery, setSearchQuery, setCategory,
  } = useUI();
  const { providers, services, servicesLoading } = useData();

  useSEO({
    title: 'ServeGo24 \u2013 Home Services in Hyderabad | Book Electrician, Plumber, AC Repair',
    description:
      'Book verified electricians, plumbers, AC technicians, cleaners and more in Hyderabad. ServeGo24 connects you with trusted local professionals. Fast dispatch, transparent pricing.',
    path: '/',
    schema: HOME_SCHEMA,
  });

  const [inputQuery, setInputQuery] = useState(searchQuery);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(inputQuery);
    setCategory(null);
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

  const hasServices = Array.isArray(services) && services.length > 0;

  return (
    <div id="home-page" className="min-h-screen overflow-hidden bg-[#f8f9ff]">
      <Hero
        onSearch={handleSearchSubmit}
        selectedArea={selectedArea}
        setArea={setArea}
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        onQuickSearch={handleQuickSearch}
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

      <LiveTrackingShowcase />
      <BeforeAfterProof />
      <CoverageArea />
      <QualityAudit />
      <HowItWorks />
      <MarketplaceSections
        onBrowse={() => onNavigate('services')}
        onBecomePartner={onBecomePartner || (() => onNavigate('signup'))}
      />
    </div>
  );
};

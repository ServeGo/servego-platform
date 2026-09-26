import React, { useState, useEffect } from 'react';
import { useAuth, useData, useUI } from '../context/AppContext';
import { api as apiClient } from '../utils/apiClient';
import { cachedRequest } from '../utils/requestCache';
import { useSEO } from '../hooks/useSEO';

// Components
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import HowItWorks from '../components/HowItWorks';
import SkeletonLoader from '../components/SkeletonLoader';
import LiveTrackingShowcase from '../components/home/LiveTrackingShowcase';
import { HOME_SEO } from '../data/seoRoutes';

const HOME_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://servego24.com/#organization',
      name: 'ServeGo24',
      url: 'https://servego24.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://servego24.com/favicon.png',
        width: 512,
        height: 512,
      },
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
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '06:00',
          closes: '22:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Sunday'],
          opens: '08:00',
          closes: '20:00',
        },
      ],
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
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Painting Services' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Appliance Repair' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'RO & Water Purifier Service' } },
        ],
      },
    },
    {
      '@type': 'WebPage',
      '@id': 'https://servego24.com/#webpage',
      url: 'https://servego24.com',
      name: 'ServeGo24 – Home Services in Hyderabad',
      isPartOf: { '@id': 'https://servego24.com/#website' },
      about: { '@id': 'https://servego24.com/#organization' },
    },
  ],
};

export const Home = ({ onNavigate, onBecomePartner }) => {
  const {
    searchQuery, setSearchQuery, setCategory,
  } = useUI();
  const { currentUser } = useAuth();
  const { providers, services, servicesLoading, servicesError, servicesStale, fetchServices } = useData();

  useSEO({
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    path: HOME_SEO.path,
    schema: HOME_SCHEMA,
  });

  const [inputQuery, setInputQuery] = useState(searchQuery);
  const [topServices, setTopServices] = useState([]);

  useEffect(() => {
    let cancelled = false;
    // `cachedRequest` dedupes this against the identical call on the services
    // page and keeps the chips warm across route changes.
    cachedRequest('services-top-rated', () => apiClient.get('/services/top-rated?limit=5'))
      .then((res) => {
        if (!cancelled && res.ok && Array.isArray(res.data)) {
          setTopServices(res.data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(inputQuery);
    setCategory(null);
    const params = new URLSearchParams();
    if (inputQuery.trim()) params.set('query', inputQuery.trim());
    const qs = params.toString();
    window.history.pushState({}, '', `/services${qs ? `?${qs}` : ''}`);
    onNavigate('services');
  };

  // The card is a whole-card tap target, so "Book now" and the card body share
  // this one handler. Booking is an authenticated action (it creates a Booking,
  // a Lead and a LeadAssignmentHistory), so this mirrors Services.jsx: only a
  // signed-in customer proceeds, everyone else is sent to login first instead of
  // being dropped on the services page. The intent is persisted so login can
  // resume straight into the booking form.
  const handleCategoryClick = (catNameOrId) => {
    setCategory(catNameOrId);
    sessionStorage.setItem('servego_booking_intent', JSON.stringify({ catId: catNameOrId }));
    if (currentUser?.role === 'customer') {
      onNavigate('services');
    } else {
      onNavigate('login');
    }
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
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        onQuickSearch={handleQuickSearch}
        topServices={topServices}
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
          <SkeletonLoader type="card" count={6} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" />
        </section>
      ) : (
        <CategoryGrid
          categories={hasServices ? services : []}
          providers={providers}
          onCategoryClick={handleCategoryClick}
          onSeeAll={handleSeeAll}
          loading={servicesLoading}
          error={servicesError}
          stale={servicesStale}
          onRetry={() => fetchServices({ force: true })}
        />
      )}

      <LiveTrackingShowcase />
      <HowItWorks />
    </div>
  );
};

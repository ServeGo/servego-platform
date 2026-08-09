import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// Components
import ServiceHeader from '../components/ServiceHeader';
import ServiceCard from '../components/ServiceCard';
import SupportBanner from '../components/SupportBanner';


export const Services = ({ onNavigate }) => {
  const {
    searchQuery,
    setSearchQuery,
    setCategory,
    selectedArea,
    setArea,
    searchServices,
    currentUser
  } = useApp();

  const [inputSearch, setInputSearch] = useState(searchQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: read ?query= and ?location= from URL and seed the search state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('query') || '';
    setInputSearch(urlQuery);
    setSearchQuery(urlQuery);
    setArea(params.get('location') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    searchServices(searchQuery, selectedArea).then((data) => {
      if (!cancelled) {
        setResults(data);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [searchQuery, selectedArea, searchServices]);

  // Live filtering: every keystroke updates the searchQuery
  const handleSearchChange = (value) => {
    setInputSearch(value);
    setSearchQuery(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (inputSearch.trim()) params.set('query', inputSearch.trim());
    if (selectedArea) params.set('location', selectedArea);
    window.history.replaceState({}, '', `/services${params.toString() ? `?${params}` : ''}`);
    setSearchQuery(inputSearch);
  };

  const handleSelectCategory = (catId) => {
    setCategory(catId);
    // "Book Now" goes straight into the booking flow: the service page auto-opens
    // the temporary/permanent choice and the request is broadcast to all eligible
    // specialists — providers are never listed for selection.
    sessionStorage.setItem('servego_booking_intent', JSON.stringify({ catId }));
    if (currentUser?.role === 'customer') {
      onNavigate('service-details', catId);
    } else {
      onNavigate('login');
    }
  };

  const handleIssueClick = (issue) => {
    setInputSearch(issue);
    setSearchQuery(issue);
  };

  return (
    <div id="services-page" className="bg-slate-50 min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <ServiceHeader
          selectedArea={selectedArea}
          inputSearch={inputSearch}
          setInputSearch={setInputSearch}
          onSearchSubmit={handleSearchSubmit}
          onSearchChange={handleSearchChange}
        />

        {isLoading ? (
          <div className="text-center py-20 text-sm font-semibold text-slate-500">Loading services…</div>
        ) : results.length === 0 && searchQuery.trim() ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-slate-900">No Services Match "{searchQuery}"</h3>
            <p className="text-slate-500 text-sm mt-2">Try querying something else, like 'electrician' or 'AC repair'.</p>
            <button
              onClick={() => {
                setInputSearch('');
                setSearchQuery('');
              }}
              className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              Reset Search Filter
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-slate-900">No Services Available</h3>
            <p className="text-slate-500 text-sm mt-2">Check back soon — new services are being added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((cat) => (
              <ServiceCard
                key={cat.id}
                category={cat}
                providers={[]}
                onSelect={(id) => handleSelectCategory(id)}
                onIssueClick={handleIssueClick}
              />
            ))}
          </div>
        )}

        <SupportBanner onContact={() => onNavigate('contact')} />
      </div>
    </div>
  );
};


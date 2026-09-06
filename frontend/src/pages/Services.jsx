import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PackageSearch, SearchX } from 'lucide-react';
import { useAuth, useData, useUI } from '../context/AppContext';

// Components
import ServiceHeader from '../components/ServiceHeader';
import ServiceCard from '../components/ServiceCard';
import SkeletonLoader from '../components/SkeletonLoader';

// Live search only fires after the user pauses typing (see the search effect
// below) — typing "plum → plumb → plumbe → plumber" sends one request, not four.
const SEARCH_DEBOUNCE_MS = 350;

// Client-side pagination: the search endpoint returns the full catalog, so we
// paginate right here — 10 per page regardless of screen size.
const PAGE_SIZE = 9;

export const Services = ({ onNavigate }) => {
  const {
    searchQuery,
    setSearchQuery,
    setCategory,
    selectedArea,
    setArea,
  } = useUI();
  const { searchServices } = useData();
  const { currentUser } = useAuth();

  const [inputSearch, setInputSearch] = useState(searchQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const gridRef = useRef(null);

  const debounceTimerRef = useRef(null);
  const searchAbortRef = useRef(null);
  const searchSeqRef = useRef(0);

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
    // Debounce the keystrokes, then cancel the previous in-flight request
    // before firing the new one so only the final paused query hits the server.
    clearTimeout(debounceTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    const seq = ++searchSeqRef.current;
    const controller = new AbortController();
    searchAbortRef.current = controller;

    debounceTimerRef.current = setTimeout(() => {
      if (seq !== searchSeqRef.current) return;
      setIsLoading(true);
      searchServices(searchQuery, selectedArea, controller.signal).then((data) => {
        // `data` is null for aborted requests; the seq guard also rejects any
        // response that raced past the abort.
        if (seq === searchSeqRef.current && data) {
          setResults(data);
          setPage(1);
          setIsLoading(false);
        }
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimerRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
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

  // --- Client-side pagination ---------------------------------------------
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = results.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    setPage(p);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Windowed page list with ellipses: [1, …, 4, 5, 6, …, 12]
  const pageList = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set([1, 2, totalPages - 1, totalPages, safePage - 1, safePage, safePage + 1]);
    const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const n of nums) {
      if (prev && n - prev > 1) out.push('ellipsis');
      out.push(n);
      prev = n;
    }
    return out;
  })();

  return (
    <div id="services-page" className="bg-slate-50 min-h-screen py-6 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <ServiceHeader
          selectedArea={selectedArea}
          inputSearch={inputSearch}
          setInputSearch={setInputSearch}
          onSearchSubmit={handleSearchSubmit}
          onSearchChange={handleSearchChange}
          onQuick={handleIssueClick}
        />

        {!isLoading && results.length > 0 && (
          <div ref={gridRef} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-4 px-1 text-left scroll-mt-24">
            <h2 className="min-w-0 text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
              {searchQuery.trim() ? <>Results for “{searchQuery.trim()}”</> : 'All services'}
            </h2>
            <span className="shrink-0 text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wide">
              {results.length === 1
                ? '1 service'
                : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, results.length)} of ${results.length}`}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <SkeletonLoader type="card" count={6} />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-14 sm:py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs max-w-xl mx-auto px-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              {searchQuery.trim() ? <SearchX className="w-7 h-7" /> : <PackageSearch className="w-7 h-7" />}
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 tracking-tight">
              {searchQuery.trim() ? <>No services match “{searchQuery.trim()}”</> : 'No services available yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-medium max-w-sm mx-auto leading-relaxed">
              {searchQuery.trim()
                ? 'Try something else, like “electrician” or “AC repair”, or reset the search to browse everything.'
                : 'Check back soon — new services are being added.'}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => {
                  setInputSearch('');
                  setSearchQuery('');
                }}
                className="mt-6 bg-slate-900 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {pageItems.map((cat) => (
                <ServiceCard
                  key={cat.id}
                  category={cat}
                  providers={[]}
                  onSelect={(id) => handleSelectCategory(id)}
                  onIssueClick={handleIssueClick}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Services pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage === 1}
                  onClick={() => goToPage(safePage - 1)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageList.map((entry, idx) =>
                  entry === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="w-5 text-center text-xs font-black text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={entry}
                      type="button"
                      aria-current={entry === safePage ? 'page' : undefined}
                      onClick={() => goToPage(entry)}
                      className={`min-w-9 h-9 px-2 rounded-xl text-xs font-black transition-colors ${
                        entry === safePage
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {entry}
                    </button>
                  )
                )}

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage === totalPages}
                  onClick={() => goToPage(safePage + 1)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PackageSearch, SearchX, PlusCircle } from 'lucide-react';
import { useAuth, useData, useUI } from '../context/AppContext';

// Components
import ServiceHeader from '../components/ServiceHeader';
import ServiceCard from '../components/ServiceCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ServiceRequestChoice from '../components/ServiceRequestChoice';
import ServiceEngagementChoice from '../components/ServiceEngagementChoice';
import PermanentServiceRequestModal from '../components/PermanentServiceRequestModal';
import CustomServiceRequestModal from '../components/CustomServiceRequestModal';
import PermanentRequestSuccess from '../components/PermanentRequestSuccess';
import BookingModal from '../components/BookingModal';
import BookingSuccess from '../components/BookingSuccess';

// Live search only fires after the user pauses typing (see the search effect
// below) — typing "plum → plumb → plumbe → plumber" sends one request, not four.
const SEARCH_DEBOUNCE_MS = 350;

// Client-side pagination: the search endpoint returns the full catalog, so we
// paginate right here — 12 per page (4 columns x 3 rows).
const PAGE_SIZE = 12;

export const Services = ({ onNavigate }) => {
  const {
    searchQuery,
    setSearchQuery,
    setCategory,
    selectedArea,
    setArea,
  } = useUI();
  const { searchServices, createBooking, bookings, getCustomerLoyaltyTier } = useData();
  const { currentUser } = useAuth();

  const [inputSearch, setInputSearch] = useState(searchQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const gridRef = useRef(null);

  // Request-a-service flow (can't find what you need)
  const [showRequestChoice, setShowRequestChoice] = useState(false);
  const [showPermanentRequest, setShowPermanentRequest] = useState(false);
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);

  // Booking flow ("Book Now" on a service card) — opened directly on this page,
  // there is no separate service-details page anymore.
  const [bookingServiceId, setBookingServiceId] = useState(null);
  const [showEngagementChoice, setShowEngagementChoice] = useState(false);
  const [permanentServiceName, setPermanentServiceName] = useState('');
  const [bookingStep, setBookingStep] = useState(0); // 0: browse, 1: checkout, 2: processing, 3: success
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [errorText, setErrorText] = useState('');
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);

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
    if (currentUser?.role === 'customer') {
      // Open the temporary/permanent choice right here — no navigation needed.
      setBookingServiceId(catId);
      setShowEngagementChoice(true);
    } else {
      // Store the intent so the login page can resume it after sign-in.
      sessionStorage.setItem('servego_booking_intent', JSON.stringify({ catId }));
      onNavigate('login');
    }
  };

  // Resume a stored booking intent (set when an unauthenticated user tapped
  // Book Now, or from the customer home) — open the engagement choice straight
  // away on this page.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') return;
    const raw = sessionStorage.getItem('servego_booking_intent');
    if (!raw) return;
    try {
      const intent = JSON.parse(raw);
      sessionStorage.removeItem('servego_booking_intent');
      if (intent.catId) {
        setCategory(intent.catId);
        setBookingServiceId(intent.catId);
        setShowEngagementChoice(true);
      }
    } catch {
      sessionStorage.removeItem('servego_booking_intent');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Best-effort service name: prefer the catalog entry, fall back to a readable
  // form of the id (matching the old schedule/details page behaviour).
  const resolveServiceName = (id) => {
    const found = (results || []).find(
      (s) => String(s.id) === String(id) || String(s.name || '').toLowerCase() === String(id).toLowerCase()
    );
    if (found?.name) return found.name;
    return id ? String(id).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Service';
  };
  const bookingServiceName = bookingServiceId ? resolveServiceName(bookingServiceId) : '';

  const customerCompletedBookingsCount = (bookings || []).filter(
    (b) => b.customerId === currentUser?.id && b.status === 'completed'
  ).length;
  const loyaltyTier = getCustomerLoyaltyTier(customerCompletedBookingsCount);

  const handleChooseTemporary = () => {
    setShowEngagementChoice(false);
    setAddress('');
    setLatitude(null);
    setLongitude(null);
    setInstructions('');
    setErrorText('');
    setBookingStep(1);
  };

  const handleChoosePermanent = () => {
    setShowEngagementChoice(false);
    setBookingServiceId(null);
    setPermanentServiceName(bookingServiceName);
    setShowPermanentRequest(true);
  };

  const handleCloseEngagementChoice = () => {
    setShowEngagementChoice(false);
    setBookingServiceId(null);
  };

  const handleCompleteCheckout = async (e) => {
    e.preventDefault();

    if (!latitude || !longitude || !address.trim()) {
      setErrorText('Please select your service location on the map');
      return;
    }

    setBookingStep(2);

    try {
      // No providerId — the backend broadcasts this request to every eligible
      // specialist and the first one to accept gets the job.
      const created = await createBooking({
        serviceCategory: bookingServiceName,
        locationAddress: address,
        serviceLatitude: latitude,
        serviceLongitude: longitude,
        city: 'Hyderabad',
        instructions
      });

      if (!created || created.error) {
        setErrorText(created?.error || 'Could not complete the booking. Please try again.');
        setBookingStep(1);
        return;
      }

      if (!created.id) {
        setErrorText('Could not complete the booking. Please try again.');
        setBookingStep(1);
        return;
      }

      setConfirmedBookingDetails(created);
      setBookingStep(3);
    } catch {
      setErrorText('Could not complete the booking. Please try again.');
      setBookingStep(1);
    }
  };

  const handleIssueClick = (issue) => {
    setInputSearch(issue);
    setSearchQuery(issue);
  };

  const handleRequestService = () => setShowRequestChoice(true);

  const handleRequestPermanent = () => {
    setShowRequestChoice(false);
    setPermanentServiceName('');
    setShowPermanentRequest(true);
  };

  const handleRequestCustom = () => {
    setShowRequestChoice(false);
    setShowCustomRequest(true);
  };

  const handleRequestSuccess = (request) => {
    setShowPermanentRequest(false);
    setShowCustomRequest(false);
    setRequestSuccess(request);
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
        {showRequestChoice && (
          <ServiceRequestChoice
            onPermanent={handleRequestPermanent}
            onCustom={handleRequestCustom}
            onClose={() => setShowRequestChoice(false)}
          />
        )}

        {showPermanentRequest && (
          <PermanentServiceRequestModal
            serviceName={permanentServiceName}
            onClose={() => setShowPermanentRequest(false)}
            onSuccess={handleRequestSuccess}
          />
        )}

        {showCustomRequest && (
          <CustomServiceRequestModal
            onClose={() => setShowCustomRequest(false)}
            onSuccess={handleRequestSuccess}
          />
        )}

        {requestSuccess && (
          <PermanentRequestSuccess
            request={requestSuccess}
            onDashboard={() => onNavigate('dashboard-customer')}
            onBrowse={() => { setRequestSuccess(null); }}
          />
        )}

        {showEngagementChoice && bookingServiceId && (
          <ServiceEngagementChoice
            serviceName={bookingServiceName}
            onTemporary={handleChooseTemporary}
            onPermanent={handleChoosePermanent}
            onClose={handleCloseEngagementChoice}
          />
        )}

        {bookingStep === 1 && (
          <BookingModal
            onClose={() => setBookingStep(0)}
            errorText={errorText}
            address={address} setAddress={setAddress}
            latitude={latitude} longitude={longitude}
            setLatitude={setLatitude} setLongitude={setLongitude}
            instructions={instructions} setInstructions={setInstructions}
            loyaltyTier={loyaltyTier}
            onSubmit={handleCompleteCheckout}
          />
        )}

        {bookingStep === 2 && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-200 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-t-4 border-indigo-600 animate-spin mb-6" />
              <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Processing Secure Booking</h4>
              <p className="text-slate-500 text-xs mt-2 font-medium">Broadcasting your request to eligible specialists. Please wait...</p>
            </div>
          </div>
        )}

        {bookingStep === 3 && confirmedBookingDetails && (
          <BookingSuccess
            details={confirmedBookingDetails}
            onDashboard={() => onNavigate('dashboard-customer')}
            onBrowse={() => { setConfirmedBookingDetails(null); setBookingStep(0); }}
          />
        )}

        <ServiceHeader
          selectedArea={selectedArea}
          inputSearch={inputSearch}
          setInputSearch={setInputSearch}
          onSearchSubmit={handleSearchSubmit}
          onSearchChange={handleSearchChange}
          onQuick={handleIssueClick}
        />

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">Can't find?</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Custom service</p>
          </div>
          <button
            type="button"
            onClick={handleRequestService}
            className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl text-[10px] transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Request
          </button>
        </div>

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
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            <SkeletonLoader type="card" count={12} />
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
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((cat) => (
                <ServiceCard
                  key={cat.id}
                  category={cat}
                  providers={[]}
                  onSelect={(id) => handleSelectCategory(id)}
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


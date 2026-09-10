import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, PackageSearch, SearchX, PlusCircle, UserX, ArrowRight } from 'lucide-react';
import { useAuth, useData, useUI } from '../context/AppContext';
import { api as apiClient } from '../utils/apiClient';

// Components
import ServiceHeader from '../components/ServiceHeader';
import ServiceCard from '../components/ServiceCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ServiceRequestChoice from '../components/ServiceRequestChoice';
import PermanentServiceRequestModal from '../components/PermanentServiceRequestModal';
import CustomServiceRequestModal from '../components/CustomServiceRequestModal';
import PermanentRequestSuccess from '../components/PermanentRequestSuccess';
import BookingModal from '../components/BookingModal';
import BookingSuccess from '../components/BookingSuccess';

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
  const { searchServices, createBooking } = useData();
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
  const [permanentServiceName, setPermanentServiceName] = useState('');
  const [bookingStep, setBookingStep] = useState(0); // 0: browse, 1: checkout, 2: processing, 3: success
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [contactPhone, setContactPhone] = useState('');
  const [errorText, setErrorText] = useState('');
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);
  const [showNoProvidersModal, setShowNoProvidersModal] = useState(false);

  // Saved addresses (Blinkit-style) — shown in the booking popup so the user
  // picks an existing address instead of dropping a pin every time.
  const [savedAddresses, setSavedAddresses] = useState([]);

  const loadSavedAddresses = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'customer') return;
    try {
      const res = await apiClient.get('/customer-addresses');
      if (res.ok && Array.isArray(res.data?.addresses)) {
        setSavedAddresses(res.data.addresses);
        // Auto-select the default saved address for the booking.
        const def = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0];
        if (def && (def.latitude != null) && (def.longitude != null)) {
          setLatitude(def.latitude);
          setLongitude(def.longitude);
          setAddress(def.address);
        }
      }
    } catch {
      // Addresses are a convenience — never block opening the booking popup.
    }
  }, [currentUser]);

  // Save a brand-new address from the booking popup, then return it for instant selection.
  const handleSaveAddress = useCallback(async (payload) => {
    try {
      const res = await apiClient.post('/customer-addresses', payload);
      if (res.ok && res.data?.address) {
        const addr = res.data.address;
        setSavedAddresses((prev) => [addr, ...prev.filter((a) => a.id !== addr.id)]);
        setLatitude(addr.latitude);
        setLongitude(addr.longitude);
        setAddress(addr.address);
        return { ok: true, address: addr };
      }
      return { ok: false, error: res.data?.message || 'Could not save this address.' };
    } catch {
      return { ok: false, error: 'Could not save this address.' };
    }
  }, []);

  const handlePickSaved = useCallback((addr) => {
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);
    setAddress(addr.address);
  }, []);

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
      setBookingServiceId(catId);
      // If the service has no active providers on the catalog, show the
      // "No Providers Available" popup immediately instead of the booking form.
      const cat = (results || []).find(
        (c) => String(c.id) === String(catId) || String(c.name || '').toLowerCase() === String(catId).toLowerCase()
      );
      if (cat && Number(cat.activeSpecialistCount) === 0) {
        setShowNoProvidersModal(true);
        return;
      }
      // Eligible providers exist — open the Temporary Service booking form.
      setAddress('');
      setLatitude(null);
      setLongitude(null);
      setContactPhone(currentUser?.phone || '');
      setErrorText('');
      setBookingStep(1);
      loadSavedAddresses();
    } else {
      // Store the intent so the login page can resume it after sign-in.
      sessionStorage.setItem('servego_booking_intent', JSON.stringify({ catId }));
      onNavigate('login');
    }
  };

  // Resume a stored booking intent (set when an unauthenticated user tapped
  // Book Now, or from the customer home) — open the booking form straight away
  // on this page.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') return;
    const raw = sessionStorage.getItem('servego_booking_intent');
    if (!raw) return;
    try {
      const intent = JSON.parse(raw);
      sessionStorage.removeItem('servego_booking_intent');
      if (intent.catId) {
        handleSelectCategory(intent.catId);
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

  const handleCompleteCheckout = async (e) => {
    e.preventDefault();

    if (!latitude || !longitude || !address.trim()) {
      setErrorText('Please select your service location on the map');
      return;
    }

    if (!contactPhone.trim()) {
      setErrorText('Please enter a contact number — the specialist will call you on it.');
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
        contactPhone
      });

      if (!created || created.error) {
        if (created?.code === 'NO_ELIGIBLE_PROVIDERS') {
          setBookingStep(0);
          setShowNoProvidersModal(true);
          return;
        }
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

        {showNoProvidersModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full relative shadow-2xl animate-fade-in text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
                <UserX className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Providers Available</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6 max-w-xs mx-auto">
                There are no service providers available in your area right now. Please try again later or explore other services.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowNoProvidersModal(false)}
                  className="cursor-pointer px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Try Again Later
                </button>
                <button
                  onClick={() => { setShowNoProvidersModal(false); onNavigate('services'); }}
                  className="cursor-pointer px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  Browse Services
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {bookingStep === 1 && (
          <BookingModal
            onClose={() => setBookingStep(0)}
            errorText={errorText}
            address={address} setAddress={setAddress}
            latitude={latitude} longitude={longitude}
            setLatitude={setLatitude} setLongitude={setLongitude}
            contactPhone={contactPhone} setContactPhone={setContactPhone}
            onSubmit={handleCompleteCheckout}
            savedAddresses={savedAddresses}
            onPickSaved={handlePickSaved}
            onSaveAddress={handleSaveAddress}
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

        <div className="mt-8 relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6 shadow-sm">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-100 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                <PlusCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-900 tracking-tight">Can't find a service?</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                  We'll add it and arrange a specialist for you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestService}
              className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md hover:shadow-lg"
            >
              Request a Service
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


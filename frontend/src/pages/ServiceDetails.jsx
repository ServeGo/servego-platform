import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SERVICE_CATEGORIES } from '../data';

// Components
import ServiceDetailHeader from '../components/ServiceDetailHeader';
import FilterPanel from '../components/FilterPanel';
import ProviderListItem from '../components/ProviderListItem';
import BookingModal from '../components/BookingModal';
import BookingSuccess from '../components/BookingSuccess';

export const ServiceDetails = ({ catId, onNavigate }) => {
  const {
    providersByApprovedService,
    fetchProvidersByApprovedServiceName,
    currentUser,
    createBooking,
    toggleFavoriteProvider,
    favoriteProviders,
    selectedArea,
    bookings,
    getCustomerLoyaltyTier,
  } = useApp();

  // Metadata — try static lookup first, fall back to a synthetic entry built
  // from the catId itself (for DB-driven services like 'dhobi', 'cook', etc.)
  const categoryMeta = useMemo(() => {
    const raw = String(catId || '').toLowerCase();
    const found = SERVICE_CATEGORIES.find(
      c => c.id.toLowerCase() === raw || c.name.toLowerCase() === raw
    );
    if (found) return found;
    // Build a minimal meta object from the service name
    const displayName = catId
      ? String(catId).replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
      : 'Service';
    return { id: catId, name: displayName, description: '', popularIssues: [] };
  }, [catId]);

  // UI state
  const [filterArea, setFilterArea] = useState(selectedArea || '');
  const [sortBy, setSortBy] = useState('rating');
  const [bookingStep, setBookingStep] = useState(0); // 0: Browse, 1: Checkout, 2: Loading, 3: Success
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Form fields
  const [bookingType, setBookingType] = useState('contract');
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [errorText, setErrorText] = useState('');
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);

  // (auto-booking via hash is currently unused; keeper removed to avoid unused state warning)

  useEffect(() => {
    if (categoryMeta?.name) {
      fetchProvidersByApprovedServiceName(categoryMeta.name, { location: filterArea, sort: sortBy });
    }
  }, [categoryMeta.name, filterArea, sortBy, fetchProvidersByApprovedServiceName]);

  // Filtering and sorting are performed by the discovery API so results remain
  // correct when a category has more providers than a single client payload.
  const categoryProviders = useMemo(() => {
    return Array.isArray(providersByApprovedService) ? providersByApprovedService : [];
  }, [providersByApprovedService]);

  // Loyalty calculation
  const customerCompletedBookingsCount = useMemo(() => {
    if (!currentUser) return 0;
    return bookings.filter(b => b.customerId === currentUser.id && b.status === "completed").length;
  }, [bookings, currentUser]);

  const loyaltyTier = useMemo(() => getCustomerLoyaltyTier(customerCompletedBookingsCount), [customerCompletedBookingsCount, getCustomerLoyaltyTier]);

  // Booking summary (pricing is handled offline between customer and provider).
  const billMetrics = useMemo(() => {
    const durationLabel = bookingType === 'contract' ? 'Contract' : 'Ongoing';
    return { durationLabel };
  }, [bookingType]);

  const handleStartBooking = (prov) => {
    if (!currentUser) {
      // Store booking intent so we can resume after login
      sessionStorage.setItem('servego_booking_intent', JSON.stringify({
        providerId: prov.id,
        categoryName: categoryMeta.name,
        catId
      }));
      onNavigate('login');
      return;
    }
    setSelectedProvider(prov);
    setBookingStep(1);

    setBookingType('contract');
    setAddress('');
    setErrorText('');
  };

  // Resume booking intent after login
  useEffect(() => {
    if (!currentUser) return;
    const raw = sessionStorage.getItem('servego_booking_intent');
    if (!raw) return;
    try {
      const intent = JSON.parse(raw);
      if (intent.catId === catId && intent.providerId) {
        const prov = categoryProviders.find(p => p.id === intent.providerId);
        if (prov) {
          sessionStorage.removeItem('servego_booking_intent');
          setBookingType('contract');
          setAddress('');
          setErrorText('');
          setSelectedProvider(prov);
          setBookingStep(1);
        }
      }
    } catch {
      sessionStorage.removeItem('servego_booking_intent');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, categoryProviders]);

  const handleCompleteCheckout = async (e) => {
    e.preventDefault();

    if (!address.trim()) {
      setErrorText('Please enter your service location');
      return;
    }

    setBookingStep(2);

    try {
      let created;
      created = await createBooking({
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        providerAvatar: selectedProvider.avatar,
        serviceCategory: categoryMeta.name,
        locationAddress: address,
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

  return (
    <div id="service-details-page" className="bg-slate-50 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto">
        
        <button 
          onClick={() => onNavigate('services')}
          className="flex items-center gap-1.5 text-xs text-slate-550 hover:text-indigo-600 font-bold uppercase tracking-wider mb-6 group focus:outline-none"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Checklists</span>
        </button>

        {bookingStep === 1 && selectedProvider && (
            <BookingModal 
              provider={selectedProvider}
              onClose={() => setBookingStep(0)}
              errorText={errorText}
              bookingType={bookingType} setBookingType={setBookingType}
              address={address} setAddress={setAddress}
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
              <p className="text-slate-500 text-xs mt-2 font-medium">Validating schedule and escrow credentials. Please wait...</p>
            </div>
          </div>
        )}

        {bookingStep === 3 && confirmedBookingDetails && (
          <BookingSuccess 
            details={confirmedBookingDetails}
            onDashboard={() => onNavigate('dashboard-customer')}
            onBrowse={() => onNavigate('services')}
          />
        )}

        <ServiceDetailHeader categoryMeta={categoryMeta} />

        <FilterPanel 
          filterArea={filterArea} 
          setFilterArea={setFilterArea} 
          sortBy={sortBy} 
          setSortBy={setSortBy} 
        />

        {categoryProviders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-slate-900">No Vetted Experts Found</h3>
            <p className="text-slate-500 text-xs mt-1 font-medium">There are no specialists registered in "{filterArea || 'this zone'}" yet.</p>
            <button 
              onClick={() => setFilterArea('')}
              className="mt-6 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
            >
              Show all Hyderabad experts
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {categoryProviders.map((prov) => (
              <ProviderListItem 
                key={prov.id}
                provider={prov}
                isFavorite={favoriteProviders.includes(prov.id)}
                onToggleFavorite={toggleFavoriteProvider}
                onBook={handleStartBooking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

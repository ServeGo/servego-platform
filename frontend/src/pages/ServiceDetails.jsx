import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SERVICE_CATEGORIES } from '../data';

// Components
import ServiceDetailHeader from '../components/ServiceDetailHeader';
import FilterPanel from '../components/FilterPanel';
import ProviderListItem from '../components/ProviderListItem';
import BookingModal from '../components/BookingModal';
import BookingSuccess from '../components/BookingSuccess';
import ServiceEngagementChoice from '../components/ServiceEngagementChoice';
import PermanentServiceRequestModal from '../components/PermanentServiceRequestModal';

export const ServiceDetails = ({ catId, onNavigate, onViewPermanentRequests }) => {
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

  // Engagement choice: Temporary (lead flow) vs Permanent/Contract (admin-managed)
  const [showEngagementChoice, setShowEngagementChoice] = useState(false);
  const [showPermanentRequest, setShowPermanentRequest] = useState(false);
  const [permanentSuccess, setPermanentSuccess] = useState(null);

  // Form fields
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
    setShowEngagementChoice(true);
  };

  const handleChooseTemporary = () => {
    setShowEngagementChoice(false);
    setAddress('');
    setErrorText('');
    setBookingStep(1);
  };

  const handleChoosePermanent = () => {
    setShowEngagementChoice(false);
    setShowPermanentRequest(true);
  };

  const handlePermanentSuccess = (request) => {
    setShowPermanentRequest(false);
    setPermanentSuccess(request);
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
          setAddress('');
          setErrorText('');
          setSelectedProvider(prov);
          setShowEngagementChoice(true);
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

        {showEngagementChoice && (
          <ServiceEngagementChoice
            serviceName={categoryMeta.name}
            onTemporary={handleChooseTemporary}
            onPermanent={handleChoosePermanent}
            onClose={() => setShowEngagementChoice(false)}
          />
        )}

        {showPermanentRequest && (
          <PermanentServiceRequestModal
            serviceName={categoryMeta.name}
            onClose={() => setShowPermanentRequest(false)}
            onSuccess={handlePermanentSuccess}
          />
        )}

        {permanentSuccess && (
          <PermanentRequestSuccess
            request={permanentSuccess}
            onDashboard={onViewPermanentRequests}
            onBrowse={() => { setPermanentSuccess(null); onNavigate('services'); }}
          />
        )}

        {bookingStep === 1 && selectedProvider && (
            <BookingModal 
              provider={selectedProvider}
              onClose={() => setBookingStep(0)}
              errorText={errorText}
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

function PermanentRequestSuccess({ request, onDashboard, onBrowse }) {
  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const durationText =
    request.engagementType === 'CONTRACT'
      ? request.contractDurationYears
        ? `${request.contractDurationYears} year${request.contractDurationYears > 1 ? 's' : ''}`
        : `${request.contractDurationDays} day${request.contractDurationDays > 1 ? 's' : ''}`
      : 'Ongoing';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-2xl animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Request Submitted</h3>
        <p className="text-slate-500 text-xs mt-2 font-medium leading-relaxed">
          Your {request.serviceCategory} request for a {request.engagementType === 'CONTRACT' ? 'contract' : 'permanent'} engagement
          has been received. Our team will review it and arrange a suitable specialist for you.
        </p>

        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs font-bold">
          <SummaryRow label="Type" value={request.engagementType === 'CONTRACT' ? 'Contract' : 'Permanent'} />
          <SummaryRow label="Start Date" value={formatDate(request.startDate)} />
          <SummaryRow label="Duration" value={durationText} />
          <SummaryRow label="Monthly Budget" value={`₹${Number(request.monthlyBudget).toLocaleString('en-IN')}`} />
          <SummaryRow label="Status" value="Pending review" />
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={onDashboard}
            className="cursor-pointer w-full bg-teal-600 hover:bg-teal-700 text-white font-bold p-3 rounded-lg text-center text-sm transition-all shadow-md"
          >
            View My Requests
          </button>
          <button
            onClick={onBrowse}
            className="cursor-pointer w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-3 rounded-lg text-center text-sm transition-all"
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500 uppercase tracking-wide text-[10px]">{label}</span>
      <span className="text-slate-800 capitalize">{value}</span>
    </div>
  );
}

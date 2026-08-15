import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';
import { SERVICE_CATEGORIES } from '../data';

// Components
import ServiceDetailHeader from '../components/ServiceDetailHeader';
import BookingModal from '../components/BookingModal';
import BookingSuccess from '../components/BookingSuccess';
import ServiceEngagementChoice from '../components/ServiceEngagementChoice';
import PermanentServiceRequestModal from '../components/PermanentServiceRequestModal';

export const ServiceDetails = ({ catId, onNavigate, onViewPermanentRequests }) => {
  const { currentUser } = useAuth();
  const {
    createBooking,
    bookings,
    getCustomerLoyaltyTier,
  } = useData();

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
  const [bookingStep, setBookingStep] = useState(0); // 0: Browse, 1: Checkout, 2: Loading, 3: Success

  // Engagement choice: Temporary (lead flow) vs Permanent/Contract (admin-managed)
  const [showEngagementChoice, setShowEngagementChoice] = useState(false);
  const [showPermanentRequest, setShowPermanentRequest] = useState(false);
  const [permanentSuccess, setPermanentSuccess] = useState(null);

  // Form fields
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [errorText, setErrorText] = useState('');
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);

  // Loyalty calculation
  const customerCompletedBookingsCount = useMemo(() => {
    if (!currentUser) return 0;
    return bookings.filter(b => b.customerId === currentUser.id && b.status === "completed").length;
  }, [bookings, currentUser]);

  const loyaltyTier = useMemo(() => getCustomerLoyaltyTier(customerCompletedBookingsCount), [customerCompletedBookingsCount, getCustomerLoyaltyTier]);

  // Start the booking flow. The request is broadcast to every eligible
  // specialist — no provider is picked at this stage.
  const handleBookNow = () => {
    if (!currentUser || currentUser.role !== 'customer') {
      // Store booking intent so we can resume after login
      sessionStorage.setItem('servego_booking_intent', JSON.stringify({
        catId,
        categoryName: categoryMeta.name
      }));
      onNavigate('login');
      return;
    }
    setShowEngagementChoice(true);
  };

  // Resume booking intent (set when "Book Now" was tapped on the services page
  // or before login) — skip straight to the engagement choice.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') return;
    const raw = sessionStorage.getItem('servego_booking_intent');
    if (!raw) return;
    try {
      const intent = JSON.parse(raw);
      if (intent.catId === catId) {
        sessionStorage.removeItem('servego_booking_intent');
        setAddress('');
        setLatitude(null);
        setLongitude(null);
        setErrorText('');
        setShowEngagementChoice(true);
      }
    } catch {
      sessionStorage.removeItem('servego_booking_intent');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, catId]);

  const handleChooseTemporary = () => {
    setShowEngagementChoice(false);
    setAddress('');
    setLatitude(null);
    setLongitude(null);
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
        serviceCategory: categoryMeta.name,
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
            onBrowse={() => onNavigate('services')}
          />
        )}

        <ServiceDetailHeader categoryMeta={categoryMeta} />

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 text-left">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 block mb-2">
                How it works
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Book {categoryMeta.name} in seconds
              </h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed font-medium max-w-2xl">
                Tell us your requirements and we'll send your request to every eligible specialist
                in your area at once. The first specialist to accept gets the job — so you get the
                fastest vetted help available.
              </p>

              {categoryMeta.popularIssues?.length > 0 && (
                <div className="mt-4">
                  <span className="text-[11px] font-bold text-slate-600 block mb-2 uppercase tracking-wide">
                    Most Popular Requests:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryMeta.popularIssues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-50 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200/60"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 lg:w-64 lg:border-l lg:border-slate-100 lg:pl-6 flex flex-col justify-center">
              <button
                onClick={handleBookNow}
                className="cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3.5 rounded-xl text-sm transition-all shadow-md focus:outline-none flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Book Now
              </button>
              <p className="text-[11px] text-slate-400 font-medium text-center mt-2">
                No prepayment. Final charges agreed with the specialist.
              </p>
            </div>
          </div>
        </div>
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

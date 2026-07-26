import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

// Components
import DashboardHeader from '../components/DashboardHeader';
import BookingCard from '../components/BookingCard';
import FavoritesView from '../components/FavoritesView';
import TicketsView from '../components/TicketsView';
import NotificationsView from '../components/NotificationsView';
import ProfileView from '../components/ProfileView';
import ReferralsView from '../components/ReferralsView';
import SettingsView from '../components/SettingsView';
import ReviewModal from '../components/ReviewModal';
import InvoiceModal from '../components/InvoiceModal';

export const CustomerDashboard = ({ onNavigate, activeTab: activeTabProp, setActiveTabExternal }) => {
  const { 
    currentUser, bookings, updateBookingStatus, submitReview, 
    providers, favoriteProviders, toggleFavoriteProvider, tickets, submitSupportTicket, 
    notifications, markNotificationAsRead, applyReferralCode, getCustomerLoyaltyTier, sendChatMessage,
    updateUserProfile, savedProsData
  } = useApp();

  const [internalActiveTab, setInternalActiveTab] = useState('bookings');
  const activeTab = activeTabProp || internalActiveTab;
  const setActiveTab = setActiveTabExternal || setInternalActiveTab;

  // Referral states
  const [referralInput, setReferralInput] = useState('');
  const [refError, setRefError] = useState('');
  const [refSuccess, setRefSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Modal states
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState(null);

  // Ticket state
  const [ticketSubject, setTicketSubject] = useState('Payment Refund Support');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  // Chat states
  const [openChatBookingId, setOpenChatBookingId] = useState(null);
  const [chatInput, setChatInput] = useState('');

  // Memoized data
  const userBookings = useMemo(() => bookings.filter(b => b.customerId === currentUser?.id), [bookings, currentUser]);
  const userFavorites = useMemo(() => {
    // Use real SavedPro API data when available; fall back to provider list filtered by IDs
    if (Array.isArray(savedProsData) && savedProsData.length > 0) {
      return savedProsData.map(sp => sp.provider || providers.find(p => p.id === (sp.providerId || sp.provider?.id))).filter(Boolean);
    }
    return providers.filter(p => favoriteProviders.includes(p.id));
  }, [savedProsData, providers, favoriteProviders]);
  const userTickets = useMemo(() => tickets.filter(t => t.email === currentUser?.email), [tickets, currentUser]);
  const userNotifications = useMemo(() => notifications.filter(n => n.userId === currentUser?.id), [notifications, currentUser]);

  // Loyalty progression based on completed bookings.
  const completedCount = useMemo(
    () => userBookings.filter(b => ['completed', 'reviewed'].includes(b.status)).length,
    [userBookings]
  );
  const loyaltyProgress = useMemo(() => {
    const tiers = [
      { threshold: 2, name: 'Silver Care' },
      { threshold: 5, name: 'Gold Shield' },
      { threshold: 10, name: 'Platinum Star' },
    ];
    const next = tiers.find(t => completedCount < t.threshold);
    if (!next) {
      return { nextTierName: null, bookingsNeeded: 0, progressPercent: 100 };
    }
    const prevThreshold = tiers.filter(t => t.threshold <= next.threshold && completedCount >= t.threshold).pop()?.threshold || 0;
    const span = next.threshold - prevThreshold;
    const done = completedCount - prevThreshold;
    return {
      nextTierName: next.name,
      bookingsNeeded: next.threshold - completedCount,
      progressPercent: span > 0 ? Math.round((done / span) * 100) : 0,
    };
  }, [completedCount]);

  // Actions
  const handlePublishReview = async (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setReviewSubmitting(true);
    try {
      submitReview(reviewBooking.id, reviewBooking.providerId, reviewRating, reviewComment);
      setReviewBooking(null);
      setReviewComment('');
      setReviewRating(5);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketMsg.trim()) return;
    setTicketSubmitting(true);
    try {
      submitSupportTicket({
        name: currentUser?.name,
        email: currentUser?.email,
        subject: ticketSubject,
        message: ticketMsg
      });
      setTicketSuccess(true);
      setTicketMsg('');
      setTimeout(() => setTicketSuccess(false), 3000);
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleApplyReferral = async (e) => {
    e.preventDefault();
    const res = await applyReferralCode(referralInput);
    if (res?.success) {
      setRefSuccess(res.message);
      setRefError('');
      setReferralInput('');
    } else {
      setRefError(res?.message || 'Failed to apply referral code.');
      setRefSuccess('');
    }
  };

  const handleSaveProfile = (form) => updateUserProfile(currentUser?.id, form);

  const handleMarkAllRead = () => {
    userNotifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id));
  };

  const handleCopyCode = () => {
    const code = currentUser?.referralCode || `SERVEGO-CUST-${currentUser?.id.substring(currentUser?.id.length - 3).toUpperCase()}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="customer-dashboard-page" className="bg-slate-50 min-h-screen py-10 px-4 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto">
        
        {reviewBooking && (
          <ReviewModal 
            booking={reviewBooking}
            rating={reviewRating} setRating={setReviewRating}
            comment={reviewComment} setComment={setReviewComment}
            onClose={() => setReviewBooking(null)}
            onSubmit={handlePublishReview}
            submitting={reviewSubmitting}
          />
        )}

        {invoiceBooking && (
          <InvoiceModal booking={invoiceBooking} onClose={() => setInvoiceBooking(null)} />
        )}

        <DashboardHeader 
          user={currentUser} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          counts={{
            bookings: userBookings.length,
            favorites: userFavorites.length,
            tickets: userTickets.length,
            notifications: userNotifications.length
          }}
        />

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 text-left">Your Booking Orders</h3>
            {userBookings.length === 0 ? (
              <EmptyBookings onNavigate={onNavigate} />
            ) : (
              <BookingSubTabs bookings={userBookings} currentUser={currentUser} onDownloadReceipt={setInvoiceBooking} onCancel={updateBookingStatus} onReview={setReviewBooking} openChatBookingId={openChatBookingId} setOpenChatBookingId={setOpenChatBookingId} chatInput={chatInput} setChatInput={setChatInput} onSendMessage={sendChatMessage} onNavigate={onNavigate} />
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <FavoritesView 
            favorites={userFavorites} 
            onToggleFavorite={toggleFavoriteProvider} 
            onNavigate={onNavigate} 
          />
        )}

        {activeTab === 'tickets' && (
          <TicketsView 
            tickets={userTickets}
            onSubmit={handleTicketSubmit}
            subject={ticketSubject} setSubject={setTicketSubject}
            message={ticketMsg} setMessage={setTicketMsg}
            success={ticketSuccess}
            submitting={ticketSubmitting}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView 
            notifications={userNotifications}
            onMarkRead={markNotificationAsRead}
            onMarkAllRead={handleMarkAllRead}
          />
        )}

        {activeTab === 'profile' && <ProfileView user={currentUser} onSave={handleSaveProfile} />}

        {activeTab === 'referrals' && (
          <ReferralsView 
            user={currentUser}
            loyaltyTier={getCustomerLoyaltyTier(completedCount)}
            completedCount={completedCount}
            bookingsNeeded={loyaltyProgress.bookingsNeeded}
            progressPercent={loyaltyProgress.progressPercent}
            nextTierName={loyaltyProgress.nextTierName}
            referralCode={currentUser?.referralCode || `SERVEGO-CUST-NEW`}
            referralInput={referralInput}
            setReferralInput={setReferralInput}
            onApplyCode={handleApplyReferral}
            onCopyCode={handleCopyCode}
            copied={copied}
            refError={refError}
            refSuccess={refSuccess}
          />
        )}

        {activeTab === 'settings' && <SettingsView />}

      </div>
    </div>
  );
};

function EmptyBookings({ onNavigate }) {
  return (
    <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
      <h4 className="text-base font-bold text-slate-900">No Orders Found</h4>
      <p className="text-slate-500 text-xs mt-1 font-medium">Book a service to get started.</p>
      <button 
        onClick={() => onNavigate('services')} 
        className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors"
      >
        Browse Services
      </button>
    </div>
  );
}

const BOOKING_SUB_TABS = [
  // Accept both backend canonical enums (PENDING/CONFIRMED/...) and UI lowercase variants.
  { id: 'active', label: 'Active', statuses: ['confirmed', 'ongoing', 'CONFIRMED', 'ONGOING'] },
  { id: 'pending', label: 'Pending', statuses: ['pending', 'PENDING'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'CANCELLED', 'rejected', 'REJECTED'] },
  { id: 'past', label: 'Past', statuses: ['completed', 'reviewed', 'COMPLETED', 'REVIEWED'] },
];

function BookingSubTabs({ bookings, currentUser, onDownloadReceipt, onCancel, onReview, openChatBookingId, setOpenChatBookingId, chatInput, setChatInput, onSendMessage, onNavigate }) {
  const [subTab, setSubTab] = useState('active');

  const filtered = useMemo(() => {
    const tab = BOOKING_SUB_TABS.find(t => t.id === subTab);
    if (!tab) return bookings;
    return bookings.filter(b => tab.statuses.includes((b.status || '').toLowerCase()));
  }, [bookings, subTab]);

  const counts = useMemo(() => {
    const result = {};
    BOOKING_SUB_TABS.forEach(t => {
      result[t.id] = bookings.filter(b => t.statuses.includes((b.status || '').toLowerCase())).length;
    });
    return result;
  }, [bookings]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl w-full sm:w-fit">
        {BOOKING_SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${subTab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {t.label} {counts[t.id] > 0 && <span className="ml-1 opacity-70">({counts[t.id]})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
          <p className="text-slate-500 text-xs font-medium">No {subTab} bookings.</p>
          {subTab === 'pending' && (
            <button onClick={() => onNavigate('services')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors">
              Browse Services
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map(bk => (
            <BookingCard
              key={bk.id}
              booking={bk}
              customerVerificationCode={currentUser?.verificationCode}
              onDownloadReceipt={onDownloadReceipt}
              onCancel={onCancel}
              onReview={onReview}
              chatOpen={openChatBookingId === bk.id}
              onToggleChat={() => setOpenChatBookingId(openChatBookingId === bk.id ? null : bk.id)}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSendMessage={onSendMessage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

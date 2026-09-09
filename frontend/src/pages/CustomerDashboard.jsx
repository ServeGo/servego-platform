import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ClipboardList, Clock3, Loader2 } from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';
import { api } from '../utils/apiClient';
import { normalizeBooking } from '../utils/normalizeCustomerData';
import { getErrorInfo } from '../utils/errorMessages';

// Components
import DashboardHeader from '../components/DashboardHeader';
import BookingCard from '../components/BookingCard';
import TicketsView from '../components/TicketsView';
import AlertsView from '../components/AlertsView';
import ProfileView from '../components/ProfileView';
import ReviewModal from '../components/ReviewModal';
import InvoiceModal from '../components/InvoiceModal';
import PermanentRequestsView from '../components/PermanentRequestsView';
import WalletView from '../components/WalletView';

export const CustomerDashboard = ({ onNavigate, activeTab: activeTabProp, setActiveTabExternal }) => {
  const { currentUser, applyReferralCode, updateUserProfile } = useAuth();
  const {
    bookings, updateBookingStatus, submitReview, refreshBooking,
    tickets, submitSupportTicket,
    getCustomerLoyaltyTier, sendChatMessage,
    alerts, reviewAlert, reviewAllAlerts
  } = useData();

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

  // Quotation actions — POST first, then re-pull the canonical booking so the
  // card flips from the server's committed state (never optimistic; rule 16).
  const performQuotationConfirm = useCallback(async (bookingId) => {
    try {
      const res = await api.post(`/bookings/${bookingId}/quotation/confirm`, {});
      if (res.ok) {
        await refreshBooking(bookingId);
        return { ok: true };
      }
      const info = getErrorInfo(res.data, 'Could not confirm the quotation.');
      return { ok: false, error: info.message };
    } catch (e) {
      const info = getErrorInfo(e, 'Could not confirm the quotation.');
      return { ok: false, error: info.message };
    }
  }, [refreshBooking]);

  const performQuotationCancel = useCallback(async (bookingId, anotherProvider, note = '') => {
    try {
      const res = await api.post(`/bookings/${bookingId}/quotation/cancel`, { anotherProvider, note });
      if (res.ok) {
        await refreshBooking(bookingId);
        return { ok: true };
      }
      const info = getErrorInfo(res.data, 'Could not cancel the booking.');
      return { ok: false, error: info.message };
    } catch (e) {
      const info = getErrorInfo(e, 'Could not cancel the booking.');
      return { ok: false, error: info.message };
    }
  }, [refreshBooking]);

  // Memoized data
  const userBookings = useMemo(() => bookings.filter(b => b.customerId === currentUser?.id), [bookings, currentUser]);
  const userTickets = useMemo(() => tickets.filter(t => t.email === currentUser?.email), [tickets, currentUser]);
  const userAlerts = useMemo(() => alerts.filter(a => a.userId === currentUser?.id), [alerts, currentUser]);

  const [permanentCount, setPermanentCount] = useState(0);
  const fetchPermanentCount = useCallback(async () => {
    const res = await api.get('/permanent-service-requests/mine');
    if (res.ok && Array.isArray(res.data)) setPermanentCount(res.data.length);
  }, []);
  useEffect(() => { fetchPermanentCount(); }, [fetchPermanentCount]);

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
            tickets: userTickets.length,
            alerts: userAlerts.length,
            requests: permanentCount
          }}
        />

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 text-center md:text-left">Your Booking Orders</h3>
            {userBookings.length === 0 ? (
              <EmptyBookings onNavigate={onNavigate} />
            ) : (
              <BookingSubTabs bookings={userBookings} onDownloadReceipt={setInvoiceBooking} onCancel={updateBookingStatus} onReview={setReviewBooking} onQuotationConfirm={performQuotationConfirm} onQuotationCancel={performQuotationCancel} openChatBookingId={openChatBookingId} setOpenChatBookingId={setOpenChatBookingId} onSendMessage={sendChatMessage} onNavigate={onNavigate} />
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <PermanentRequestsView onNavigate={onNavigate} />
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
          <AlertsView
            alerts={userAlerts}
            onReview={reviewAlert}
            onReviewAll={reviewAllAlerts}
          />
        )}

        {activeTab === 'profile' && <ProfileView user={currentUser} onSave={handleSaveProfile} />}

        {activeTab === 'wallet' && (
          <WalletView
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

      </div>
    </div>
  );
};

function EmptyBookings({ onNavigate, title = 'No active bookings' }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl bg-white px-3 py-7 text-center sm:py-8">
      <div className="relative mb-4 flex h-28 w-40 items-center justify-center rounded-full bg-[#e8faf8]">
        <ClipboardList className="h-16 w-16 text-[#42c9c0]" strokeWidth={1.5} />
        <span className="absolute bottom-4 right-8 flex h-10 w-10 items-center justify-center rounded-full bg-[#16b5ae] text-white shadow-sm">
          <Clock3 className="h-5 w-5" strokeWidth={2} />
        </span>
      </div>
      <h4 className="text-xl font-black tracking-tight text-[#102244]">{title}</h4>
      <p className="mt-1.5 max-w-xs text-sm font-medium leading-5 text-[#71839d]">
        You don’t have any active service bookings<br className="hidden sm:block" /> right now.
      </p>
      <button 
        onClick={() => onNavigate('services')} 
        className="mt-5 min-w-[190px] rounded-lg bg-[#0da69f] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(13,166,159,.9)] transition-colors hover:bg-[#078f89]"
      >
        Book a Service
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

const TAB_STATUS_QUERY = {
  active: 'CONFIRMED,ONGOING',
  pending: 'PENDING',
  cancelled: 'CANCELLED',
  past: 'COMPLETED',
};

const TAB_PAGE_SIZE = 10;

function BookingSubTabs({ bookings, onDownloadReceipt, onCancel, onReview, onQuotationConfirm, onQuotationCancel, openChatBookingId, setOpenChatBookingId, onSendMessage, onNavigate }) {
  const [subTab, setSubTab] = useState('active');
  const [tabItems, setTabItems] = useState({});
  const [tabMeta, setTabMeta] = useState({});

  const items = tabItems[subTab] || [];
  const meta = tabMeta[subTab] || {};

  const fetchPage = useCallback(async ({ tab, cursor = null, append = false } = {}) => {
    const params = new URLSearchParams({ mode: 'cursor', limit: String(TAB_PAGE_SIZE), statuses: TAB_STATUS_QUERY[tab] });
    if (cursor) params.set('cursor', cursor);

    setTabMeta(prev => ({ ...prev, [tab]: { ...(prev[tab] || {}), loading: !append, loadingMore: append, error: '' } }));

    const res = await api.get(`/bookings?${params.toString()}`);
    if (!res.ok) {
      setTabMeta(prev => ({ ...prev, [tab]: { ...(prev[tab] || {}), loading: false, loadingMore: false, error: res.data?.message || 'Failed to load bookings.' } }));
      return;
    }

    const data = res.data || {};
    const incoming = (data.bookings || []).map(normalizeBooking);
    setTabItems(prev => ({ ...prev, [tab]: append ? [...(prev[tab] || []), ...incoming] : incoming }));
    setTabMeta(prev => ({
      ...prev,
      [tab]: {
        ...(prev[tab] || {}),
        nextCursor: data.pagination?.nextCursor ?? null,
        hasMore: !!data.pagination?.hasMore,
        total: data.pagination?.total ?? (prev[tab]?.total ?? 0),
        loading: false,
        loadingMore: false,
        error: ''
      }
    }));
  }, []);

  // Fetch the first page of the active tab once; later pages come via Load more.
  useEffect(() => {
    if (!tabItems[subTab]) fetchPage({ tab: subTab });
  }, [subTab, tabItems, fetchPage]);

  // Realtime/action/poll status patches land on `bookings` (DataContext), but the
  // visible list is the paginated snapshot in `tabItems`. Overlay the fresh
  // record for every id already shown so cards flip immediately (cancel,
  // accept, complete — both self-initiated and socket-driven), and drop any
  // booking whose status no longer belongs to the sub-tab it was under; its
  // destination sub-tab snapshot is invalidated so it re-fetches on view.
  useEffect(() => {
    if (!bookings.length) return;
    const freshById = new Map();
    bookings.forEach((b) => { if (b?.id) freshById.set(b.id, b); });
    const movedOut = new Map();
    setTabItems(prev => {
      let next = prev;
      Object.keys(prev).forEach(tab => {
        const statuses = (BOOKING_SUB_TABS.find(t => t.id === tab)?.statuses || []).map(s => String(s).toLowerCase());
        const list = prev[tab] || [];
        let changed = false;
        for (const item of list) {
          const fresh = freshById.get(item.id);
          if (!fresh) continue;
          const freshStatus = String(fresh.status || '').toLowerCase();
          // Cross-tab move (e.g. cancel flips the booking to the Cancelled tab).
          if (freshStatus && statuses.length && !statuses.includes(freshStatus)) {
            movedOut.set(item.id, fresh);
            changed = true;
            continue;
          }
          const providerId = (b) => b?.provider?.id ?? b?.provider?.userId ?? null;
          // Skip only when nothing the card renders changed — status, provider
          // AND chat messages must all match, otherwise message-only updates
          // (quick replies) would never reach the visible card.
          if (item.status === fresh.status && providerId(item) === providerId(fresh) &&
              JSON.stringify(item.messages || []) === JSON.stringify(fresh.messages || [])) continue;
          changed = true;
        }
        if (changed) {
          const kept = list.filter(item => !movedOut.has(item.id));
          if (next === prev) next = { ...prev };
          next[tab] = kept.map(item => freshById.get(item.id) || item);
        }
      });
      // A booking moved to another sub-tab → re-fetch that snapshot next time.
      if (next !== prev) {
        movedOut.forEach(fresh => {
          const s = String(fresh.status || '').toLowerCase();
          BOOKING_SUB_TABS.forEach(t => {
            if (t.id !== subTab && t.statuses.some(x => String(x).toLowerCase() === s) && Object.hasOwn(next, t.id)) {
              next[t.id] = undefined;
            }
          });
        });
      }
      return next;
    });
  }, [bookings, subTab]);

  const loadMore = () => {
    if (!meta.nextCursor || meta.loadingMore || meta.loading) return;
    fetchPage({ tab: subTab, cursor: meta.nextCursor, append: true });
  };

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

      {meta.loading ? (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-12 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading {subTab} bookings...
        </div>
      ) : meta.error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-rose-600 font-semibold">{meta.error}</p>
          <button onClick={() => fetchPage({ tab: subTab })} className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700">
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyBookings
          onNavigate={onNavigate}
          title={`No ${subTab} bookings`}
        />
      ) : (
        <div className="space-y-6">
          {items.map(bk => (
            <BookingCard
              key={bk.id}
              booking={bk}
              onDownloadReceipt={onDownloadReceipt}
              onCancel={onCancel}
              onReview={onReview}
              onQuotationConfirm={onQuotationConfirm}
              onQuotationCancel={onQuotationCancel}
              chatOpen={openChatBookingId === bk.id}
              onToggleChat={() => setOpenChatBookingId(openChatBookingId === bk.id ? null : bk.id)}
              onSendMessage={onSendMessage}
            />
          ))}
          {meta.hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={meta.loadingMore}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-5 py-2.5 text-xs rounded-xl transition-colors"
              >
                {meta.loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

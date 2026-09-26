import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Loader2, Calendar, Search, Clock, CheckCircle2, MapPin } from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';
import { useSEO } from '../hooks/useSEO';
import { api } from '../utils/apiClient';
import { cachedRequest } from '../utils/requestCache';
import { normalizeBooking } from '../utils/normalizeCustomerData';
import { getErrorInfo } from '../utils/errorMessages';

// Components
import DashboardHeader from '../components/DashboardHeader';
import BookingCard from '../components/BookingCard';
import TicketsView from '../components/TicketsView';
import AlertsView from '../components/AlertsView';
import ProfileView from '../components/ProfileView';
import CustomerAddresses from '../components/CustomerAddresses';
import ReviewModal from '../components/ReviewModal';
import InvoiceModal from '../components/InvoiceModal';
import PermanentRequestsView from '../components/PermanentRequestsView';
import WalletView from '../components/WalletView';

export const CustomerDashboard = ({ onNavigate, activeTab: activeTabProp, setActiveTabExternal }) => {
  useSEO({ title: 'My Dashboard – ServeGo24', description: 'Manage your bookings and account.', path: '/dashboard-customer', robots: 'noindex,nofollow' });
  const { currentUser, updateUserProfile } = useAuth();
  const {
    bookings, updateBookingStatus, submitReview, refreshBooking,
    tickets, submitSupportTicket,
    sendChatMessage,
    alerts, reviewAlert, reviewAllAlerts
  } = useData();

  const [internalActiveTab, setInternalActiveTab] = useState('bookings');
  const activeTab = activeTabProp || internalActiveTab;
  const setActiveTab = setActiveTabExternal || setInternalActiveTab;

  // Modal states
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
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
  const [pendingManualRequests, setPendingManualRequests] = useState([]);
  const fetchPermanentCount = useCallback(async () => {
    // Same cachedRequest key as PermanentRequestsView — both resolve from ONE
    // request instead of two when the requests tab and dashboard mount together.
    const res = await cachedRequest('permanent-service-requests/mine', () => api.get('/permanent-service-requests/mine'));
    if (res.ok && Array.isArray(res.data)) {
      setPermanentCount(res.data.length);
      setPendingManualRequests(res.data.filter((request) => request.requestType === 'NO_PROVIDER' && request.status === 'PENDING'));
    }
  }, []);
  useEffect(() => { fetchPermanentCount(); }, [fetchPermanentCount]);

  // Actions
  const openReview = useCallback((booking) => {
    setReviewError('');
    setReviewComment('');
    setReviewRating(5);
    setReviewBooking(booking);
  }, []);

  const handlePublishReview = async (e) => {
    e.preventDefault();
    if (!reviewBooking || reviewSubmitting) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      const result = await submitReview(reviewBooking.id, reviewBooking.providerId, reviewRating, reviewComment);
      if (result?.ok === false) {
        setReviewError(getErrorInfo(result.error, 'Could not publish your review. Please try again.').message);
        return;
      }
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

  const handleSaveProfile = (form) => updateUserProfile(currentUser?.id, form);

  return (
    <div id="customer-dashboard-page" className="bg-slate-50 min-h-screen py-10 px-4 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto">
        
        {reviewBooking && (
          <ReviewModal 
            booking={reviewBooking}
            rating={reviewRating} setRating={setReviewRating}
            comment={reviewComment} setComment={setReviewComment}
            onClose={() => { setReviewBooking(null); setReviewError(''); }}
            onSubmit={handlePublishReview}
            submitting={reviewSubmitting}
            error={reviewError}
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
            {userBookings.length === 0 && pendingManualRequests.length === 0 ? (
              <EmptyBookings onNavigate={onNavigate} />
            ) : (
              <BookingSubTabs bookings={userBookings} manualRequests={pendingManualRequests} onDownloadReceipt={setInvoiceBooking} onCancel={updateBookingStatus} onReview={openReview} onQuotationConfirm={performQuotationConfirm} onQuotationCancel={performQuotationCancel} openChatBookingId={openChatBookingId} setOpenChatBookingId={setOpenChatBookingId} onSendMessage={sendChatMessage} onNavigate={onNavigate} />
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

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <ProfileView user={currentUser} onSave={handleSaveProfile} />
            {currentUser?.role === 'customer' && <CustomerAddresses />}
          </div>
        )}

        {activeTab === 'wallet' && (
          <WalletView user={currentUser} />
        )}

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

const TAB_STATUS_QUERY = {
  active: 'CONFIRMED,ONGOING',
  pending: 'PENDING',
  cancelled: 'CANCELLED',
  past: 'COMPLETED',
};

const TAB_PAGE_SIZE = 10;

function BookingSubTabs({ bookings, manualRequests = [], onDownloadReceipt, onCancel, onReview, onQuotationConfirm, onQuotationCancel, openChatBookingId, setOpenChatBookingId, onSendMessage, onNavigate }) {
  const [subTab, setSubTab] = useState('active');
  const [tabItems, setTabItems] = useState({});
  const [tabMeta, setTabMeta] = useState({});

  const items = tabItems[subTab] || [];
  const visibleManualRequests = subTab === 'pending' ? manualRequests : [];
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
          // Read the SCALAR providerId first: a PENDING booking is unowned, so the
          // API returns `provider: null` and the nested relation can no longer be
          // the source of truth for "did a provider get assigned".
          const providerId = (b) => b?.providerId ?? b?.provider?.id ?? b?.provider?.userId ?? null;
          // Skip only when nothing the card renders changed — status, provider
          // AND chat messages must all match, otherwise message-only updates
          // (quick replies) would never reach the visible card.
          if (item.status === fresh.status && providerId(item) === providerId(fresh) &&
              Boolean(item.reviewed) === Boolean(fresh.reviewed) &&
              JSON.stringify(item.messages || []) === JSON.stringify(fresh.messages || [])) continue;
          changed = true;
        }
        if (changed) {
          const kept = list.filter(item => !movedOut.has(item.id));
          if (next === prev) next = { ...prev };
          next[tab] = kept.map(item => freshById.get(item.id) || item);
        }
      });
      // A booking moved to another sub-tab → re-fetch that snapshot next time
      // it is viewed (excluding the tab currently on screen, which gets the
      // live move-in below).
      if (next !== prev) {
        movedOut.forEach(fresh => {
          const s = String(fresh.status || '').toLowerCase();
          BOOKING_SUB_TABS.forEach(t => {
            if (t.id !== subTab && t.statuses.some(x => String(x).toLowerCase() === s) && Object.hasOwn(next, t.id)) {
              next[t.id] = undefined;
            }
          });
        });

        // Live move-in: a booking leaving one tab lands on screen in its
        // destination tab immediately (e.g. provider accepts → pending card
        // flips into Active without a manual refresh).
        const currentTab = BOOKING_SUB_TABS.find(t => t.id === subTab);
        const curStatuses = currentTab ? currentTab.statuses.map(x => String(x).toLowerCase()) : [];
        const currentList = next[subTab] || [];
        const arrivals = [...movedOut.values()].filter(fresh =>
          fresh &&
          curStatuses.includes(String(fresh.status || '').toLowerCase()) &&
          !currentList.some(x => x.id === fresh.id)
        );
        if (arrivals.length) {
          next[subTab] = [...arrivals, ...currentList];
        }
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
    result.pending += manualRequests.length;
    return result;
  }, [bookings, manualRequests]);

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
      ) : items.length === 0 && visibleManualRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            {subTab === 'active' && <Clock className="w-7 h-7 text-slate-400" />}
            {subTab === 'pending' && <Calendar className="w-7 h-7 text-slate-400" />}
            {subTab === 'cancelled' && <CheckCircle2 className="w-7 h-7 text-slate-400" />}
            {subTab === 'past' && <CheckCircle2 className="w-7 h-7 text-slate-400" />}
          </div>
          <p className="text-slate-700 text-sm font-bold">No {subTab} bookings</p>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {subTab === 'active' && "You don't have any active bookings right now."}
            {subTab === 'pending' && "You don't have any pending bookings right now."}
            {subTab === 'cancelled' && "You haven't cancelled any bookings."}
            {subTab === 'past' && "You don't have any completed bookings yet."}
          </p>
          {(subTab === 'active' || subTab === 'pending') && (
            <button
              onClick={() => onNavigate('services')}
              className="mt-5 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Browse Services
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {visibleManualRequests.map((request) => (
            <ManualBookingRequestCard key={request.id} request={request} />
          ))}
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

function ManualBookingRequestCard({ request }) {
  return (
    <article className="bg-white rounded-xl border border-amber-200 p-4 sm:p-5 shadow-2xs text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-amber-600">Manual provider arrangement</p>
          <h4 className="mt-1 text-sm font-extrabold text-slate-900">{request.serviceCategory || 'Service request'}</h4>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase text-amber-800">Pending</span>
      </div>
      <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600">
        No provider is currently available. Our admin team will arrange and assign a provider for you.
      </p>
      <div className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold text-slate-600">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span>{request.locationAddress || 'Service location pending'}</span>
      </div>
      {request.additionalInfo && (
        <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] font-medium text-slate-600">{request.additionalInfo}</p>
      )}
    </article>
  );
}

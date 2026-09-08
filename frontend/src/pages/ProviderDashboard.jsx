import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { ShieldAlert } from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';
import { api } from '../utils/apiClient';
import { cachedRequest } from '../utils/requestCache';

// Components
import ProviderHeader from '../components/ProviderHeader';
import ProviderLeadsInbox from '../components/ProviderLeadsInbox';
import ProviderLevelAnalytics from '../components/ProviderLevelAnalytics';

import ProviderServicesPanel from '../components/ProviderServicesPanel';
import ProviderReviews from '../components/ProviderReviews';
import ProviderProfileView from '../components/ProviderProfileView';
import ProviderSupport from '../components/ProviderSupport';
import ProviderWalletAmbassador from '../components/ProviderWalletAmbassador';


export const ProviderDashboard = ({ onNavigate, activeTab: activeTabProp, setActiveTabExternal }) => {

  const { currentUser } = useAuth();
  const {
    providers, bookings, services, tickets,
    myProviderSummary,
    updateBookingStatus, submitSupportTicket
  } = useData();

  const activeProvider = useMemo(() => {
    // Prefer the purpose-specific dashboard summary; fall back to the providers
    // list while it loads or if it fails, so the dashboard never flashes empty.
    if (myProviderSummary) return myProviderSummary;

    const providerIdCandidate = currentUser?.providerId;
    const providerUserIdCandidate = currentUser?.id;

    const byProviderId = providerIdCandidate ? providers.find(p => p.id === providerIdCandidate) : null;
    const byUserId = providerUserIdCandidate ? providers.find(p => p.userId === providerUserIdCandidate) : null;

    return byProviderId || byUserId || null;
  }, [providers, currentUser, myProviderSummary]);

  // Single fetch for provider's approved services — shared by ProviderHeader + ProviderServicesPanel
  const [approvedServices, setApprovedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const fetchProviderApprovedServices = useCallback(async () => {
    if (!activeProvider?.id) return;
    setLoadingServices(true);
    try {
      const res = await api.get(`/providers/${activeProvider.id}/services`);
      const data = res.data;
      if (res.ok && Array.isArray(data)) {
        setApprovedServices(data.filter(s => s?.approvalStatus === 'APPROVED'));
      }
    } catch {
      // ignore
    } finally {
      setLoadingServices(false);
    }
  }, [activeProvider?.id]);

  // Progressive loading. The header and the lead inbox (the default tab) render
  // from context + self-fetch the moment the page paints — that's the immediate
  // tier. A short moment later the "then" tier warms the next-most-likely
  // destinations in the background: approved services (header chips + Services
  // tab) and the Performance endpoint (cached in requestCache
  // so opening those tabs resolves instantly). Services management, wallet,
  // support and profile stay strictly tab-click (they self-fetch or read
  // context when opened).
  useEffect(() => {
    if (!activeProvider?.id) return undefined;
    const warm = (key, fn) => cachedRequest(key, fn).catch(() => {});
    const timer = setTimeout(() => {
      fetchProviderApprovedServices();
      warm('provider-performance/me', () => api.get('/provider-performance/me'));
      warm('level-rules', () => api.get('/level-rules'));
      warm('promotions/me', () => api.get('/promotions/me'));
    }, 300);
    return () => clearTimeout(timer);
  }, [activeProvider?.id, fetchProviderApprovedServices]);

  const [internalActiveTab, setInternalActiveTab] = useState('leads');
  const activeTab = activeTabProp || internalActiveTab;
  const setActiveTab = setActiveTabExternal || setInternalActiveTab;

  const allocatedBookings = useMemo(() => bookings.filter(b => b.providerId === activeProvider?.id), [bookings, activeProvider]);
  const activeLeads = useMemo(() => allocatedBookings.filter(b => ['pending', 'confirmed', 'ongoing'].includes(b.status)), [allocatedBookings]);
  const completedJobs = useMemo(() => allocatedBookings.filter(b => b.status === 'completed'), [allocatedBookings]);
  const completedCount = completedJobs.length;

  const myTickets = useMemo(
    () => (Array.isArray(tickets) ? tickets : []).filter(t => (t.requesterEmail || t.email) === currentUser?.email),
    [tickets, currentUser]
  );
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketMsg.trim()) return;
    setTicketSubmitting(true);
    try {
      await submitSupportTicket({
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

  const isPending = currentUser?.status === 'pending' || !activeProvider?.isVerified;

  return (
    <div id="provider-dashboard-page" className="bg-slate-50 min-h-screen py-8 px-4 pb-24 md:py-10 md:pb-10">
      <div className="max-w-6xl mx-auto">

        {isPending && <PendingBanner />}

        {!isPending && activeProvider && (
          <ProviderHeader provider={activeProvider} completedJobs={completedCount} totalJobs={allocatedBookings.length} approvedServices={approvedServices} loadingServices={loadingServices} />
        )}

        <TabList activeTab={activeTab} setActiveTab={setActiveTab} leadsCount={activeLeads.length} reviewsCount={activeProvider?.reviews?.length || 0} />

        {activeTab === 'leads' && (
          <ProviderLeadsInbox providerId={activeProvider?.id} updateBookingStatus={updateBookingStatus} />
        )}

        {activeTab === 'level' && (
          <ProviderLevelAnalytics providerId={activeProvider?.id} />
        )}

        {activeTab === 'services' && activeProvider && (
          <ProviderServicesPanel
            provider={activeProvider}
            initialServices={approvedServices}
            allServices={services}
            onRefresh={fetchProviderApprovedServices}
          />
        )}

        {activeTab === 'reviews' && <ProviderReviews rating={activeProvider?.rating} reviews={activeProvider?.reviews} />}

        {activeTab === 'support' && (
          <ProviderSupport
            tickets={myTickets}
            onSubmit={handleTicketSubmit}
            subject={ticketSubject} setSubject={setTicketSubject}
            message={ticketMsg} setMessage={setTicketMsg}
            success={ticketSuccess}
            submitting={ticketSubmitting}
          />
        )}

        {activeTab === 'wallet' && (
          <ProviderWalletAmbassador provider={activeProvider} />
        )}

        {activeTab === 'profile' && activeProvider && (
          <ProviderProfileView />
        )}

      </div>

    </div>
  );
};

function PendingBanner() {
  return (
    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 justify-between text-slate-800">
      <div className="flex gap-4 items-start text-xs sm:text-sm text-left">
        <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
        <div>
          <h4 className="font-bold text-slate-900 text-base uppercase">Profile Awaiting Authorization</h4>
          <p className="text-slate-600 mt-1 font-medium">Your registration is currently under review. verified soon.</p>
        </div>
      </div>
      <span className="bg-amber-100 text-amber-800 font-black text-[10px] uppercase px-3 py-1.5 rounded-full border border-amber-200">Status: Pending Approval</span>
    </div>
  );
}

function TabList({ activeTab, setActiveTab, leadsCount, reviewsCount }) {
  const tabs = [
    { id: 'leads', label: `Leads (${leadsCount})` },
    { id: 'services', label: 'My Services' },
    { id: 'reviews', label: `Reviews (${reviewsCount})` },
    { id: 'level', label: 'Performance & Analytics' },
    { id: 'wallet', label: 'Wallet & Ambassador' },
    { id: 'support', label: 'Support' },
    { id: 'profile', label: 'Profile' }
  ];

  return (
    <div className="sticky top-16 z-20 -mx-4 mb-8 bg-slate-50/95 backdrop-blur px-4 pb-1 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none md:pb-0">
      <div className="flex gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar flex-nowrap w-full sm:w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

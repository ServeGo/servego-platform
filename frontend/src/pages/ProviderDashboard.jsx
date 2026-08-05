import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/apiClient';

// Components
import ProviderHeader from '../components/ProviderHeader';
import ProviderLeadsInbox from '../components/ProviderLeadsInbox';
import ProviderPlans from '../components/ProviderPlans';
import ProviderLevelPerformance from '../components/ProviderLevelPerformance';

import ProviderServicesPanel from '../components/ProviderServicesPanel';
import ProviderReviews from '../components/ProviderReviews';
import ProviderSupport from '../components/ProviderSupport';
import ProviderReferrals from '../components/ProviderReferrals';
import ProviderProfileView from '../components/ProviderProfileView';
import ProviderAnalyticsDashboard from '../components/ProviderAnalyticsDashboard';
import ProviderWallet from '../components/ProviderWallet';
import ProviderDisputesView from '../components/ProviderDisputesView';


export const ProviderDashboard = ({ onNavigate, activeTab: activeTabProp, setActiveTabExternal }) => {

  const {
    currentUser, providers, bookings, services,
    updateBookingStatus, submitSupportTicket, tickets,
    applyReferralCode
  } = useApp();

  const activeProvider = useMemo(() => {
    const providerIdCandidate = currentUser?.providerId;
    const providerUserIdCandidate = currentUser?.id;

    const byProviderId = providerIdCandidate ? providers.find(p => p.id === providerIdCandidate) : null;
    const byUserId = providerUserIdCandidate ? providers.find(p => p.userId === providerUserIdCandidate) : null;

    return byProviderId || byUserId || null;
  }, [providers, currentUser]);

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

  useEffect(() => {
    fetchProviderApprovedServices();
  }, [fetchProviderApprovedServices]);

  const [internalActiveTab, setInternalActiveTab] = useState('leads');
  const activeTab = activeTabProp || internalActiveTab;
  const setActiveTab = setActiveTabExternal || setInternalActiveTab;

  // Local UI States
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [refSuccess, setRefSuccess] = useState('');
  const [refError, setRefError] = useState('');
  const [referralMeta, setReferralMeta] = useState({
    referredBy: null,
    referredCount: 0,
    bonusEarned: 0
  });

  const allocatedBookings = useMemo(() => bookings.filter(b => b.providerId === activeProvider?.id), [bookings, activeProvider]);
  const activeLeads = useMemo(() => allocatedBookings.filter(b => ['pending', 'confirmed', 'ongoing'].includes(b.status)), [allocatedBookings]);
  const completedJobs = useMemo(() => allocatedBookings.filter(b => b.status === 'completed'), [allocatedBookings]);
  const completedCount = completedJobs.length;



  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSupportSubmitting(true);
    try {
      submitSupportTicket({ name: activeProvider?.name, email: currentUser?.email, subject: supportSubject, message: supportMsg });
      setSupportSubject(''); setSupportMsg(''); setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 4000);
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleApplyReferral = async (e) => {
    e.preventDefault();
    const res = await applyReferralCode(referralInput);
    if (res.success) {
      setRefSuccess(res.message);
      setRefError('');
      setReferralInput('');
      setReferralMeta({
        referredBy: res.referredBy,
        referredCount: res.referredCount,
        bonusEarned: res.bonusEarned
      });
    } else {
      setRefError(res.message);
      setRefSuccess('');
    }
  };


  const isPending = currentUser?.status === 'pending' || !activeProvider?.isVerified;

  return (
    <div id="provider-dashboard-page" className="bg-slate-50 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {isPending && <PendingBanner />}

        {!isPending && activeProvider && (
          <ProviderHeader provider={activeProvider} completedJobs={completedCount} totalJobs={allocatedBookings.length} approvedServices={approvedServices} loadingServices={loadingServices} />
        )}

        <TabList activeTab={activeTab} setActiveTab={setActiveTab} leadsCount={activeLeads.length} reviewsCount={activeProvider?.reviews?.length || 0} />

        {activeTab === 'leads' && (
          <ProviderLeadsInbox providerId={activeProvider?.id} updateBookingStatus={updateBookingStatus} />
        )}

        {activeTab === 'plans' && (
          <ProviderPlans providerId={activeProvider?.id} />
        )}

        {activeTab === 'level' && (
          <ProviderLevelPerformance providerId={activeProvider?.id} />
        )}

        {activeTab === 'services' && activeProvider && (
          <ProviderServicesPanel
            provider={activeProvider}
            initialServices={approvedServices}
            allServices={services}
            onRefresh={fetchProviderApprovedServices}
          />
        )}

        {activeTab === 'analytics' && activeProvider && (
          <ProviderAnalyticsDashboard
            providerId={activeProvider.id}
          />
        )}


        {activeTab === 'reviews' && <ProviderReviews rating={activeProvider?.rating} reviews={activeProvider?.reviews} />}

        {activeTab === 'disputes' && (
          <ProviderDisputesView providerId={activeProvider?.id} bookings={allocatedBookings} />
        )}


        {activeTab === 'support' && (
          <ProviderSupport
            tickets={tickets.filter(t => t.requesterEmail === currentUser?.email)}
            onSubmit={handleSupportSubmit}
            subject={supportSubject} setSubject={setSupportSubject}
            message={supportMsg} setMessage={setSupportMsg}
            success={ticketSuccess}
            submitting={supportSubmitting}
          />
        )}

        {activeTab === 'wallet' && (
          <ProviderWallet providerId={activeProvider?.id} />
        )}

        {activeTab === 'referrals' && (
          <ProviderReferrals
            provider={activeProvider}
            referralInput={referralInput} setReferralInput={setReferralInput}
            onApply={handleApplyReferral}
            onCopy={() => { navigator.clipboard.writeText(activeProvider?.referralCode || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            copied={copied}
            refError={refError}
            refSuccess={refSuccess}
            referredBy={referralMeta?.referredBy || currentUser?.referredBy}
          />
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
    <div className="mb-8 bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:row items-center gap-6 justify-between text-slate-800">
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
    { id: 'plans', label: 'Subscription' },
    { id: 'level', label: 'Level & Performance' },
    { id: 'services', label: 'My Services' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reviews', label: `Reviews (${reviewsCount})` },
    { id: 'disputes', label: 'Disputes' },
    { id: 'wallet', label: '💰 Wallet' },
    { id: 'support', label: 'Support' },
    { id: 'referrals', label: '🤝 Ambassador' },
    { id: 'profile', label: 'Profile' }
  ];

  return (
    <div className="flex flex-wrap gap-1 bg-white border border-slate-200 p-1.5 rounded-2xl mb-8 w-full sm:w-fit">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
      ))}
    </div>
  );
}

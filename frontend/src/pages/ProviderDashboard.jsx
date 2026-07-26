import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { ShieldAlert, ListOrdered } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/apiClient';

// Components
import ProviderHeader from '../components/ProviderHeader';
import LeadCard from '../components/LeadCard';
// EarningsChart intentionally removed; keep code minimal to avoid unused imports.

import ProviderServicesPanel from '../components/ProviderServicesPanel';
import ProviderReviews from '../components/ProviderReviews';
import ProviderSupport from '../components/ProviderSupport';
import ProviderReferrals from '../components/ProviderReferrals';
import ProviderProfileView from '../components/ProviderProfileView';
import ProviderAnalyticsDashboard from '../components/ProviderAnalyticsDashboard';


export const ProviderDashboard = ({ onNavigate, activeTab: activeTabProp, setActiveTabExternal }) => {

  const { 
    currentUser, providers, bookings, services,
    updateBookingStatus, submitSupportTicket, tickets,
    applyReferralCode, sendChatMessage
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
  const [openChatBookingId, setOpenChatBookingId] = useState(null);
  const [chatInput, setChatInput] = useState('');
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

  // (provider profile local editing removed; admin flows handle updates elsewhere)

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

          <LeadsPage

            activeLeads={allocatedBookings}
            openChatBookingId={openChatBookingId}
            onToggleChat={(id) => setOpenChatBookingId(openChatBookingId === id ? null : id)}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onAccept={(id) => updateBookingStatus(id, 'confirmed', 'Accepted.')}
            onReject={(id) => updateBookingStatus(id, 'cancelled', 'Rejected.')}
            onStartWork={(id, verificationCode) => updateBookingStatus(id, 'ongoing', 'Work started.', verificationCode)}
            onFinishWork={(id) => updateBookingStatus(id, 'completed', 'Completed.')}
            onSendMessage={sendChatMessage}
          />
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
    { id: 'services', label: 'My Services' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'reviews', label: `Reviews (${reviewsCount})` },
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

function EmptyLeads({ variant = 'pending' }) {
  const title = variant === 'active' ? 'No Active Leads' : 'No Pending Lead Proposals';
  const desc =
    variant === 'active'
      ? 'Once you accept an offer, it will move to Active Duty.'
      : 'When customers choose you in your zones, new orders will appear here.';

  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-2xs max-w-md mx-auto">
      <ListOrdered className="w-10 h-10 text-slate-300 mx-auto mb-4" />
      <h4 className="text-base font-bold text-slate-900">{title}</h4>
      <p className="text-slate-500 text-xs mt-1 font-medium">{desc}</p>
    </div>
  );
}

function LeadsPage({
  activeLeads,
  openChatBookingId,
  onToggleChat,
  chatInput,
  setChatInput,
  onAccept,
  onReject,
  onStartWork,
  onFinishWork,
  onSendMessage
}) {
  const [statusFilter, setStatusFilter] = useState('active'); // pending | active | completed | all
  const [query, setQuery] = useState('');
  const [sortDir, setSortDir] = useState('desc'); // desc | asc

  const subTabCounts = useMemo(() => ({
    pending: activeLeads.filter(b => b.status === 'pending').length,
    active: activeLeads.filter(b => ['confirmed', 'in_progress', 'en_route', 'ongoing'].includes(b.status)).length,
    completed: activeLeads.filter(b => ['completed', 'reviewed', 'cancelled'].includes(b.status)).length,
    all: activeLeads.length,
  }), [activeLeads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let arr = [...activeLeads];

    if (statusFilter === 'pending') {
      arr = arr.filter(b => b.status === 'pending');
    } else if (statusFilter === 'active') {
      arr = arr.filter(b => ['confirmed', 'in_progress', 'en_route', 'ongoing'].includes(b.status));
    } else if (statusFilter === 'completed') {
      arr = arr.filter(b => ['completed', 'reviewed', 'cancelled'].includes(b.status));
    }
    // 'all' — no filter

    if (q) {
      arr = arr.filter(b => {
        const hay = [
          b.serviceCategory,
          b.customerName,
          b.locationAddress,
          b.instructions,
          b.id
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const toSortableDate = (b) => {
      const d = b.createdAt ? new Date(b.createdAt) : null;
      return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    };

    arr.sort((a, b) => {
      const diff = toSortableDate(a) - toSortableDate(b);
      return sortDir === 'desc' ? -diff : diff;
    });

    return arr;
  }, [activeLeads, query, statusFilter, sortDir]);

  const leadsLabel = statusFilter === 'pending' ? 'Pending Offers' : statusFilter === 'active' ? 'Active Duty' : 'All Leads';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight text-left">{leadsLabel}</h3>

            <p className="text-xs text-slate-500 font-semibold mt-1">Accept, coordinate, and complete jobs directly from here.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                  statusFilter === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Pending {subTabCounts.pending > 0 && <span className="opacity-70">({subTabCounts.pending})</span>}
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                  statusFilter === 'active' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Active {subTabCounts.active > 0 && <span className="opacity-70">({subTabCounts.active})</span>}
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                  statusFilter === 'completed' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Completed {subTabCounts.completed > 0 && <span className="opacity-70">({subTabCounts.completed})</span>}
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                All {subTabCounts.all > 0 && <span className="opacity-70">({subTabCounts.all})</span>}
              </button>
            </div>

            <div className="flex gap-2 items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client, address, date, ID..."
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs font-bold outline-none"
              />
              <button
                onClick={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition-all"
              >
                Sort: {sortDir === 'desc' ? 'Newest' : 'Oldest'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyLeads variant={statusFilter === 'active' ? 'active' : 'pending'} />
      ) : (
        <div className="space-y-4">
          {filtered.map(bk => (
            <LeadCard
              key={bk.id}
              lead={bk}
              onAccept={onAccept}
              onReject={onReject}
              onStartWork={onStartWork}
              onFinishWork={onFinishWork}
              chatOpen={openChatBookingId === bk.id}
              onToggleChat={() => onToggleChat(bk.id)}
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


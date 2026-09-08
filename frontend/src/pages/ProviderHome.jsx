import React, { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Headphones,
  Inbox,
  MapPin,
  Star,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';

/**
 * Dedicated Provider Home (mobile bottom-nav target). Modeled on CustomerHome:
 * a logged-in command centre for the provider, with quick tiles that drop into
 * the provider dashboard tabs.
 */
export const ProviderHome = ({ onGoToTab }) => {
  const { currentUser } = useAuth();
  const { providers, bookings, myProviderSummary } = useData();

  const activeProvider = useMemo(() => {
    if (myProviderSummary) return myProviderSummary;
    const providerIdCandidate = currentUser?.providerId;
    const providerUserIdCandidate = currentUser?.id;
    const byProviderId = providerIdCandidate ? providers.find(p => p.id === providerIdCandidate) : null;
    const byUserId = providerUserIdCandidate ? providers.find(p => p.userId === providerUserIdCandidate) : null;
    return byProviderId || byUserId || null;
  }, [providers, currentUser, myProviderSummary]);

  const firstName = (currentUser?.name || 'Provider').split(' ')[0];
  const providerName = activeProvider?.name || firstName;

  const allocatedBookings = useMemo(
    () => bookings.filter(b => b.providerId === activeProvider?.id),
    [bookings, activeProvider]
  );
  const activeLeads = useMemo(
    () => allocatedBookings.filter(b => ['pending', 'confirmed', 'ongoing'].includes(b.status)),
    [allocatedBookings]
  );
  const completedJobs = useMemo(
    () => allocatedBookings.filter(b => b.status === 'completed'),
    [allocatedBookings]
  );
  const reviewsCount = activeProvider?.reviews?.length || 0;

  const quickTiles = [
    {
      label: 'Leads',
      sub: 'New job opportunities',
      icon: Inbox,
      tone: 'bg-indigo-500/15 text-indigo-600',
      badge: activeLeads.length,
      onClick: () => onGoToTab('leads'),
    },
    {
      label: 'My Services',
      sub: 'Manage offerings',
      icon: Wrench,
      tone: 'bg-teal-500/15 text-teal-600',
      onClick: () => onGoToTab('services'),
    },
    {
      label: 'Wallet',
      sub: 'Earnings & withdrawal',
      icon: Wallet,
      tone: 'bg-emerald-500/15 text-emerald-600',
      onClick: () => onGoToTab('wallet'),
    },
    {
      label: 'Performance',
      sub: 'Analytics & level',
      icon: BarChart3,
      tone: 'bg-violet-500/15 text-violet-600',
      onClick: () => onGoToTab('analytics'),
    },
    {
      label: 'Reviews',
      sub: reviewsCount > 0 ? `${reviewsCount} customer reviews` : 'See what customers say',
      icon: Star,
      tone: 'bg-amber-500/15 text-amber-600',
      onClick: () => onGoToTab('reviews'),
    },
    {
      label: 'Support',
      sub: 'Help & tickets',
      icon: Headphones,
      tone: 'bg-rose-500/15 text-rose-600',
      onClick: () => onGoToTab('support'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden bg-slate-950 rounded-b-[2.5rem] px-5 pt-7 pb-10 text-white">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-teal-600/30 blur-3xl" />
        <div className="absolute top-10 right-8 w-3 h-3 rounded-full bg-indigo-400/70 animate-ping" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-400">
              servego24 • Provider
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight leading-tight">
              Hii {firstName} 👋
            </h1>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              {activeLeads.length > 0
                ? `${activeLeads.length} active lead${activeLeads.length > 1 ? 's' : ''} waiting for you.`
                : 'You are all caught up on leads for now.'}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[10px] font-bold text-slate-200">
              <MapPin className="w-3 h-3 text-indigo-400" />
              Hyderabad Node
            </div>
          </div>
          {activeProvider?.avatar || activeProvider?.photo ? (
            <img
              src={activeProvider.avatar || activeProvider.photo}
              alt={`${providerName} avatar`}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-400/40 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-600 flex items-center justify-center font-black text-base ring-2 ring-white/10 shrink-0">
              {providerName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Leads CTA */}
      <section aria-label="View leads" className="px-4 -mt-6 relative z-20">
        <button
          type="button"
          onClick={() => onGoToTab('leads')}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-sm rounded-2xl py-4 px-5 flex items-center justify-between shadow-[0_18px_40px_-16px_rgba(79,70,229,0.55)] transition-all active:scale-[0.98] border border-indigo-400/40"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </span>
            View My Leads
          </span>
          <span className="text-[10px] font-bold text-indigo-900 bg-white/90 rounded-full px-2.5 py-1">
            {activeLeads.length > 0 ? `${activeLeads.length} AVAILABLE` : 'GO TO LEADS'}
          </span>
        </button>
      </section>

      {/* Stats strip */}
      <section aria-label="Provider stats" className="px-4 mt-5 relative z-20">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Rating', value: activeProvider?.rating ?? '—', tone: 'text-amber-500' },
            { label: 'Total Jobs', value: allocatedBookings.length, tone: 'text-indigo-600' },
            { label: 'Completed', value: completedJobs.length, tone: 'text-slate-900' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-3 text-center shadow-[0_10px_24px_-20px_rgba(15,23,42,0.5)]">
              <p className={`text-lg font-black ${s.tone}`}>{s.value}</p>
              <p className="mt-0.5 text-[9px] uppercase font-extrabold tracking-wider text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick action tiles */}
      <section aria-label="Quick actions" className="px-4 mt-6 relative z-20">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Your workspace</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {quickTiles.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                type="button"
                onClick={t.onClick}
                className="relative bg-white border border-slate-200 rounded-2xl p-4 text-left shadow-[0_14px_34px_-22px_rgba(15,23,42,0.5)] transition-all active:scale-[0.98]"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.tone}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <p className="mt-3 text-xs font-black text-slate-900">{t.label}</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400 leading-snug">{t.sub}</p>
                {t.badge > 0 && (
                  <span className="absolute top-3 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Help / support card */}
      <section aria-label="Need help" className="px-4 mt-8 pb-2">
        <button
          type="button"
          onClick={() => onGoToTab('support')}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl px-5 py-5 flex items-center justify-between text-left transition-all active:scale-[0.98]"
        >
          <div>
            <p className="text-sm font-black">Need a hand?</p>
            <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
              Raise a help ticket — a servego24 agent will follow up.
            </p>
          </div>
          <ArrowRight className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
        </button>
      </section>
    </div>
  );
};

export default ProviderHome;

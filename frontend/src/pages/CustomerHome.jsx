import React from 'react';
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Droplets,
  MapPin,
  PaintRoller,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useAuth, useData, useUI } from '../context/AppContext';

/**
 * Dedicated Customer Home (mobile bottom-nav target). Deliberately distinct from
 * the public marketing home: it is the logged-in customer's command centre.
 * A big "Explore Services" entry point goes to the Services catalogue; quick
 * tiles drop straight into the dashboard tabs.
 */
const POPULAR_FALLBACKS = [
  { id: 'electrician', name: 'Electrician', icon: Wrench, tone: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'plumber', name: 'Plumber', icon: Droplets, tone: 'bg-sky-50 text-sky-600 border-sky-100' },
  { id: 'ac-repair', name: 'AC Repair', icon: Snowflake, tone: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { id: 'home-cleaning', name: 'Home Cleaning', icon: Sparkles, tone: 'bg-teal-50 text-teal-600 border-teal-100' },
  { id: 'painting', name: 'Painting', icon: PaintRoller, tone: 'bg-rose-50 text-rose-600 border-rose-100' },
  { id: 'deep-cleaning', name: 'Deep Cleaning', icon: ShieldCheck, tone: 'bg-violet-50 text-violet-600 border-violet-100' },
];

export const CustomerHome = ({ onNavigate, onGoToTab }) => {
  const { currentUser } = useAuth();
  const { services, alerts } = useData();
  const { selectedArea } = useUI();

  // Popular services come from the live catalog so the admin-uploaded service
  // images show here too. Fall back to the static icon list only when the
  // catalog is empty.
  const popularServices = (() => {
    const list = Array.isArray(services) ? services : [];
    if (list.length === 0) return POPULAR_FALLBACKS;
    const ranked = list
      .filter((s) => s && s.isHidden !== true && s.hidden !== true)
      .sort((a, b) => (b.activeSpecialistCount || 0) - (a.activeSpecialistCount || 0));
    const popularity = (name) => POPULAR_FALLBACKS.findIndex((f) => f.name.toLowerCase() === (name || '').toLowerCase());
    const preferred = ranked
      .filter((s) => popularity(s.name) >= 0)
      .sort((a, b) => popularity(a.name) - popularity(b.name))
      .slice(0, POPULAR_FALLBACKS.length);
    const rest = ranked
      .filter((s) => !preferred.includes(s))
      .slice(0, POPULAR_FALLBACKS.length - preferred.length);
    return [...preferred, ...rest].map((s) => {
      const fallback = POPULAR_FALLBACKS.find((f) => f.name.toLowerCase() === (s.name || '').toLowerCase());
      return {
        id: s.id,
        name: s.name,
        image: s.image || null,
        icon: fallback?.icon || Wrench,
        tone: fallback?.tone || 'bg-teal-50 text-teal-600 border-teal-100',
      };
    });
  })();

  const firstName = (currentUser?.name || 'Customer').split(' ')[0];
  const areaLabel = selectedArea || 'Hyderabad';
  const alertCount = (alerts || []).filter((a) => a.userId === currentUser?.id).length;

  const goBook = (serviceId) => {
    // Intent handoff to the Services page: it auto-opens the temporary/permanent
    // choice for this category on arrival.
    sessionStorage.setItem('servego_booking_intent', JSON.stringify({ catId: serviceId }));
    onNavigate('services');
  };

  const quickTiles = [
    { label: 'My Bookings', sub: 'Track & manage', icon: CalendarCheck, tone: 'bg-teal-500/15 text-teal-600', onClick: () => onGoToTab('bookings') },
    { label: 'Wallet', sub: 'Balance & fees', icon: Wallet, tone: 'bg-indigo-500/15 text-indigo-600', onClick: () => onGoToTab('wallet') },
    { label: 'Requests', sub: 'Permanent visits', icon: ClipboardList, tone: 'bg-amber-500/15 text-amber-600', onClick: () => onGoToTab('requests') },
    { label: 'Alerts', sub: alertCount > 0 ? `${alertCount} waiting` : 'Updates here', icon: Bell, tone: 'bg-rose-500/15 text-rose-600', badge: alertCount, onClick: () => onGoToTab('notifications') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Hero — the visual anchor, distinct from the public Home */}
      <div className="relative overflow-hidden bg-slate-950 rounded-b-[2.5rem] px-5 pt-7 pb-10 text-white">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-teal-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute top-10 right-8 w-3 h-3 rounded-full bg-teal-400/70 animate-ping" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-400">
              servego24
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight leading-tight">
              Hi {firstName} 👋
            </h1>
            <p className="mt-1 text-xs text-slate-400 font-medium">
              What shall we fix, clean or install for you today?
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[10px] font-bold text-slate-200">
              <MapPin className="w-3 h-3 text-teal-400" />
              {areaLabel}
            </div>
          </div>
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={`${currentUser.name} avatar`}
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-teal-400/40 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center font-black text-base ring-2 ring-white/10 shrink-0">
              {firstName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Trust strip removed — decoupled Explore Services to its own card below. */}
      </div>

      {/* Explore Services — its own card, not part of the hero banner */}
      <section aria-label="Explore services" className="px-4 -mt-6 relative z-20">
        <button
          type="button"
          onClick={() => onNavigate('services')}
          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-black text-sm rounded-2xl py-4 px-5 flex items-center justify-between shadow-[0_18px_40px_-16px_rgba(13,148,136,0.55)] transition-all active:scale-[0.98] border border-teal-400/40"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
            Explore Services
          </span>
          <span className="text-[10px] font-bold text-teal-900 bg-white/90 rounded-full px-2.5 py-1">BOOK NOW</span>
        </button>
      </section>

      {/* Quick action tiles */}
      <section aria-label="Quick actions" className="px-4 mt-4 relative z-20">
        <div className="grid grid-cols-2 gap-3">
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
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t.sub}</p>
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

      {/* Popular services */}
      <section aria-label="Popular services" className="px-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Popular right now</h2>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="flex items-center gap-0.5 text-[11px] font-bold text-teal-600 hover:text-teal-700"
          >
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {popularServices.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goBook(s.id)}
                className="group bg-white border border-slate-200 rounded-2xl px-4 py-4 flex items-center gap-3 text-left transition-all hover:border-teal-300 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.4)] active:scale-[0.98]"
              >
                {s.image ? (
                  <span className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0">
                    <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center border ${s.tone}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-black text-slate-900 truncate">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Book now <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Help / support card */}
      <section aria-label="Need help" className="px-4 mt-8 pb-2">
        <button
          type="button"
          onClick={() => onGoToTab('tickets')}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl px-5 py-5 flex items-center justify-between text-left transition-all active:scale-[0.98]"
        >
          <div>
            <p className="text-sm font-black">Need a hand?</p>
            <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
              Raise a help ticket — a servego24 agent will follow up.
            </p>
          </div>
          <ArrowRight className="w-4.5 h-4.5 text-teal-400 shrink-0" />
        </button>
      </section>
    </div>
  );
};

export default CustomerHome;
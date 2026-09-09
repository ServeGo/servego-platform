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
    <div className="min-h-screen bg-[#f8fbfc] pb-24 text-[#112344]">
      {/* Mobile customer hero follows the product reference: editorial copy on the
          left, with the family visual anchored into the lower-right corner. */}
      <div className="relative min-h-[408px] overflow-hidden bg-[#e9fbfb] px-5 pt-8 pb-5 sm:min-h-[420px] sm:px-8 lg:min-h-[450px] lg:px-10">
        <div
          className="absolute bottom-5 right-0 top-0 w-full bg-[url('/images/family.png')] bg-cover bg-center bg-no-repeat lg:bg-[length:62%_auto] lg:bg-right-bottom"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(245,255,255,.98)_0%,rgba(245,255,255,.92)_28%,rgba(245,255,255,.3)_58%,rgba(245,255,255,0)_82%)]" />

        <div className="relative z-10 flex min-h-[375px] w-[62%] flex-col sm:min-h-[387px] sm:w-[54%] lg:min-h-[417px] lg:w-[50%]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#079c9a] sm:text-xs">servego24</p>
          <h1 className="mt-4 text-[1.85rem] font-black leading-[1.08] tracking-[-0.045em] text-[#102244] sm:text-[2.25rem] lg:text-[2.65rem]">
            Your Home.<br />
            Our Experts.<br />
            <span className="text-[#00a99f]">One Simple Booking.</span>
          </h1>
          <p className="mt-3 max-w-[19rem] text-xs font-medium leading-[1.55] text-[#526680] sm:max-w-[23rem] sm:text-[13px] lg:max-w-[29rem] lg:text-[15px]">
            Choose a service, share your location,<br />
            and connect with a verified local expert.<br />
            Fast response, transparent service,<br />
            live updates, and support from<br />
            booking to completion.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-extrabold text-[#1a2b47] shadow-sm ring-1 ring-white/70"
          >
            <MapPin className="h-4 w-4 text-[#009c98]" />
            Hyderabad
            <ChevronRight className="h-4 w-4 text-[#009c98]" />
          </button>
        </div>
      </div>

      {/* Explore Services — its own card, not part of the hero banner */}
      <section aria-label="Explore services" className="relative z-20 -mt-8 px-4">
        <button
          type="button"
          onClick={() => onNavigate('services')}
          className="flex w-full items-center justify-between rounded-[1.8rem] border border-[#36c8c0]/50 bg-gradient-to-r from-[#10afa6] to-[#078d89] px-5 py-5 text-white shadow-[0_18px_35px_-16px_rgba(13,148,136,.7)] transition-all active:scale-[.98]"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-lg font-black">Explore Services</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[11px] font-black text-[#146b6b]">
            <span>BOOK NOW</span>
            <span className="rounded-full bg-[#dffaf8] px-2 py-1 text-[10px] font-extrabold text-[#0b8a87]">₹199</span>
          </span>
        </button>
      </section>

      {/* Quick action tiles */}
      <section aria-label="Quick actions" className="relative z-20 mt-5 px-4">
        <div className="grid grid-cols-2 gap-4">
          {quickTiles.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                type="button"
                onClick={t.onClick}
                className="relative flex h-[174px] flex-col justify-between rounded-[1.7rem] border border-[#e5ebf0] bg-white p-6 text-left shadow-[0_18px_35px_-24px_rgba(15,23,42,.4)] transition-all active:scale-[.98]"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${t.tone}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-base font-black text-[#13233f]">{t.label}</p>
                  <p className="mt-1 text-xs font-medium text-[#8ca0ba]">{t.sub}</p>
                </div>
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
      <section aria-label="Popular services" className="mt-8 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-[#13233f]">Popular right now</h2>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="flex items-center gap-0.5 text-sm font-bold text-[#05a79e] hover:text-teal-700"
          >
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {popularServices.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goBook(s.id)}
                className="group flex h-[114px] items-center gap-4 rounded-[1.5rem] border border-[#e5ebf0] bg-white px-6 text-left transition-all hover:border-teal-300 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,.4)] active:scale-[.98]"
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${s.tone}`}>
                  <Icon className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black text-[#13233f]">{s.name}</span>
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-teal-600">
                      Book now <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#e8fbf8] px-1.5 py-0.5 text-[9px] font-black text-[#0a8d88]">
                      ₹199
                    </span>
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
import React, { useState } from 'react';
import {
  Home,
  CalendarCheck,
  Bell,
  MoreHorizontal,
  User,
  Wallet,
  ClipboardList,
  Headphones,
  X,
  LogOut,
} from 'lucide-react';

const MORE_TABS = ['profile', 'wallet', 'requests', 'tickets'];

/**
 * Sticky bottom navigation for the Customer role on mobile (native-app feel).
 * Hidden from tablet/desktop (md+) where the top Navbar handles navigation.
 *
 * Primary items: Home, Bookings, Alerts (badged).
 * "More" opens a bottom sheet for Profile, Wallet, Requests, Tickets.
 */
export default function CustomerBottomNav({
  currentPage,
  activeTab,
  onNavigate,
  setCustomerActiveTab,
  alertsCount = 0,
  onLogout,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutHovered, setLogoutHovered] = useState(false);
  const onDashboard = currentPage === 'dashboard-customer';

  const goToTab = (tab) => {
    setMoreOpen(false);
    setCustomerActiveTab?.(tab);
    if (!onDashboard) {
      onNavigate('dashboard-customer');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const items = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      isActive: currentPage === 'customer-home',
      onClick: () => onNavigate('customer-home'),
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: CalendarCheck,
      isActive: onDashboard && activeTab === 'bookings',
      onClick: () => goToTab('bookings'),
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      isActive: onDashboard && activeTab === 'notifications',
      badge: alertsCount,
      onClick: () => goToTab('notifications'),
    },
  ];

  const moreItems = [
    { id: 'profile', label: 'Profile', icon: User, iconTone: 'bg-sky-100 text-sky-500', onClick: () => goToTab('profile') },
    { id: 'wallet', label: 'Wallet', icon: Wallet, iconTone: 'bg-violet-100 text-violet-500', onClick: () => goToTab('wallet') },
    { id: 'requests', label: 'Requests', icon: ClipboardList, iconTone: 'bg-orange-100 text-orange-500', onClick: () => goToTab('requests') },
    { id: 'tickets', label: 'Help Tickets', icon: Headphones, iconTone: 'bg-teal-100 text-teal-500', onClick: () => goToTab('tickets') },
  ];

  const moreActive = moreOpen || (onDashboard && MORE_TABS.includes(activeTab));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="grid min-h-[68px] grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                aria-current={item.isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
                  item.isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={item.isActive ? 2.5 : 2} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="uppercase tracking-wide">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-current={moreActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
              moreActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="uppercase tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-950/20"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="More customer options"
            className="md:hidden fixed bottom-[68px] inset-x-0 z-50 bg-white rounded-t-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.14)]"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-black uppercase tracking-wide text-slate-700">
                More
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 px-4 pb-3 pt-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = onDashboard && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`relative flex min-h-[112px] flex-col items-start justify-center gap-1.5 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconTone}`}>
                      <Icon className="h-5 w-5 shrink-0" />
                    </span>
                    <span className="text-sm font-black">{item.label}</span>
                    <span className="max-w-[8rem] text-[11px] font-medium leading-3.5 text-slate-400">
                      {item.id === 'profile' && 'View and edit your profile details'}
                      {item.id === 'wallet' && 'Check balance and view fees'}
                      {item.id === 'requests' && 'Manage your permanent visits'}
                      {item.id === 'tickets' && 'Get support and track your tickets'}
                    </span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl font-light text-slate-400">›</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onLogout}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              className={`mx-4 mb-3 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full py-3 text-sm font-black transition-colors ${
                logoutHovered
                  ? 'bg-white text-red-500 shadow-sm ring-1 ring-red-200'
                  : 'bg-red-50 text-red-500'
              } active:bg-red-600 active:text-white`}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </>
      )}
    </>
  );
}
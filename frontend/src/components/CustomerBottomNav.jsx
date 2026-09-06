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
}) {
  const [moreOpen, setMoreOpen] = useState(false);
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
    { id: 'profile', label: 'Profile', icon: User, onClick: () => goToTab('profile') },
    { id: 'wallet', label: 'Wallet', icon: Wallet, onClick: () => goToTab('wallet') },
    { id: 'requests', label: 'Requests', icon: ClipboardList, onClick: () => goToTab('requests') },
    { id: 'tickets', label: 'Help Tickets', icon: Headphones, onClick: () => goToTab('tickets') },
  ];

  const moreActive = moreOpen || (onDashboard && MORE_TABS.includes(activeTab));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="grid grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                aria-current={item.isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  item.isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={item.isActive ? 2.5 : 2} />
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
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
              moreActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="uppercase tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-950/40"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="More customer options"
            className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 rounded-t-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.18)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                More
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-6 pt-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = onDashboard && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
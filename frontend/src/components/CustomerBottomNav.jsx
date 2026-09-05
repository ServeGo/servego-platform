import React from 'react';
import { Home, CalendarCheck, Bell, User } from 'lucide-react';

/**
 * Sticky bottom navigation for the Customer role on mobile (native-app feel).
 * Hidden from tablet/desktop (md+) where the top Navbar handles navigation.
 *
 * Items: Home (opens Services), Bookings, Notifications, Profile.
 * Bookings / Notifications / Profile deep-link into the customer dashboard tabs.
 */
export default function CustomerBottomNav({
  currentPage,
  activeTab,
  onNavigate,
  setCustomerActiveTab,
  notificationsCount = 0,
}) {
  const onDashboard = currentPage === 'dashboard-customer';

  const goToTab = (tab) => {
    setCustomerActiveTab?.(tab);
    onNavigate('dashboard-customer');
  };

  const items = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      isActive: currentPage === 'services' || currentPage === 'service-details',
      onClick: () => onNavigate('services'),
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
      onClick: () => goToTab('notifications'),
      badge: notificationsCount,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      isActive: onDashboard && activeTab === 'profile',
      onClick: () => goToTab('profile'),
    },
  ];

  return (
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
      </div>
    </nav>
  );
}

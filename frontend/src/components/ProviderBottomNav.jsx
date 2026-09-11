import React, { useState } from 'react';
import {
  Home,
  Inbox,
  Wrench,
  Wallet,
  MoreHorizontal,
  Star,
  BarChart3,
  Headphones,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MORE_TABS = ['reviews', 'analytics', 'wallet', 'support'];

/**
 * Sticky bottom navigation for the Provider role on mobile (native-app feel).
 * Hidden from tablet/desktop (md+) where the top Navbar handles navigation.
 *
 * Primary items: Home, Leads (badged), Services.
 * "More" opens a bottom sheet for Wallet, Reviews, Level, Support.
 */
export default function ProviderBottomNav({
  currentPage,
  activeTab,
  setProviderActiveTab,
  onNavigate,
  leadsCount = 0,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useAuth();
  const onDashboard = currentPage === 'dashboard-provider';

  const goToTab = (tab) => {
    setMoreOpen(false);
    setProviderActiveTab?.(tab);
    if (!onDashboard) {
      onNavigate('dashboard-provider');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    setMoreOpen(false);
    logout();
    onNavigate('login');
  };

  const items = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      isActive: currentPage === 'provider-home',
      onClick: () => onNavigate('provider-home'),
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: Inbox,
      isActive: onDashboard && activeTab === 'leads',
      badge: leadsCount,
      onClick: () => goToTab('leads'),
    },
    {
      id: 'services',
      label: 'Services',
      icon: Wrench,
      isActive: onDashboard && activeTab === 'services',
      onClick: () => goToTab('services'),
    },
  ];

  const moreItems = [
    { id: 'wallet', label: 'Wallet', sub: 'Balance & transactions', icon: Wallet, tone: 'bg-teal-50 text-teal-600', onClick: () => goToTab('wallet') },
    { id: 'reviews', label: 'Reviews', sub: 'Ratings from customers', icon: Star, tone: 'bg-amber-50 text-amber-600', onClick: () => goToTab('reviews') },
    { id: 'analytics', label: 'Analytics', sub: 'Earnings & performance', icon: BarChart3, tone: 'bg-indigo-50 text-indigo-600', onClick: () => goToTab('analytics') },
    { id: 'support', label: 'Support', sub: 'Help & assistance', icon: Headphones, tone: 'bg-rose-50 text-rose-600', onClick: () => goToTab('support') },
  ];

  const moreActive = moreOpen || (onDashboard && MORE_TABS.includes(activeTab));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Provider primary"
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
            aria-label="More provider options"
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
            <div className="px-4 pb-6 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = onDashboard && activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.tone}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="block mt-1.5 text-xs font-extrabold text-slate-900 truncate">{item.label}</span>
                      <span className="block mt-0.5 text-[9px] font-medium text-slate-400 leading-snug truncate">{item.sub}</span>
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-slate-100 my-3" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-600 transition-colors hover:bg-rose-100"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

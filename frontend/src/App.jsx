import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppProvider, useAuth, useData, useUI, useRealtime } from './context/AppContext';
import { api as apiClient } from './utils/apiClient';
import './cursor.css';

// Pages are lazy-loaded so each becomes its own chunk, pulled in only when the
// user actually opens it (same pattern as AdminPanelTabsRouter).
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const CustomerHome = lazy(() => import('./pages/CustomerHome').then((m) => ({ default: m.CustomerHome })));
const ProviderHome = lazy(() => import('./pages/ProviderHome').then((m) => ({ default: m.ProviderHome })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const Services = lazy(() => import('./pages/Services').then((m) => ({ default: m.Services })));
const Contact = lazy(() => import('./pages/Contact').then((m) => ({ default: m.Contact })));
const FAQ = lazy(() => import('./pages/FAQ').then((m) => ({ default: m.FAQ })));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard').then((m) => ({ default: m.ProviderDashboard })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Logo from './components/Logo';
import CustomerBottomNav from './components/CustomerBottomNav';
import ProviderBottomNav from './components/ProviderBottomNav';
import ActionSpinnerOverlay from './components/ActionSpinnerOverlay';


import {
  LayoutDashboard,
  History,
  Settings,
  Star,
  BarChart3,
  FileText,
  MessageSquare,
  Users,
  Activity,
  LogOut,
  Briefcase,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  Wrench,
  Flag,
  X,
  MoreHorizontal,
} from 'lucide-react';


const RESTRICTED_ROUTES = ['dashboard-customer', 'dashboard-provider', 'admin', 'customer-home', 'provider-home'];

const getAdminTabFromRoute = (routeValue) => {
  const tab = routeValue || 'dashboard';
  if (tab === 'dashboard') return 'dashboard';
  if (tab === 'customers') return 'customers';
  if (tab === 'providers') return 'providers';
  if (tab === 'service-requests' || tab === 'providerServiceRequests') return 'providerServiceRequests';
  if (tab === 'permanent-service-requests' || tab === 'permanentServiceRequests') return 'permanentServiceRequests';
  if (tab === 'services') return 'services';
  if (tab === 'bookings') return 'bookings';
  if (tab === 'reviews') return 'reviews';
  if (tab === 'tickets') return 'tickets';
  if (tab === 'analytics') return 'analytics';
  if (tab === 'reports') return 'reports';
  if (tab === 'settings') return 'settings';
  if (tab === 'servego') return 'servego';
  return 'dashboard';
};

const getRoutePath = (page, tab = null) => {
  switch (page) {
    case 'home':
      return '/';
    case 'customer-home':
      return '/customer-home';
    case 'provider-home':
      return '/provider-home';
    case 'about':
      return '/about';
    case 'services':
      return '/services';
    case 'contact':
      return '/contact';
    case 'faq':
      return '/faq';
    case 'login':
      return '/login';
    case 'signup':
      return '/signup';
    case 'forgot-password':
      return '/forgot-password';
    case 'reset-password':
      return '/reset-password';
    case 'dashboard-customer':
      return '/dashboard-customer';
    case 'dashboard-provider':
      return '/dashboard-provider';
    case 'admin':
      return tab && tab !== 'dashboard' ? `/admin/${tab}` : '/admin/dashboard';
    default:
      return '/';
  }
};

const updateBrowserRoute = (page, tab = null) => {
  const nextPath = getRoutePath(page, tab);
  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, '', nextPath);
  }
};

export function MainLayout() {
  const { currentUser, logout, isInitializing } = useAuth();
  const { bookings, alerts } = useData();
  const { actionSpinner } = useUI();
  const { connectionStatus } = useRealtime();

  // Active jobs for this provider — mirrors the dashboard's "Leads" tab count.
  const providerLeadsCount = (bookings || []).filter(
    (b) =>
      b.providerId === currentUser?.providerId &&
      ['pending', 'confirmed', 'ongoing'].includes(b.status)
  ).length;

  // Unreviewed alerts (every existing alert row is action-required and
  // unreviewed by construction).
  const unreadAlerts = (alerts || []).filter(
    (a) => a.userId === currentUser?.id
  ).length;

  const [currentPage, setCurrentPage] = useState('home');

  const [customerActiveTabExternal, setCustomerActiveTabExternal] = useState('bookings');
  const [providerActiveTabExternal, setProviderActiveTabExternal] = useState('leads');
  const [adminActiveTabExternal, setAdminActiveTabExternal] = useState('dashboard');
  const [adminMoreOpen, setAdminMoreOpen] = useState(false);

  // Admin mobile "More" sheet: close on Escape.
  useEffect(() => {
    if (!adminMoreOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setAdminMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adminMoreOpen]);

  // Public feature flags: maintenance mode + the single "what's new" announcement
  // (targeted to one audience — customers OR providers — at a time).
  const [siteFlags, setSiteFlags] = useState({
    maintenance: false,
    newFeature: { enabled: false, audience: 'customer', text: '' }
  });
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .get('/feature-flags/public')
      .then((res) => {
        if (!active) return;
        const data = res.data?.data || {};
        const flags = data.flags || {};
        setSiteFlags({
          maintenance: data.maintenanceMode === true,
          newFeature: {
            enabled: flags.newFeatureEnabled === true,
            audience: flags.newFeatureAudience || 'customer',
            text: flags.newFeatureText || ''
          }
        });
      })
      .catch(() => { /* fail open — no flags means normal operation */ });
    return () => { active = false; };
  }, []);

  const getDefaultDashboardForRole = (user) => {
    if (!user) return 'login';
    if (user.role === 'admin') return 'admin';
    if (user.role === 'provider') return 'provider-home';
    return 'dashboard-customer';
  };
  const isAllowedForCurrentUser = (page, user) => {
    if (!RESTRICTED_ROUTES.includes(page)) return true;
    if (!user) return false;
    if (page === 'dashboard-customer') return user.role === 'customer';
    if (page === 'customer-home') return user.role === 'customer';
    if (page === 'dashboard-provider') return user.role === 'provider';
    if (page === 'provider-home') return user.role === 'provider';
    if (page === 'admin') return user.role === 'admin';
    return false;
  };

  useEffect(() => {
    const handleRouteChange = () => {
      const rawPath = window.location.pathname || '/';
      const path = rawPath.split('?')[0].replace(/^\/+|\/+$/g, '');
      const segments = path ? path.split('/') : [];

      if (!segments.length) {
        setCurrentPage('home');
        return;
      }

      if (segments[0] === 'admin') {
        setCurrentPage('admin');
        setAdminActiveTabExternal(getAdminTabFromRoute(segments[1] || 'dashboard'));
        return;
      }

      const nextPage = segments[0];
      setCurrentPage(nextPage);
    };

    const publicPages = ['forgot-password', 'reset-password'];
    const currentPath = (window.location.pathname || '/').split('?')[0].replace(/^\/+|\/+$/g, '');
    const currentSegment = currentPath ? currentPath.split('/')[0] : '';
    if (!currentUser && !publicPages.includes(currentSegment)) {
      window.history.replaceState({}, '', '/');
      setCurrentPage('home');
    }

    window.addEventListener('popstate', handleRouteChange);
    handleRouteChange();
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [currentUser]);


  // Ensure we don't render anything based on a previous restricted hash.
  // (hash parsing remains supported after login via hashchange listener)


  useEffect(() => {
    if (!currentUser && RESTRICTED_ROUTES.includes(currentPage)) {
      setCurrentPage('login');
      updateBrowserRoute('login');
      return;
    }

    if (currentUser && !isAllowedForCurrentUser(currentPage, currentUser)) {
      const redirectPage = getDefaultDashboardForRole(currentUser);
      setCurrentPage(redirectPage);
      updateBrowserRoute(redirectPage);
      return;
    }

    if (currentUser && currentPage === 'login') {
      const redirectPage = getDefaultDashboardForRole(currentUser);
      setCurrentPage(redirectPage);
      updateBrowserRoute(redirectPage);
    }
  }, [currentUser, currentPage]);

  const handlePageTransition = (page) => {
    if (RESTRICTED_ROUTES.includes(page) && !currentUser) {
      setCurrentPage('login');
      updateBrowserRoute('login');
      window.scrollTo(0, 0);
      return;
    }

    if (RESTRICTED_ROUTES.includes(page) && currentUser && !isAllowedForCurrentUser(page, currentUser)) {
      const redirectPage = getDefaultDashboardForRole(currentUser);
      setCurrentPage(redirectPage);
      updateBrowserRoute(redirectPage);
      window.scrollTo(0, 0);
      return;
    }

    if (page === 'admin') {
      updateBrowserRoute('admin', null, adminActiveTabExternal);
    } else {
      updateBrowserRoute(page);
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleSignOutAction = () => {
    logout();
    handlePageTransition('login');
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center gap-6">
        <style>{`
          @keyframes logoPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(20,184,166,0.30); }
            50% { box-shadow: 0 0 0 16px rgba(20,184,166,0); }
          }
        `}</style>

        {/* Logo with soft pulse */}
        <div
          className="relative w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-slate-200"
          style={{ animation: 'logoPulse 1.8s ease-out infinite' }}
        >
          <Logo className="w-16 h-16 rounded-none" />
        </div>

        {/* Clean spinner ring */}
        <div className="w-8 h-8 rounded-full border-t-4 border-indigo-600 animate-spin" />

        {/* Brand text */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-slate-900 font-extrabold text-xl tracking-tight">servego24</span>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400">Loading…</span>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!isAllowedForCurrentUser(currentPage, currentUser)) {
      return <Login onNavigate={handlePageTransition} />;
    }

    let content;
    switch (currentPage) {
      case 'home':
        content = <Home onNavigate={handlePageTransition} />;
        break;
      case 'customer-home':
        content = <CustomerHome onNavigate={handlePageTransition} onGoToTab={(tab) => { setCustomerActiveTabExternal(tab); handlePageTransition('dashboard-customer'); }} />;
        break;
      case 'provider-home':
        content = <ProviderHome onGoToTab={(tab) => { setProviderActiveTabExternal(tab); handlePageTransition('dashboard-provider'); }} />;
        break;
      case 'about':
        content = <About />;
        break;
      case 'services':
        content = <Services onNavigate={handlePageTransition} />;
        break;
      case 'contact':
        content = <Contact />;
        break;
      case 'faq':
        content = <FAQ />;
        break;
      case 'login':
        content = <Login onNavigate={handlePageTransition} />;
        break;
      case 'signup':
        content = <Signup onNavigate={handlePageTransition} />;
        break;
      case 'forgot-password':
        content = <ForgotPassword onNavigate={handlePageTransition} />;
        break;
      case 'reset-password':
        content = <ResetPassword onNavigate={handlePageTransition} />;
        break;
      case 'dashboard-customer':
        content = (
          <CustomerDashboard
            onNavigate={handlePageTransition}
            activeTab={customerActiveTabExternal}
            setActiveTabExternal={setCustomerActiveTabExternal}
          />
        );
        break;
      case 'dashboard-provider':
        content = (
          <ProviderDashboard
            activeTab={providerActiveTabExternal}
            setActiveTabExternal={setProviderActiveTabExternal}
          />
        );
        break;
      case 'admin':
        content = (
          <AdminPanel
            activeTab={adminActiveTabExternal}
            setActiveTabExternal={setAdminActiveTabExternal}
          />
        );
        break;
      default:
        content = <Home onNavigate={handlePageTransition} />;
        break;
    }

    return <Suspense fallback={<PageFallback />}>{content}</Suspense>;
  };

  // Admin layout has a sidebar, others don't
  if (currentUser?.role === 'admin' && currentPage === 'admin') {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar
          onNavigate={handlePageTransition}
          currentPage={currentPage}
          adminActiveTab={adminActiveTabExternal}
          setAdminActiveTab={setAdminActiveTabExternal}
        />

        <div className="flex-1 flex flex-col md:flex-row">
          <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 text-slate-300 py-3 md:py-6 px-3 md:px-4 flex flex-col md:justify-between shrink-0 gap-4 md:gap-0 md:space-y-6 md:min-h-0">
            <div className="hidden md:block space-y-1.5">
              <span className="hidden md:block text-[9px] uppercase font-bold text-slate-500 tracking-wider px-2 mb-2">
                Operations ledger
              </span>
              <button
                onClick={() => {
                  setAdminActiveTabExternal('dashboard');
                  updateBrowserRoute('admin', null, 'dashboard');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'dashboard'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('customers');
                  updateBrowserRoute('admin', null, 'customers');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'customers'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <Users className="w-4 h-4 shrink-0" />
                <span>Customers</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('providers');
                  updateBrowserRoute('admin', null, 'providers');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'providers'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <Briefcase className="w-4 h-4 shrink-0" />
                <span>Providers</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('services');
                  updateBrowserRoute('admin', null, 'services');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'services'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <Activity className="w-4 h-4 shrink-0" />
                <span>Services</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('providerServiceRequests');
                  updateBrowserRoute('admin', null, 'providerServiceRequests');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'providerServiceRequests'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Service Requests</span>
              </button>


              <button
                onClick={() => {
                  setAdminActiveTabExternal('permanentServiceRequests');
                  updateBrowserRoute('admin', null, 'permanentServiceRequests');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'permanentServiceRequests'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Permanent &amp; Custom</span>
              </button>


              <button
                onClick={() => {
                  setAdminActiveTabExternal('bookings');
                  updateBrowserRoute('admin', null, 'bookings');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'bookings'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <History className="w-4 h-4 shrink-0" />
                <span>Bookings</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('reviews');
                  updateBrowserRoute('admin', null, 'reviews');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'reviews'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <Star className="w-4 h-4 shrink-0" />
                <span>Reviews</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('tickets');
                  updateBrowserRoute('admin', null, 'tickets');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'tickets'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Support Tickets</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('analytics');
                  updateBrowserRoute('admin', null, 'analytics');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'analytics'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('servego');
                  updateBrowserRoute('admin', null, 'servego');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'servego'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>servego24 Business</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('reports');
                  updateBrowserRoute('admin', null, 'reports');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'reports'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <FileText className="w-4 h-4 shrink-0" />
                <span>Reports</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('settings');
                  updateBrowserRoute('admin', null, 'settings');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'settings'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >

                <Settings className="w-4 h-4 shrink-0" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setAdminActiveTabExternal('featureFlags');
                  updateBrowserRoute('admin', null, 'featureFlags');
                }}
                className={`shrink-0 md:w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center gap-2.5 transition-all text-left whitespace-nowrap ${
                  adminActiveTabExternal === 'featureFlags'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'hover:bg-white/5 text-slate-305'
                }`}
              >
                <Flag className="w-4 h-4 shrink-0" />
                <span>Feature Flags</span>
              </button>
            </div>

            <button
              onClick={handleSignOutAction}
              className="hidden md:flex w-full py-2.5 px-3 rounded-xl text-xs font-bold hover:bg-rose-950 text-rose-500 bg-rose-500/5 transition-all items-center gap-2"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Logout Admin Console</span>
            </button>
          </aside>

          <main className="flex-grow min-w-0 pb-24 md:pb-0">{renderContent()}</main>

          <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Admin navigation"
          >
            <div className="grid grid-cols-5">
              {[
                { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
                { key: 'services', label: 'Services', icon: Activity },
                { key: 'providerServiceRequests', label: 'Requests', icon: ShieldCheck },
                { key: 'bookings', label: 'Bookings', icon: History },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = adminActiveTabExternal === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setAdminMoreOpen(false);
                      setAdminActiveTabExternal(item.key);
                      updateBrowserRoute('admin', null, item.key);
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                      isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="uppercase tracking-wide">{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setAdminMoreOpen((v) => !v)}
                aria-expanded={adminMoreOpen}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                  adminMoreOpen ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="uppercase tracking-wide">More</span>
              </button>
            </div>
          </nav>

          {adminMoreOpen && (
            <>
              <div
                className="md:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
                onClick={() => setAdminMoreOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="More admin sections"
                className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 rounded-t-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.18)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    More
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdminMoreOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 pb-6 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'customers', label: 'Customers', sub: 'Customer accounts', icon: Users, tone: 'bg-indigo-50 text-indigo-600' },
                    { key: 'providers', label: 'Providers', sub: 'Partner accounts', icon: Briefcase, tone: 'bg-teal-50 text-teal-600' },
                    { key: 'permanentServiceRequests', label: 'Permanent Hires', sub: 'Service requests', icon: ClipboardList, tone: 'bg-amber-50 text-amber-600' },
                    { key: 'tickets', label: 'Tickets', sub: 'Customer support', icon: MessageSquare, tone: 'bg-rose-50 text-rose-600' },
                    { key: 'servego', label: 'servego24', sub: 'Platform overview', icon: Sparkles, tone: 'bg-violet-50 text-violet-600' },
                    { key: 'analytics', label: 'Analytics', sub: 'Performance data', icon: BarChart3, tone: 'bg-sky-50 text-sky-600' },
                    { key: 'reports', label: 'Reports', sub: 'Business reports', icon: FileText, tone: 'bg-orange-50 text-orange-600' },
                    { key: 'settings', label: 'Settings', sub: 'Console settings', icon: Settings, tone: 'bg-slate-100 text-slate-600' },
                    { key: 'featureFlags', label: 'Feature Flags', sub: 'Release controls', icon: Flag, tone: 'bg-pink-50 text-pink-600' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = adminActiveTabExternal === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setAdminMoreOpen(false);
                          setAdminActiveTabExternal(item.key);
                          updateBrowserRoute('admin', null, item.key);
                        }}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-teal-50 border-teal-200'
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Maintenance mode: the public API 503s, so non-admins see a maintenance
  // screen instead of a broken app. Admins stay in so they can turn it off.
  if (siteFlags.maintenance && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center mb-5">
          <Wrench className="w-7 h-7 text-teal-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Under Maintenance</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-sm">
          servego24 is undergoing scheduled maintenance. We will be back shortly — please check again in a few minutes.
        </p>
        {currentUser && (
          <button
            onClick={handleSignOutAction}
            className="mt-6 px-4 py-2 rounded-xl text-xs font-black bg-white/10 text-white hover:bg-white/20"
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <ActionSpinnerOverlay isOpen={!!actionSpinner?.isOpen} message={actionSpinner?.message} />

      {currentUser && connectionStatus !== 'online' && (
        <div
          role="status"
          className="bg-amber-500/90 text-white text-center text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-2"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span>
            {connectionStatus === 'offline'
              ? 'Connection lost. You may be seeing outdated info — retrying in the background.'
              : 'Reconnecting to live updates…'}
          </span>
        </div>
      )}

      {currentUser &&
        siteFlags.newFeature.enabled &&
        siteFlags.newFeature.text &&
        currentUser.role === siteFlags.newFeature.audience &&
        !dismissedAnnouncement && (
          <div className={`text-white text-center text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 ${siteFlags.newFeature.audience === 'provider' ? 'bg-indigo-600' : 'bg-teal-600'}`}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{siteFlags.newFeature.text}</span>
            <button
              onClick={() => setDismissedAnnouncement(true)}
              className="ml-2 font-black hover:underline"
              aria-label="Dismiss announcement"
            >
              Dismiss
            </button>
          </div>
        )}

      <Navbar

        onNavigate={handlePageTransition}
        currentPage={currentPage}
        customerActiveTab={customerActiveTabExternal}
        setCustomerActiveTab={setCustomerActiveTabExternal}
        providerActiveTab={providerActiveTabExternal}
        setProviderActiveTab={setProviderActiveTabExternal}
      />

      <main className="flex-1">{renderContent()}</main>

      {/* Footer for public pages, customer pages, and provider pages */}
      {currentPage !== 'login' && currentPage !== 'signup' && (!currentUser || currentUser.role === 'customer' || (currentUser.role === 'provider' && (currentPage === 'provider-home' || currentPage === 'dashboard-provider'))) && (
        <div className={currentUser?.role === 'customer' || currentUser?.role === 'provider' ? 'pb-16 md:pb-0' : ''}>
          <Footer onNavigate={handlePageTransition} />
        </div>
      )}

      {/* Mobile sticky bottom navigation for the customer role (native-app feel) */}
      {currentUser?.role === 'customer' && (
        <CustomerBottomNav
          currentPage={currentPage}
          activeTab={customerActiveTabExternal}
          onNavigate={handlePageTransition}
          setCustomerActiveTab={setCustomerActiveTabExternal}
          alertsCount={unreadAlerts}
        />
      )}

      {/* Mobile sticky bottom navigation for the provider role (native-app feel) */}
      {currentUser?.role === 'provider' && (
        <ProviderBottomNav
          currentPage={currentPage}
          activeTab={providerActiveTabExternal}
          setProviderActiveTab={setProviderActiveTabExternal}
          onNavigate={handlePageTransition}
          leadsCount={providerLeadsCount}
        />
      )}
    </div>
  );
}

// Shown while a lazy-loaded page chunk loads (keeps rule 15: no blank screens).
function PageFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3" role="status">
      <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-teal-600 animate-spin" />
      <span className="text-xs text-slate-400 font-semibold">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}


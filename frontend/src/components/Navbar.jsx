import React, { useEffect, useRef, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';
import Logo from './Logo';
import { Menu, X, Bell, User, ChevronDown, LogOut } from 'lucide-react';

export default function Navbar({
  onNavigate,
  currentPage,
  customerActiveTab,
  setCustomerActiveTab,
  providerActiveTab,
  setProviderActiveTab,
  adminActiveTab,
  setAdminActiveTab,
}) {
  const { currentUser, logout } = useAuth();
  const { notifications, markNotificationAsRead, clearNotifications } = useData();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (userDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [userDropdownOpen, notifDropdownOpen]);

  const unreadNotifications = (notifications || []).filter(
    (n) => !n.read && (n.userId === currentUser?.id || n.role === currentUser?.role)
  );

  const handleSignOutAction = () => {
    setUserDropdownOpen(false);
    logout();
    onNavigate('login');
  };

  const handleLinkClick = (page, categoryId = null) => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    onNavigate(page, categoryId);
  };

  const setAdminHashAndTab = (tabKey) => {
    setAdminActiveTab(tabKey);
    const path = tabKey === 'dashboard' ? '/admin/dashboard' : `/admin/${tabKey}`;
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  // ----------------------------------------------------
  // ADMIN HEADER (only admin)
  // ----------------------------------------------------
  if (currentUser?.role === 'admin') {
    return (
      <header
        id="admin-navbar-comp"
        className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white"
      >
        {/* top row */}
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => handleLinkClick('admin')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
              A⚙
            </div>
            <span className="font-extrabold text-white text-base tracking-tight">Admin System</span>
          </div>

          {/* desktop tabs */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-350">
            <button
              onClick={() => setAdminHashAndTab('dashboard')}
              className={`hover:text-white cursor-pointer ${
                adminActiveTab === 'dashboard' ? 'text-teal-400 border-b-2 border-teal-400' : ''
              }`}
            >
              Control Dashboard
            </button>
            <button
              onClick={() => setAdminHashAndTab('providers')}
              className={`hover:text-white cursor-pointer ${
                adminActiveTab === 'providers' ? 'text-teal-400 border-b-2 border-teal-400' : ''
              }`}
            >
              Verify Partners
            </button>
            <button
              onClick={() => setAdminHashAndTab('bookings')}
              className={`hover:text-white cursor-pointer ${
                adminActiveTab === 'bookings' ? 'text-teal-400 border-b-2 border-teal-400' : ''
              }`}
            >
              Manage Orders
            </button>
            <button
              onClick={() => setAdminHashAndTab('tickets')}
              className={`hover:text-white cursor-pointer ${
                adminActiveTab === 'tickets' ? 'text-teal-400 border-b-2 border-teal-400' : ''
              }`}
            >
              Support Tickets
            </button>
          </nav>

          {/* mobile: only hamburger on right */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white cursor-pointer"
            aria-label="Toggle admin menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* logout stays hidden on mobile (will show inside dropdown) */}
          <div className="hidden md:flex">
            <button
              onClick={handleSignOutAction}
              className="flex items-center gap-1 bg-white/10 hover:bg-rose-500 hover:text-white text-slate-300 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout Admin</span>
            </button>
          </div>
        </div>

        {/* mobile dropdown (logout + items centered) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/95 border-t border-slate-800 px-4 pb-4">
            <div className="flex flex-col items-center text-xs font-bold uppercase tracking-wider text-slate-200">
              <button
                onClick={() => {
                  setAdminHashAndTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-3 px-1.5 text-center rounded ${
                  adminActiveTab === 'dashboard' ? 'text-teal-400' : 'hover:text-white'
                }`}
              >
                Control Dashboard
              </button>
              <button
                onClick={() => {
                  setAdminHashAndTab('providers');
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-3 px-1.5 text-center rounded ${
                  adminActiveTab === 'providers' ? 'text-teal-400' : 'hover:text-white'
                }`}
              >
                Verify Partners
              </button>
              <button
                onClick={() => {
                  setAdminHashAndTab('bookings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-3 px-1.5 text-center rounded ${
                  adminActiveTab === 'bookings' ? 'text-teal-400' : 'hover:text-white'
                }`}
              >
                Manage Orders
              </button>
              <button
                onClick={() => {
                  setAdminHashAndTab('tickets');
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-3 px-1.5 text-center rounded ${
                  adminActiveTab === 'tickets' ? 'text-teal-400' : 'hover:text-white'
                }`}
              >
                Support Tickets
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOutAction();
                }}
                className="w-full mt-2 py-3 px-1.5 text-center text-rose-400 hover:text-white rounded font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout Admin
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  // ----------------------------------------------------
  // PROVIDER HEADER
  // ----------------------------------------------------
  if (currentUser?.role === 'provider') {
    return (
      <header
        id="provider-navbar-comp"
        className="sticky top-0 z-30 bg-white border-b border-slate-200"
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => handleLinkClick('provider-home')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <Logo className="w-9 h-9 rounded-lg" />
            <span className="font-extrabold text-slate-900 text-lg tracking-tight font-sans block h-5 leading-none">
              servego24
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-extrabold uppercase tracking-wider text-slate-600">
            <button
              onClick={() => handleLinkClick('provider-home')}
              className={`hover:text-slate-900 cursor-pointer py-1 ${
                currentPage === 'provider-home' ? 'text-indigo-700 border-b-2 border-indigo-700' : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setProviderActiveTab('leads');
                handleLinkClick('dashboard-provider');
              }}
              className={`hover:text-slate-900 cursor-pointer py-1 ${
                currentPage === 'dashboard-provider' ? 'text-indigo-700 border-b-2 border-indigo-700' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setProviderActiveTab('reviews');
                handleLinkClick('dashboard-provider');
              }}
              className={`hover:text-slate-900 cursor-pointer py-1 ${
                currentPage === 'dashboard-provider' && providerActiveTab === 'reviews' ? 'text-indigo-700 border-b-2 border-indigo-700' : ''
              }`}
            >
              Reviews
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setNotifDropdownOpen((v) => !v)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 relative focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="fixed left-4 right-4 top-16 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-xs sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                    <span className="font-extrabold text-slate-950 block uppercase text-[10px] tracking-wide">
                      Notifications
                    </span>
                    <button
                      onClick={() => {
                        clearNotifications();
                        setNotifDropdownOpen(false);
                      }}
                      className="hover:underline text-[9px] text-teal-700 font-bold"
                    >
                      Clear all
                    </button>
                  </div>

                  {unreadNotifications.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-4 font-semibold">No unread alerts.</p>
                  ) : (
                    <div className="space-y-2">
                      {unreadNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifDropdownOpen(false);
                          }}
                          className="p-2 bg-slate-50 border border-slate-100 rounded cursor-pointer transition-colors"
                        >
                          <h6 className="font-bold text-slate-950 text-[10px]">{n.title}</h6>
                          <p className="text-slate-500 text-[10px] mt-0.5">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setUserDropdownOpen((v) => !v)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs focus:outline-none"
              >
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} className="w-6 h-6 rounded-lg object-cover border border-white/20 shrink-0" alt="" />
                ) : (
                  <span className="w-6 h-6 rounded-lg bg-slate-700 border border-white/20 flex items-center justify-center text-[10px] font-black shrink-0">
                    {String(currentUser?.name || 'P').substring(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[100px] truncate">{currentUser?.name.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-2 text-left">
                  <div className="pb-2 border-b border-slate-100 flex items-center gap-2">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" alt="" />
                    ) : (
                      <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-black shrink-0">
                        {String(currentUser?.name || 'P').substring(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="font-bold text-slate-950 block truncate leading-none">{currentUser?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1 truncate">
                        {currentUser?.email}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-1 font-semibold text-slate-700">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setProviderActiveTab('profile');
                      }}
                      className="w-full text-left py-1 px-1.5 hover:bg-slate-50 rounded block"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setProviderActiveTab('support');
                      }}
                      className="w-full text-left py-1 px-1.5 hover:bg-slate-50 rounded block"
                    >
                      Support Center
                    </button>
                    <button
                      onClick={handleSignOutAction}
                      className="w-full text-left py-1 px-1.5 hover:bg-rose-50 text-rose-600 rounded font-bold flex items-center gap-1.5 mt-1 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout Partner</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ----------------------------------------------------
  // CUSTOMER HEADER
  // ----------------------------------------------------
  if (currentUser?.role === 'customer') {
    return (
      <header id="customer-navbar-comp" className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => handleLinkClick('customer-home')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <Logo className="w-9 h-9 rounded-lg" />
            <span className="font-extrabold text-slate-900 text-lg tracking-tight font-sans block h-5 leading-none">
              servego24
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-extrabold text-slate-650 uppercase tracking-wider">
            <button
              onClick={() => {
                setCustomerActiveTab('bookings');
                handleLinkClick('dashboard-customer');
              }}
              className={`hover:text-teal-700 cursor-pointer py-1 ${currentPage === 'dashboard-customer' ? 'text-teal-750 border-b-2 border-teal-700' : ''}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleLinkClick('services')}
              className={`hover:text-teal-700 cursor-pointer py-1 ${currentPage === 'services' ? 'text-teal-750 border-b-2 border-teal-700' : ''}`}
            >
              Services
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setNotifDropdownOpen((v) => !v)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 relative focus:outline-none"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white leading-none">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="fixed left-4 right-4 top-16 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-xs text-slate-700 max-h-96 overflow-y-auto text-left sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3 font-semibold">
                    <span className="font-extrabold text-slate-900 block uppercase text-[10px] tracking-wide">Notifications alert</span>
                    <button onClick={() => clearNotifications()} className="hover:underline text-[9px] text-teal-700 font-bold">Clear all</button>
                  </div>

                  {unreadNotifications.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-4">No unread alerts.</p>
                  ) : (
                    <div className="space-y-2">
                      {unreadNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifDropdownOpen(false);
                          }}
                          className="p-2.5 rounded-lg bg-teal-50/40 hover:bg-teal-50 border border-teal-100/50 cursor-pointer transition-all"
                        >
                          <h6 className="font-bold text-teal-950 text-[10px]">{n.title}</h6>
                          <p className="text-slate-500 text-[10px] mt-0.5">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setUserDropdownOpen((v) => !v)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs focus:outline-none"
              >
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} className="w-6 h-6 rounded-lg object-cover border border-white/20 shrink-0" alt="" />
                ) : (
                  <span className="w-6 h-6 rounded-lg bg-slate-700 border border-white/20 flex items-center justify-center text-[10px] font-black shrink-0">
                    {String(currentUser?.name || 'C').substring(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[100px] truncate">{currentUser?.name.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 z-50 text-xs space-y-2 text-left">
                  <div className="pb-2 border-b border-slate-100 font-semibold flex items-center gap-2">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" alt="" />
                    ) : (
                      <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-black shrink-0">
                        {String(currentUser?.name || 'C').substring(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="font-extrabold text-slate-900 block truncate leading-none">{currentUser?.name}</span>
                      <span className="text-[9px] text-slate-400 font-mono block mt-1 truncate">{currentUser?.email}</span>
                    </span>
                  </div>

                  <div className="space-y-1 font-semibold text-slate-700">
                    <button onClick={() => { setUserDropdownOpen(false); handleLinkClick('services'); }} className="w-full text-left py-1 px-1.5 hover:bg-slate-50 rounded block">Services</button>
                    <button onClick={() => { setUserDropdownOpen(false); setCustomerActiveTab('bookings'); handleLinkClick('dashboard-customer'); }} className="w-full text-left py-1 px-1.5 hover:bg-slate-50 rounded block">Dashboard</button>
                    <button onClick={() => { setUserDropdownOpen(false); setCustomerActiveTab('profile'); handleLinkClick('dashboard-customer'); }} className="w-full text-left py-1 px-1.5 hover:bg-slate-50 rounded block">Profile Account</button>
                    <button onClick={handleSignOutAction} className="w-full text-left py-1 px-1.5 hover:bg-rose-50 text-rose-600 rounded font-bold flex items-center gap-1 mt-1 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ----------------------------------------------------
  // PUBLIC VISITOR HEADER (unchanged)
  // ----------------------------------------------------
  return (
    <header
      id="public-navbar-comp"
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div onClick={() => handleLinkClick('home')} className="flex items-center gap-2 cursor-pointer select-none">
          <Logo className="w-10 h-10 rounded-xl" />
          <div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight font-sans block h-5 leading-none">servego24</span>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-0.5">Trusted Local Experts</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <button onClick={() => handleLinkClick('home')} className={`hover:text-teal-700 cursor-pointer py-1 ${currentPage === 'home' ? 'text-teal-700 border-b-2 border-teal-700' : ''}`}>Home</button>
          <button onClick={() => handleLinkClick('services')} className={`hover:text-teal-700 cursor-pointer py-1 ${currentPage === 'services' ? 'text-teal-700 border-b-2 border-teal-700' : ''}`}>Services</button>
          <button onClick={() => handleLinkClick('about')} className={`hover:text-teal-700 cursor-pointer py-1 ${currentPage === 'about' ? 'text-teal-700 border-b-2 border-teal-700' : ''}`}>About</button>
          <button onClick={() => handleLinkClick('contact')} className={`hover:text-teal-700 cursor-pointer py-1 ${currentPage === 'contact' ? 'text-teal-700 border-b-2 border-teal-700' : ''}`}>Contact</button>
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={() => handleLinkClick('services')} className="bg-teal-700 hover:bg-teal-850 text-white rounded-xl px-4 py-2 text-xs font-extrabold transition-all shadow-xs">Book Service</button>
          <button onClick={() => handleLinkClick('login')} className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition-all border border-slate-250">
            <User className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="md:hidden p-1 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer" aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 flex flex-col justify-between items-center text-xs font-bold text-slate-600 uppercase tracking-wider z-25 relative shadow-md w-full overflow-hidden">
          <button onClick={() => handleLinkClick('home')} className="hover:text-teal-700 cursor-pointer text-center py-1.5 w-full border-b border-slate-100">Home</button>
          <button onClick={() => handleLinkClick('services')} className="hover:text-teal-700 cursor-pointer text-center py-1.5 w-full border-b border-slate-100">Services</button>
          <button onClick={() => handleLinkClick('about')} className="hover:text-teal-700 cursor-pointer text-center py-1.5 w-full border-b border-slate-100">About</button>
          <button onClick={() => handleLinkClick('contact')} className="hover:text-teal-700 cursor-pointer text-center py-1.5 w-full border-b border-slate-100">Contact</button>
          <button onClick={() => handleLinkClick('login')} className="hover:text-teal-700 cursor-pointer text-center py-1.5 w-full flex items-center justify-center gap-1">
            <User className="w-3.5 h-3.5" /> Login
          </button>
        </div>
      )}
    </header>
  );
}


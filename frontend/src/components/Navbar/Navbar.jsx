import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  publicNavItems,
  guestActions,
  customerNavItems,
  customerProfileMenu,
  providerNavItems,
  providerProfileMenu,
  adminNavItems,
  adminProfileMenu,
} from '../../data/navigation';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifCount] = useState(3);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'guest';
  const navItems = role === 'customer' ? customerNavItems : role === 'provider' ? providerNavItems : role === 'admin' ? adminNavItems : publicNavItems;
  const profileMenu = role === 'customer' ? customerProfileMenu : role === 'provider' ? providerProfileMenu : role === 'admin' ? adminProfileMenu : [];
  const actionButtons = role === 'guest' ? guestActions : [];
  const profileLabel = user?.name || user?.email?.split('@')[0] || 'Account';

  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.profile') && !e.target.closest('.notification')) {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleResize = () => {
      if (window.innerWidth > 768) setIsMenuOpen(false);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen]);

  return (
    <nav className={`navbar ${isAuthenticated ? 'navbar-logged' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">ServeGo</Link>
        </div>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {isAuthenticated ? (
          <div className="nav-right">
            <div className={`notification ${isNotifOpen ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setIsNotifOpen((prev) => !prev); }}>
              <button className="notif-btn" aria-label="Notifications">🔔</button>
              {notifCount > 0 && <span className="badge">{notifCount}</span>}
              {isNotifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-item">You have {notifCount} new notifications</div>
                  <div className="notif-item">Booking confirmed for tomorrow</div>
                  <div className="notif-footer">
                    <Link to="/notifications">View all</Link>
                  </div>
                </div>
              )}
            </div>

            <div className={`profile ${isProfileOpen ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); setIsProfileOpen((prev) => !prev); }}>
              <div className="profile-btn">
                <div className="avatar">{profileLabel[0]?.toUpperCase() || 'U'}</div>
                <div className="profile-name">{profileLabel}</div>
                <div className="chev">▾</div>
              </div>

              {isProfileOpen && (
                <div className="dropdown-menu">
                  {profileMenu.map((item) => (
                    <Link key={item.to} to={item.to} className="dropdown-link" onClick={() => setIsProfileOpen(false)}>
                      {item.label}
                    </Link>
                  ))}
                  <button className="dropdown-link logout" type="button" onClick={() => setShowLogoutModal(true)}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="nav-buttons">
            {actionButtons.map((action) => (
              <Link key={action.to} to={action.to}>
                <button className={action.label.includes('Book') ? 'btn-book' : 'btn-login'}>{action.label}</button>
              </Link>
            ))}
          </div>
        )}

        <div className="hamburger" onClick={toggleMenu}>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`} />
          <span className={`bar ${isMenuOpen ? 'active' : ''}`} />
          <span className={`bar ${isMenuOpen ? 'active' : ''}`} />
        </div>
      </div>

      <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-overlay" onClick={closeMenu} />
        <div className="mobile-menu-content">
          <nav className="mobile-nav">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mobile-buttons">
            {isAuthenticated ? (
            <>
              {profileMenu.map((item) => (
                <Link key={item.to} to={item.to} onClick={closeMenu}><button className="btn-book-mobile">{item.label}</button></Link>
              ))}
              <button type="button" className="btn-login-mobile" onClick={() => { closeMenu(); setShowLogoutModal(true); }}>Logout</button>
            </>
          ) : (
              actionButtons.map((action) => (
                <Link key={action.to} to={action.to} onClick={closeMenu}><button className={action.label.includes('Book') ? 'btn-book-mobile' : 'btn-login-mobile'}>{action.label}</button></Link>
              ))
            )}
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title">Are you sure you want to logout?</div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="btn primary" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

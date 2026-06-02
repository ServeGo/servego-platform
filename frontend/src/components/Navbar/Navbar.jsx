import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifCount] = useState(3);
  const [user, setUser] = useState(() => {
    try {
      const j = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      return j ? JSON.parse(j) : null;
    } catch (e) {
      return null;
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const onUserChange = () => {
      try {
        const j = localStorage.getItem('user');
        setUser(j ? JSON.parse(j) : null);
      } catch (e) {
        setUser(null);
      }
    };

    const onStorage = (e) => {
      if (e.key === 'user') onUserChange();
    };

    window.addEventListener('userChange', onUserChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('userChange', onUserChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userChange'));
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

  if (user) {
    return (
      <nav className="navbar navbar-logged">
        <div className="navbar-container">
          <div className="navbar-logo">
            <Link to="/">ServeGo</Link>
          </div>

          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Home
            </NavLink>
            <NavLink to="/services" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Services
            </NavLink>
            <NavLink to="/my-bookings" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              My Bookings
            </NavLink>
            <NavLink to="/support" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Support
            </NavLink>
          </div>

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
                <div className="avatar">{user.name ? user.name[0] : 'C'}</div>
                <div className="profile-name">{user.name || 'Customer'}</div>
                <div className="chev">▾</div>
              </div>

              {isProfileOpen && (
                <div className="dropdown-menu">
                  <Link to="/dashboard" className="dropdown-link">Dashboard</Link>
                  <Link to="/profile" className="dropdown-link">Profile</Link>
                  <Link to="/booking-history" className="dropdown-link">Booking History</Link>
                  <Link to="/my-bookings" className="dropdown-link">My Bookings</Link>
                  <Link to="/saved-services" className="dropdown-link">Saved Services</Link>
                  <Link to="/settings" className="dropdown-link">Settings</Link>
                  <button className="dropdown-link logout" onClick={() => setShowLogoutModal(true)}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="hamburger" onClick={toggleMenu}>
            <span className={`bar ${isMenuOpen ? 'active' : ''}`} />
            <span className={`bar ${isMenuOpen ? 'active' : ''}`} />
            <span className={`bar ${isMenuOpen ? 'active' : ''}`} />
          </div>
        </div>

        <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
          <div className="mobile-menu-content">
            <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Home
            </NavLink>
            <NavLink to="/services" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Services
            </NavLink>
            <NavLink to="/my-bookings" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              My Bookings
            </NavLink>
            <NavLink to="/support" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Support
            </NavLink>
            <div className="mobile-buttons">
              <Link to="/book-service"><button className="btn-book-mobile" onClick={closeMenu}>Book a Service</button></Link>
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
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">ServeGo</Link>
        </div>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Home
          </NavLink>
          <NavLink to="/services" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Services
          </NavLink>
          <NavLink to="/become-partner" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Become a Partner
          </NavLink>
          <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            About
          </NavLink>
        </div>

        <div className="nav-buttons">
          <Link to="/book-service"><button className="btn-book">Book a Service</button></Link>
          <Link to="/login"><button className="btn-login">Login</button></Link>
        </div>

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
            <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Home
            </NavLink>
            <NavLink to="/services" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Services
            </NavLink>
            <NavLink to="/become-partner" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              Become a Partner
            </NavLink>
            <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              About
            </NavLink>
          </nav>
          <div className="mobile-buttons">
            <Link to="/book-service"><button className="btn-book-mobile" onClick={closeMenu}>Book a Service</button></Link>
            <Link to="/login"><button className="btn-login-mobile" onClick={closeMenu}>Login</button></Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

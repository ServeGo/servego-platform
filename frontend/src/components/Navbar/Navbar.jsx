import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(3);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const j = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      return j ? JSON.parse(j) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const onUserChange = () => {
      try {
        const j = localStorage.getItem('user');
        setUser(j ? JSON.parse(j) : null);
      } catch (e) {
        setUser(null);
      }
    };

    const onStorage = e => {
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
    const handleOutside = e => {
      if (!e.target.closest('.profile') && !e.target.closest('.notification')) {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    // clear user and redirect to login
    localStorage.removeItem('user');
    // notify other components
    window.dispatchEvent(new Event('userChange'));
    setShowLogoutModal(false);
    navigate('/login');
  };

  // Logged-in navbar
  if (user) {
    return (
      <nav className="navbar navbar-logged">
        <div className="navbar-container">
          <div className="navbar-logo">
            <Link to="/">🔧 ServeGo</Link>
          </div>

          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/" onClick={closeMenu}>Home</Link>
            <Link to="/services" onClick={closeMenu}>Services</Link>
            <Link to="/my-bookings" onClick={closeMenu}>My Bookings</Link>
            <Link to="/support" onClick={closeMenu}>Support</Link>
          </div>

          <div className="nav-right">
            <div className={`notification ${isNotifOpen ? 'open' : ''}`} onClick={e => { e.stopPropagation(); setIsNotifOpen(prev => !prev); }}>
              <button className="notif-btn" aria-label="Notifications">🔔</button>
              {notifCount > 0 && <span className="badge">{notifCount}</span>}
              {isNotifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-item">You have {notifCount} new notifications</div>
                  <div className="notif-item">Booking confirmed for tomorrow</div>
                  <div className="notif-footer"><Link to="/notifications">View all</Link></div>
                </div>
              )}
            </div>

            <div className={`profile ${isProfileOpen ? 'open' : ''}`} onClick={e => { e.stopPropagation(); setIsProfileOpen(prev => !prev); }}>
              <div className="profile-btn">
                <div className="avatar">👤</div>
                <div className="profile-name">{user.name || 'Customer'}</div>
                <div className="chev">▾</div>
              </div>

              {isProfileOpen && (
                <div className="dropdown-menu">
                  <Link to="/dashboard" className="dropdown-link">Dashboard</Link>
                  <Link to="/profile" className="dropdown-link">Profile</Link>
                  <Link to="/booking-history" className="dropdown-link">Booking History</Link>
                  <Link to="/saved-services" className="dropdown-link">Saved Services</Link>
                  <Link to="/settings" className="dropdown-link">Settings</Link>
                  <button className="dropdown-link logout" onClick={() => setShowLogoutModal(true)}>Logout</button>
                </div>
              )}
            </div>
          </div>

          <div className="hamburger" onClick={toggleMenu}>
            <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          </div>
        </div>

        <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
          <div className="mobile-menu-content">
            <Link to="/" onClick={closeMenu}>Home</Link>
            <Link to="/services" onClick={closeMenu}>Services</Link>
            <Link to="/my-bookings" onClick={closeMenu}>My Bookings</Link>
            <Link to="/support" onClick={closeMenu}>Support</Link>
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

  // Guest navbar (fallback)
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">ServeGo</Link>
        </div>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/services" onClick={closeMenu}>Services</Link>
          <Link to="/become-partner" onClick={closeMenu}>Become a Partner</Link>
          <Link to="/about" onClick={closeMenu}>About</Link>
        </div>

        <div className="nav-buttons">
          <Link to="/book-service"><button className="btn-book">Book a Service</button></Link>
          <Link to="/login"><button className="btn-login">Login</button></Link>
        </div>

        <div className="hamburger" onClick={toggleMenu}>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
        </div>
      </div>

      <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/services" onClick={closeMenu}>Services</Link>
          <Link to="/become-partner" onClick={closeMenu}>Become a Partner</Link>
          <Link to="/about" onClick={closeMenu}>About</Link>
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
import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    // Lock body scroll when mobile menu is open
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Close menu on resize to desktop width
    const handleResize = () => {
      if (window.innerWidth > 768) setIsMenuOpen(false);
    };

    // Close menu on Escape key
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
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">ServeGo</Link>
        </div>

        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>Home</NavLink>
          <NavLink to="/services" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>Services</NavLink>
          <NavLink to="/become-partner" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>Become a Partner</NavLink>
          <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>About</NavLink>
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
        <div className="mobile-menu-overlay" onClick={closeMenu} />
        <div className="mobile-menu-content">
          <nav className="mobile-nav">
            <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>Home</NavLink>
            <NavLink to="/services" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>Services</NavLink>
            <NavLink to="/become-partner" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>Become a Partner</NavLink>
            <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => (isActive ? 'active' : undefined)}>About</NavLink>
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
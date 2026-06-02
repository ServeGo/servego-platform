import React, { useState } from 'react';
import './Navbar.css'; // We'll create this CSS file

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <div className="navbar-logo">
          <a href="/">YourLogo</a>
        </div>

        {/* Desktop Navigation Links */}
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <a href="/" onClick={closeMenu}>Home</a>
          <a href="/services" onClick={closeMenu}>Services</a>
          <a href="/become-partner" onClick={closeMenu}>Become a Partner</a>
          <a href="/about" onClick={closeMenu}>About</a>
        </div>

        {/* Right side buttons - Desktop */}
        <div className="nav-buttons">
          <button className="btn-book" onClick={() => window.location.href='/book-service'}>
            Book a Service
          </button>
          <button className="btn-login" onClick={() => window.location.href='/login'}>
            Login
          </button>
        </div>

        {/* Mobile Hamburger Menu */}
        <div className="hamburger" onClick={toggleMenu}>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`bar ${isMenuOpen ? 'active' : ''}`}></span>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <a href="/" onClick={closeMenu}>Home</a>
          <a href="/services" onClick={closeMenu}>Services</a>
          <a href="/become-partner" onClick={closeMenu}>Become a Partner</a>
          <a href="/about" onClick={closeMenu}>About</a>
          <div className="mobile-buttons">
            <button className="btn-book-mobile" onClick={() => window.location.href='/book-service'}>
              Book a Service
            </button>
            <button className="btn-login-mobile" onClick={() => window.location.href='/login'}>
              Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
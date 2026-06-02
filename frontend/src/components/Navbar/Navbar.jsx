import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

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
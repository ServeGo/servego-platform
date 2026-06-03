import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-section">
            <h3 className="footer-logo">ServeGo</h3>
            <p className="footer-description">
              Making home services reliable, affordable, and accessible for everyone.
            </p>
            <div className="social-icons">
              <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="social-icon">📘</a>
              <a href="https://www.twitter.com" target="_blank" rel="noreferrer" className="social-icon">🐦</a>
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="social-icon">📷</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="social-icon">🔗</a>
            </div>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/become-partner">Careers</Link></li>
              <li><Link to="/contact">Press</Link></li>
              <li><Link to="/blog">Blog</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Services</h4>
            <ul className="footer-links">
              <li><Link to="/services">Electrician</Link></li>
              <li><Link to="/services">Plumber</Link></li>
              <li><Link to="/services">Carpenter</Link></li>
              <li><Link to="/services">AC Repair</Link></li>
              <li><Link to="/services">Cleaning</Link></li>
              <li><Link to="/services">Painting</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Support</h4>
            <ul className="footer-links">
              <li><Link to="/contact">Help Center</Link></li>
              <li><Link to="/terms">Safety Guidelines</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/support">Refund Policy</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Contact</h4>
            <ul className="footer-links">
              <li>📞 +91 1234567890</li>
              <li>✉️ support@servego.com</li>
              <li>📍 Mumbai, India</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 ServeGo. All rights reserved.</p>
          <div className="payment-methods">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>UPI</span>
            <span>PayPal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

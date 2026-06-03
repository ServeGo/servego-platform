import React from 'react';
import { Link } from 'react-router-dom';
import './PartnerCTA.css';

const PartnerCTA = () => {
  return (
    <section className="partner-cta">
      <div className="partner-container">
        <div className="partner-content">
          <h2 className="partner-title">
            Earn More With <span className="highlight">ServeGo</span>
          </h2>
          <p className="partner-description">
            Join thousands of professionals and grow your business.
            Get more customers, earn more income, and build your reputation.
          </p>
          <div className="partner-buttons">
            <Link to="/become-partner#apply" className="partner-btn-primary">Become a Partner →</Link>
            <Link to="/become-partner" className="partner-btn-secondary">Learn More</Link>
          </div>
        </div>
        <div className="partner-stats">
          <div className="stat">
            <div className="stat-number">10,000+</div>
            <div className="stat-label">Active Professionals</div>
          </div>
          <div className="stat">
            <div className="stat-number">50,000+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat">
            <div className="stat-number">4.9</div>
            <div className="stat-label">Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerCTA;

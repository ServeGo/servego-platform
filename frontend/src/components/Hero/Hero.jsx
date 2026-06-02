import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Trusted Home Services <span className="highlight">At Your Doorstep</span>
          </h1>
          
          <p className="hero-subtitle">
            Book verified electricians, plumbers, carpenters, AC technicians, 
            cleaners, and more in minutes.
          </p>

          <div className="search-container">
            <div className="search-wrapper">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search for a service..."
              />
              <button className="search-btn">Search</button>
            </div>
          </div>

          <div className="hero-buttons">
            <button className="btn-primary">Book a Service</button>
            <button className="btn-secondary">Become a Partner</button>
          </div>

          <div className="trust-badges">
            <div className="badge">
              <svg className="badge-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Verified Professionals</span>
            </div>
            <div className="badge">
              <svg className="badge-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Quick Booking</span>
            </div>
            <div className="badge">
              <svg className="badge-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Affordable Pricing</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-container">
            <div className="floating-card card-1">
              <div className="card-icon">🔧</div>
              <div className="card-text">Professional Service</div>
            </div>
            <div className="floating-card card-2">
              <div className="card-icon">⭐</div>
              <div className="card-text">4.9 Rating</div>
            </div>
            <div className="floating-card card-3">
              <div className="card-icon">✓</div>
              <div className="card-text">Verified</div>
            </div>
            <img 
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
              alt="Service Professionals" 
              className="hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

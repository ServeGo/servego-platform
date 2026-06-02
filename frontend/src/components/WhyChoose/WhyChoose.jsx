import React from 'react';
import './WhyChoose.css';

const features = [
  {
    id: 1,
    icon: '✓',
    title: 'Verified Professionals',
    description: 'All our service partners are background verified and trained.',
    color: '#10b981'
  },
  {
    id: 2,
    icon: '💰',
    title: 'Affordable Pricing',
    description: 'Transparent pricing with no hidden charges or surprises.',
    color: '#f97316'
  },
  {
    id: 3,
    icon: '⏰',
    title: 'Same-Day Service',
    description: 'Get your service done on the same day of booking.',
    color: '#3b82f6'
  },
  {
    id: 4,
    icon: '🔒',
    title: 'Secure Payments',
    description: 'Multiple payment options with 100% secure transactions.',
    color: '#8b5cf6'
  },
  {
    id: 5,
    icon: '⭐',
    title: 'Quality Guarantee',
    description: '100% satisfaction guaranteed or money back.',
    color: '#ef4444'
  },
  {
    id: 6,
    icon: '🎧',
    title: '24/7 Customer Support',
    description: 'Round-the-clock support for all your queries and issues.',
    color: '#06b6d4'
  }
];

const WhyChoose = () => {
  return (
    <section className="why-choose">
      <div className="why-choose-container">
        <div className="section-header">
          <h2 className="section-title">Why Choose ServeGo</h2>
          <p className="section-subtitle">
            We make home services reliable, affordable, and hassle-free
          </p>
        </div>

        <div className="features-grid">
          {features.map(feature => (
            <div key={feature.id} className="feature-card">
              <div className="feature-icon" style={{ backgroundColor: feature.color }}>
                <span>{feature.icon}</span>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-hover-line"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;

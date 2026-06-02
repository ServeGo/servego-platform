import React from 'react';
import '../components/PopularServices/PopularServices.css';

const services = [
  { id: 1, icon: '⚡', name: 'Electrician', description: 'Expert electrical repairs, installations and maintenance', price: '₹499', color: '#fef3c7' },
  { id: 2, icon: '🚿', name: 'Plumber', description: 'Leak repairs, pipe installations and bathroom fittings', price: '₹499', color: '#dbeafe' },
  { id: 3, icon: '🪚', name: 'Carpenter', description: 'Furniture repair, custom designs and woodwork', price: '₹599', color: '#fed7aa' },
  { id: 4, icon: '❄️', name: 'AC Repair', description: 'AC service, gas refill and repair solutions', price: '₹399', color: '#cffafe' },
  { id: 5, icon: '🧹', name: 'Cleaning', description: 'Deep cleaning, sanitization and housekeeping', price: '₹299', color: '#dcfce7' },
  { id: 6, icon: '🎨', name: 'Painting', description: 'Wall painting, texture designs and waterproofing', price: '₹999', color: '#fce7f3' }
];

const Services = () => {
  return (
    <section className="services">
      <div className="services-container">
        <div className="section-header">
          <h2 className="section-title">All Services</h2>
          <p className="section-subtitle">Browse individual services and book what you need</p>
        </div>

        <div className="services-grid">
          {services.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-icon" style={{ backgroundColor: service.color }}>
                <span>{service.icon}</span>
              </div>
              <h3 className="service-name">{service.name}</h3>
              <p className="service-description">{service.description}</p>
              <div className="service-price">
                <span className="price-label">Starting from</span>
                <span className="price-value">{service.price}</span>
              </div>
              <button className="book-now-btn">Book Now →</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

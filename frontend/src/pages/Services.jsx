import React from 'react';
import { Link } from 'react-router-dom';
import '../components/PopularServices/PopularServices.css';
import PageShell from '../components/PageShell';

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
    <PageShell title="All Services" description="Browse individual services and book what you need">
      <div className="page-card">
        <div className="services-grid">
          {services.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-icon" style={{ backgroundColor: service.color }} aria-hidden>
                <span>{service.icon}</span>
              </div>
              <h3 className="service-name">{service.name}</h3>
              <p className="service-description">{service.description}</p>
              <div className="service-price">
                <span className="price-label">Starting from</span>
                <span className="price-value">{service.price}</span>
              </div>
              <Link to={`/services/${service.id}`} className="book-now-btn">
                Book Now →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default Services;

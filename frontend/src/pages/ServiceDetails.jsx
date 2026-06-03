import React from 'react';
import { Link, useParams } from 'react-router-dom';
import PageShell from '../components/PageShell';

const detailMap = {
  1: { title: 'Electrician Services', icon: '⚡', description: 'Installations, repairs, wiring and more to keep your home powered safely.' },
  2: { title: 'Plumbing Services', icon: '🚿', description: 'Fix leaks, install fittings, and keep water systems flowing smoothly.' },
  3: { title: 'Carpentry Services', icon: '🪚', description: 'Furniture repairs, custom shelves, doors, and finish carpentry work.' },
  4: { title: 'AC Repair Services', icon: '❄️', description: 'AC maintenance, gas refill, filter cleaning and troubleshooting.' },
  5: { title: 'Cleaning Services', icon: '🧹', description: 'Deep cleaning, sanitization, and home refresh services.' },
  6: { title: 'Painting Services', icon: '🎨', description: 'Interior, exterior and finishing paint jobs with trusted painters.' },
};

const ServiceDetails = () => {
  const { id } = useParams();
  const service = detailMap[id] || { title: 'Service Details', icon: '🔧', description: 'Explore our services and get a custom quote.' };

  return (
    <PageShell title={service.title} description={service.description}>
      <div className="page-card">
        <div className="page-heading" aria-labelledby="service-details-heading">
          <div className="service-icon" aria-hidden>{service.icon}</div>
          <div>
            <h1 id="service-details-heading" className="page-title">{service.title}</h1>
            <p className="page-description">{service.description}</p>
          </div>
        </div>

        <div className="step-list">
          {['Choose provider', 'Select date', 'Select time', 'Provide address', 'Confirm booking'].map((step, index) => (
            <div key={step} className={`step-card ${index % 2 === 0 ? 'step-card-alt' : ''}`}>
              <div className="step-number">{index + 1}</div>
              <div className="step-title">{step}</div>
            </div>
          ))}
        </div>

        <div className="page-row">
          <Link to="/book-service" className="book-now-btn">Book Service</Link>
          <Link to="/services" className="button-secondary">Back to Services</Link>
        </div>
      </div>
    </PageShell>
  );
};

export default ServiceDetails;

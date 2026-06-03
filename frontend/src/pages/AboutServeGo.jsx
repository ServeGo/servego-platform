import React from 'react';
import PageShell from '../components/PageShell';

const features = [
  {
    id: 1,
    icon: '✔️',
    title: 'Verified Professionals',
    description: 'All service providers are verified before joining the platform.',
  },
  {
    id: 2,
    icon: '⚡',
    title: 'Fast & Easy Booking',
    description: 'Book trusted professionals in just a few clicks.',
  },
  {
    id: 3,
    icon: '💰',
    title: 'Affordable Pricing',
    description: 'Transparent pricing with no hidden charges.',
  },
  {
    id: 4,
    icon: '🌟',
    title: 'Quality Service',
    description: 'Dedicated to delivering excellent customer experiences.',
  },
];

const stats = [
  { id: 1, value: '10,000+', label: 'Happy Customers' },
  { id: 2, value: '2,000+', label: 'Service Partners' },
  { id: 3, value: '50+', label: 'Cities Covered' },
  { id: 4, value: '4.8★', label: 'Customer Rating' },
];

const values = [
  { id: 1, title: 'Trust', description: 'Every professional is verified and reviewed by customers' },
  { id: 2, title: 'Transparency', description: 'Clear pricing with no hidden fees or surprises' },
  { id: 3, title: 'Quality', description: 'We maintain high service standards across all categories' },
  { id: 4, title: 'Innovation', description: 'Continuously improving to meet customer expectations' },
];

const AboutServeGo = () => {
  return (
    <PageShell title="About ServeGo" description="Connecting customers with trusted service professionals">
      {/* Hero Section */}
      <div className="about-hero" style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        borderRadius: '28px',
        padding: '3rem 2.5rem',
        color: 'white',
        marginBottom: '3rem',
        boxShadow: '0 20px 60px rgba(37, 99, 235, 0.15)',
      }}>
        <div className="about-hero-content">
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>Our Mission</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.8, maxWidth: '600px', opacity: 0.95 }}>
            To make professional home services reliable, affordable, and accessible for everyone, while helping skilled professionals build successful careers.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ maxWidth: '800px', marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>About ServeGo</h3>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#475569', marginBottom: '1.2rem' }}>
            ServeGo is a trusted service marketplace that connects customers with skilled professionals for everyday home and business needs. Whether you need an electrician, plumber, carpenter, AC technician, cleaner, painter, or appliance repair expert, ServeGo helps you find verified and reliable service providers quickly and easily.
          </p>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#475569' }}>
            We leverage technology, rigorous verification processes, and customer feedback to ensure a seamless experience for both customers and service professionals.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', color: '#0f172a' }}>Why Choose ServeGo?</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}>
          {features.map(feature => (
            <div key={feature.id} className="page-card" style={{
              padding: '2rem',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.15)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{feature.icon}</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>{feature.title}</h4>
              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6 }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef5ff 100%)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        marginBottom: '3rem',
        border: '1px solid rgba(37, 99, 235, 0.1)',
      }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', color: '#0f172a', textAlign: 'center' }}>Our Impact</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem',
        }}>
          {stats.map(stat => (
            <div key={stat.id} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#2563eb',
                marginBottom: '0.5rem',
              }}>{stat.value}</div>
              <div style={{ fontSize: '1rem', color: '#475569', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Values */}
      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', color: '#0f172a' }}>Our Core Values</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}>
          {values.map(value => (
            <div key={value.id} style={{
              padding: '1.5rem',
              borderLeft: '4px solid #2563eb',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
            }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0f172a' }}>{value.title}</h4>
              <p style={{ fontSize: '0.95rem', color: '#475569', margin: 0 }}>{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default AboutServeGo;

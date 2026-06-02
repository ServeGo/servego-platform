import React from 'react';

const cards = [
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
  { id: 4, value: '4.8★', label: 'Average Customer Rating' },
];

const styles = {
  section: {
    padding: '5rem 2rem',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2.5rem',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#1d4ed8',
    fontWeight: 700,
    borderRadius: '9999px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.8rem',
    marginBottom: '1.4rem',
  },
  title: {
    fontSize: '3rem',
    lineHeight: 1.05,
    fontWeight: 800,
    color: '#111827',
    marginBottom: '1.5rem',
  },
  description: {
    color: '#4b5563',
    fontSize: '1.05rem',
    lineHeight: 1.8,
    marginBottom: '1rem',
  },
  strongDescription: {
    color: '#374151',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginTop: '2.25rem',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '24px',
    padding: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  cardIcon: {
    width: '56px',
    height: '56px',
    minWidth: '56px',
    borderRadius: '18px',
    background: '#eff6ff',
    display: 'grid',
    placeItems: 'center',
    fontSize: '1.5rem',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.65rem',
  },
  cardText: {
    color: '#6b7280',
    lineHeight: 1.7,
    fontSize: '0.95rem',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
    marginTop: '2.25rem',
  },
  stat: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '1.5rem',
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '1.9rem',
    fontWeight: 800,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  statLabel: {
    display: 'block',
    color: '#6b7280',
    fontSize: '0.95rem',
  },
  finalMessage: {
    marginTop: '2.25rem',
    padding: '2rem',
    borderRadius: '24px',
    background: '#1d4ed8',
    color: '#ffffff',
    boxShadow: '0 30px 60px rgba(30, 64, 175, 0.12)',
  },
  finalTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    marginBottom: '1rem',
  },
  finalText: {
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 1.8,
    fontSize: '1rem',
  },
  visual: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
  },
  image: {
    width: '100%',
    borderRadius: '32px',
    objectFit: 'cover',
    boxShadow: '0 30px 60px rgba(15, 23, 42, 0.12)',
  },
  visualCard: {
    position: 'absolute',
    zIndex: 1,
    borderRadius: '22px',
    padding: '1rem 1.25rem',
    color: '#ffffff',
    fontWeight: 700,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
  },
  visualPrimary: {
    top: '12%',
    left: '10%',
    background: 'rgba(59, 130, 246, 0.96)',
  },
  visualSecondary: {
    bottom: '12%',
    right: '8%',
    background: 'rgba(16, 185, 129, 0.96)',
  },
};

const AboutServeGo = () => {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.grid}>
          <div>
            <span style={styles.badge}>About ServeGo</span>
            <h2 style={styles.title}>Connecting Customers With Trusted Service Professionals</h2>
            <p style={styles.description}>
              ServeGo is a trusted service marketplace that connects customers with skilled professionals for everyday home and business needs.
            </p>
            <p style={styles.description}>
              Whether you need an electrician, plumber, carpenter, AC technician, cleaner, painter, appliance repair expert, or other local professional, ServeGo helps you find verified and reliable service providers quickly and easily.
            </p>
            <p style={{ ...styles.description, ...styles.strongDescription }}>
              Our mission is to make service booking simple, transparent, affordable, and accessible while helping professionals grow their businesses and reach more customers.
            </p>

            <div style={styles.cards}>
              {cards.map(card => (
                <div key={card.id} style={styles.card}>
                  <div style={styles.cardIcon}>{card.icon}</div>
                  <div>
                    <h3 style={styles.cardTitle}>{card.title}</h3>
                    <p style={styles.cardText}>{card.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.stats}>
              {stats.map(stat => (
                <div key={stat.id} style={styles.stat}>
                  <span style={styles.statValue}>{stat.value}</span>
                  <span style={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>

            <div style={styles.finalMessage}>
              <h3 style={styles.finalTitle}>Why Customers Choose ServeGo</h3>
              <p style={styles.finalText}>
                We focus on trust, convenience, quality, and customer satisfaction. Our platform makes it easy to find skilled professionals while giving service providers the tools they need to grow their careers.
              </p>
            </div>
          </div>

          <div style={styles.visual}>
            <div style={{ ...styles.visualCard, ...styles.visualPrimary }}>
              Service professionals
            </div>
            <div style={{ ...styles.visualCard, ...styles.visualSecondary }}>
              Customer satisfaction
            </div>
            <img
              style={styles.image}
              src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80"
              alt="Service professionals and customer satisfaction"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutServeGo;

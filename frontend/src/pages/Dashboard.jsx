import React, { useState } from 'react';
import Loader from '../scaffold/common/Loader';
import EmptyState from '../scaffold/common/EmptyState';
import { Link } from 'react-router-dom';

const styles = {
  page: { padding: '2rem', minHeight: '80vh', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { fontSize: '2rem', fontWeight: 800, color: '#0b1220' },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' },
  card: { background: 'white', borderRadius: '16px', padding: '1.2rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)' },
  statsRow: { display: 'flex', gap: '1rem' },
  stat: { flex: 1, padding: '1rem', borderRadius: '12px', background: '#f8fafc', textAlign: 'center', fontWeight: 800 },
  listItem: { padding: '0.6rem 0', borderBottom: '1px solid #eef2ff' },
  link: { color: '#2563eb', fontWeight: 700 },
};

const Dashboard = () => {
  const [isLoading] = useState(false);

  if (isLoading) return <Loader />;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Welcome Back</div>
          <div style={{ color: '#475569' }}>Here's what's happening with your account</div>
        </div>
        <div>
          <Link to="/notifications" style={styles.link}>View Notifications</Link>
        </div>
      </div>

      <div style={styles.grid}>
        <div>
          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: '0.8rem' }}>Quick Statistics</div>
            <div style={styles.statsRow}>
              <div style={styles.stat}>3 Upcoming</div>
              <div style={styles.stat}>12 Completed</div>
              <div style={styles.stat}>2 Saved</div>
            </div>
          </div>

          <div style={{ height: '1rem' }} />

          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: '0.8rem' }}>Upcoming Bookings</div>
            <div style={styles.listItem}>AC Repair - Tomorrow, 10:00 AM</div>
            <div style={styles.listItem}>Home Cleaning - Fri, 3:00 PM</div>
            <div style={styles.listItem}>Plumber - Next Tue, 11:00 AM</div>
          </div>

          <div style={{ height: '1rem' }} />

          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: '0.8rem' }}>Popular Services</div>
            <div style={styles.listItem}>Full Home Cleaning</div>
            <div style={styles.listItem}>AC Repair (Onsite)</div>
            <div style={styles.listItem}>Water Purifier Service</div>
          </div>
        </div>

        <aside>
          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: '0.8rem' }}>Profile Summary</div>
            <div style={{ color: '#475569' }}>Shekhar<br />shekhar@example.com<br />+91 98765 43210</div>
          </div>

          <div style={{ height: '1rem' }} />

          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: '0.8rem' }}>Quick Actions</div>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <Link to="/book-service" style={styles.link}>Book a Service</Link>
              <Link to="/booking-history" style={styles.link}>View Booking History</Link>
              <Link to="/saved-services" style={styles.link}>Saved Services</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;

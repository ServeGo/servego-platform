import React from 'react';

const styles = {
  page: { padding: '2rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', minHeight: '80vh' },
  card: { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)' },
  item: { padding: '0.6rem 0', borderBottom: '1px solid #eef2ff' }
};

const Notifications = () => (
  <div style={styles.page}>
    <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.6rem' }}>Notifications</div>
    <div style={styles.card}>
      <div style={styles.item}>Booking confirmed for AC Repair — Tomorrow 10:00 AM</div>
      <div style={styles.item}>Your invoice #12345 is ready</div>
      <div style={styles.item}>New professional added in your area</div>
    </div>
  </div>
);

export default Notifications;

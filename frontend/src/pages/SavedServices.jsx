import React from 'react';

const styles = {
  page: { padding: '2rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', minHeight: '80vh' },
  card: { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)' },
  serviceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #eef2ff' },
  button: { padding: '0.5rem 0.8rem', borderRadius: '8px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700 }
};

const SavedServices = () => {
  return (
    <div style={styles.page}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Saved Services</div>
      <div style={{ color: '#475569', marginBottom: '1rem' }}>Your favorite services and professionals for quick booking.</div>

      <div style={styles.card}>
        <div style={styles.serviceRow}><div>Full Home Cleaning</div><button style={styles.button}>Quick Book</button></div>
        <div style={styles.serviceRow}><div>AC Repair (Trusted)</div><button style={styles.button}>Quick Book</button></div>
        <div style={styles.serviceRow}><div>Electrician - Shekhar</div><button style={styles.button}>Quick Book</button></div>
      </div>
    </div>
  );
};

export default SavedServices;

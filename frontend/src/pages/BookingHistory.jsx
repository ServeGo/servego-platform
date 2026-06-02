import React from 'react';

const styles = {
  page: { padding: '2rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', minHeight: '80vh' },
  card: { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)' },
  section: { marginBottom: '1rem' },
  button: { padding: '0.6rem 0.9rem', borderRadius: '8px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700 }
};

const BookingHistory = () => {
  return (
    <div style={styles.page}>
      <div style={styles.section}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Booking History</div>
        <div style={{ color: '#475569' }}>Review past bookings, invoices and ratings.</div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={styles.card}>
          <div style={{ fontWeight: 800 }}>Completed Services</div>
          <div style={{ color: '#475569' }}>AC Repair — Completed on 2026-05-02 — Rating: ★★★★☆</div>
          <div style={{ marginTop: '0.6rem' }}><button style={styles.button}>Book Again</button></div>
        </div>

        <div style={styles.card}>
          <div style={{ fontWeight: 800 }}>Cancelled Services</div>
          <div style={{ color: '#475569' }}>Home Painting — Cancelled on 2026-04-10</div>
        </div>

        <div style={styles.card}>
          <div style={{ fontWeight: 800 }}>Invoices</div>
          <div style={{ color: '#475569' }}>Invoice #12345 — Paid</div>
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;

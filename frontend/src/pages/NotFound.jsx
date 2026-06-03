import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div style={{ minHeight: '82vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', padding: '2rem' }}>
    <div style={{ textAlign: 'center', maxWidth: '720px', background: 'white', padding: '3rem', borderRadius: '28px', boxShadow: '0 30px 80px rgba(15,23,42,0.12)' }}>
      <div style={{ fontSize: '4rem', fontWeight: 800 }}>404</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0' }}>Page not found</div>
      <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: '1.5rem' }}>The route you are looking for does not exist or may have been moved. Use the links below to continue.</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/" style={{ padding: '0.95rem 1.4rem', borderRadius: '999px', background: '#2563eb', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>Home</Link>
        <Link to="/services" style={{ padding: '0.95rem 1.4rem', borderRadius: '999px', background: '#f8fafc', color: '#111827', textDecoration: 'none', fontWeight: 700 }}>Browse Services</Link>
      </div>
    </div>
  </div>
);

export default NotFound;

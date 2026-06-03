import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProviderSignup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [service, setService] = useState('Electrician');

  const handleSubmit = (event) => {
    event.preventDefault();
    login({ name: name || email.split('@')[0] || 'Provider', email, role: 'provider', service });
    navigate('/provider-dashboard');
  };

  return (
    <div style={{ minHeight: '80vh', padding: '2rem 1rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '620px', padding: '2rem', borderRadius: '28px', background: 'white', boxShadow: '0 30px 80px rgba(15,23,42,0.12)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>Provider Signup</h1>
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>Join ServeGo as a verified partner and start receiving work.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input type="text" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }} />
          <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }} />
          <select value={service} onChange={(e) => setService(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }}>
            {['Electrician', 'Plumber', 'Carpenter', 'AC Technician', 'Cleaner', 'Painter'].map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: '1rem', borderRadius: '18px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700 }}>Create account</button>
        </form>
        <div style={{ marginTop: '1rem', color: '#475569' }}>
          Already registered? <Link to="/provider-login" style={{ color: '#2563eb', fontWeight: 700 }}>Login here</Link>
        </div>
      </div>
    </div>
  );
};

export default ProviderSignup;

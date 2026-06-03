import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProviderLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    login({ name: email.split('@')[0] || 'Provider', email, role: 'provider' });
    navigate('/provider-dashboard');
  };

  return (
    <div style={{ minHeight: '80vh', padding: '2rem 1rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '560px', padding: '2rem', borderRadius: '28px', background: 'white', boxShadow: '0 30px 80px rgba(15,23,42,0.12)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>Provider Login</h1>
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>Manage your service jobs, earnings and availability.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input type="email" required placeholder="Provider email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }} />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ padding: '1rem', borderRadius: '18px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700 }}>Continue</button>
        </form>
        <div style={{ marginTop: '1rem', color: '#475569' }}>
          New provider? Please <Link to="/become-partner#apply" style={{ color: '#2563eb', fontWeight: 700 }}>apply via our Become Partner form</Link>. We review applications and create provider accounts.
        </div>
      </div>
    </div>
  );
};

export default ProviderLogin;

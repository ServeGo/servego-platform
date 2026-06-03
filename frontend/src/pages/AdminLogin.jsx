import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    login({ name: 'Admin', email, role: 'admin' });
    navigate('/admin-dashboard');
  };

  return (
    <div style={{ minHeight: '80vh', padding: '2rem 1rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '520px', padding: '2rem', borderRadius: '28px', background: 'white', boxShadow: '0 30px 80px rgba(15,23,42,0.12)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>Admin Login</h1>
        <p style={{ color: '#475569', marginBottom: '1.5rem' }}>Access the ServeGo platform administration tools.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input type="email" required placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }} />
          <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '1rem', borderRadius: '18px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ padding: '1rem', borderRadius: '18px', background: '#111827', color: '#fff', border: 'none', fontWeight: 700 }}>Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

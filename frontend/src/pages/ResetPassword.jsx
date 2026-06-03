import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ResetPassword = () => {
  const [sent, setSent] = useState(false);

  return (
    <div style={{ minHeight: '80vh', padding: '2rem 1rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '520px', padding: '2rem', background: 'white', borderRadius: '28px', boxShadow: '0 30px 90px rgba(15,23,42,0.12)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>Reset Password</h1>
        {sent ? (
          <div>
            <p style={{ color: '#475569', marginBottom: '1.5rem' }}>A reset link has been sent to your email. Please check your inbox.</p>
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 700 }}>Return to Login</Link>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', color: '#334155', fontWeight: 600 }}>Email Address</label>
            <input type="email" required placeholder="you@example.com" style={{ width: '100%', padding: '1rem 1.1rem', borderRadius: '18px', border: '1px solid #cbd5e1', marginBottom: '1.25rem' }} />
            <button type="submit" style={{ width: '100%', padding: '1rem', borderRadius: '18px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 700 }}>Send Reset Link</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

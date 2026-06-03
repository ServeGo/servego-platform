import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
  page: {
    minHeight: '100vh',
    padding: '2rem 1rem',
    background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
    display: 'grid',
    placeItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: '1180px',
    display: 'grid',
    gridTemplateColumns: '1.3fr 1fr',
    gap: '2rem',
    alignItems: 'stretch',
  },
  introCard: {
    background: 'white',
    borderRadius: '32px',
    boxShadow: '0 40px 120px rgba(15, 23, 42, 0.1)',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  hero: {
    maxWidth: '560px',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#111827',
    lineHeight: 1.02,
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: '1.05rem',
    color: '#4b5563',
    lineHeight: 1.8,
    marginBottom: '2rem',
  },
  trustList: {
    display: 'grid',
    gap: '0.85rem',
    marginBottom: '2.5rem',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
    color: '#111827',
    fontWeight: 600,
  },
  trustIcon: {
    color: '#16a34a',
    fontSize: '1.2rem',
  },
  visual: {
    borderRadius: '28px',
    overflow: 'hidden',
    minHeight: '420px',
    background: '#eef2ff',
    boxShadow: '0 30px 80px rgba(15, 23, 42, 0.08)',
  },
  visualImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  formCard: {
    background: 'white',
    borderRadius: '32px',
    boxShadow: '0 40px 120px rgba(15, 23, 42, 0.1)',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  formHeader: {
    marginBottom: '1.75rem',
  },
  formTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  formSubtitle: {
    color: '#6b7280',
    lineHeight: 1.75,
  },
  fieldGroup: {
    display: 'grid',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  label: {
    fontSize: '0.95rem',
    color: '#334155',
    marginBottom: '0.5rem',
    fontWeight: 600,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    borderRadius: '18px',
    border: '1px solid #cbd5e1',
    padding: '1rem 1.2rem',
    fontSize: '1rem',
    color: '#111827',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  toggle: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#2563eb',
    fontWeight: 700,
    cursor: 'pointer',
  },
  optionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.75rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#475569',
    fontWeight: 500,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
  },
  primaryButton: {
    width: '100%',
    padding: '1rem 1.3rem',
    borderRadius: '18px',
    border: 'none',
    background: '#2563eb',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25)',
    marginBottom: '1rem',
  },
  secondaryButton: {
    width: '100%',
    padding: '0.95rem 1.3rem',
    borderRadius: '18px',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#111827',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1.5rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    color: '#64748b',
    fontWeight: 700,
    letterSpacing: '0.12em',
    fontSize: '0.85rem',
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    color: '#475569',
    fontSize: '0.95rem',
  },
  createLink: {
    color: '#2563eb',
    fontWeight: 700,
    textDecoration: 'none',
  },
  trustBlock: {
    marginBottom: '1.75rem',
    padding: '1.4rem 1.5rem',
    borderRadius: '24px',
    background: '#eff6ff',
  },
  trustTitle: {
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  trustText: {
    color: '#475569',
    lineHeight: 1.7,
  },
  benefitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '1rem',
  },
  benefitCard: {
    borderRadius: '22px',
    padding: '1rem 1.1rem',
    background: '#f8fafc',
    boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.12)',
  },
  benefitTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.45rem',
  },
  benefitText: {
    color: '#475569',
    fontSize: '0.93rem',
    lineHeight: 1.6,
  },
  successCard: {
    width: '100%',
    maxWidth: '620px',
    margin: '0 auto',
    padding: '3rem',
    borderRadius: '28px',
    background: 'white',
    boxShadow: '0 30px 90px rgba(15, 23, 42, 0.12)',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '3.5rem',
    marginBottom: '1.5rem',
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#111827',
    marginBottom: '0.75rem',
  },
  successText: {
    color: '#475569',
    lineHeight: 1.8,
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [success, setSuccess] = useState(false);

  const handleSubmit = event => {
    event.preventDefault();
    const nameFromEmail = email ? email.split('@')[0] : 'Customer';
    login({ name: nameFromEmail, email, role: 'customer' });
    setSuccess(true);
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/dashboard'), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [success, navigate]);

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✅</div>
          <div style={styles.successTitle}>Welcome Back!</div>
          <div style={styles.successText}>Redirecting to your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.introCard}>
          <div style={styles.hero}>
            <div style={styles.badge}>Welcome Back</div>
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>
              Sign in to access your bookings, manage services, track requests, and enjoy a seamless service experience with ServeGo.
            </p>
            <div style={styles.trustList}>
              {['Verified Professionals', 'Secure Bookings', 'Fast Service', '24/7 Support'].map(item => (
                <div key={item} style={styles.trustItem}>
                  <span style={styles.trustIcon}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.visual}>
            <img
              style={styles.visualImage}
              src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80"
              alt="Professional service illustration"
            />
          </div>
        </section>

        <section style={styles.formCard}>
          <div style={styles.formHeader}>
            <div style={styles.formTitle}>Sign In</div>
            <div style={styles.formSubtitle}>Access your ServeGo account</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.fieldGroup}>
              <div>
                <label style={styles.label} htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.label} htmlFor="password">Password</label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={styles.input}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={styles.toggle}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={styles.optionsRow}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(prev => !prev)}
                />
                Remember Me
              </label>
              <Link to="/forgot-password" style={styles.link}>Forgot Password?</Link>
            </div>

            <button type="submit" style={styles.primaryButton}>Sign In</button>
            <button type="button" style={styles.secondaryButton}>Continue with Google</button>
          </form>

          <div style={styles.dividerRow}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>OR</span>
            <span style={styles.dividerLine} />
          </div>

          <div style={styles.accountRow}>
            <span>Don't have an account?</span>
            <Link to="/create-account" style={styles.createLink}>Create Account</Link>
          </div>

          <div style={styles.trustBlock}>
            <div style={styles.trustTitle}>🔒 Secure Login</div>
            <div style={styles.trustText}>Your information is protected and encrypted.</div>
          </div>

          <div style={styles.benefitGrid}>
            {['Track Bookings', 'Manage Services', 'Save Favorites', 'View Service History'].map(item => (
              <div key={item} style={styles.benefitCard}>
                <div style={styles.benefitTitle}>{item}</div>
                <div style={styles.benefitText}>Premium access to the tools you need.</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;

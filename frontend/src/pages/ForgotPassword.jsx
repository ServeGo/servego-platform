import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const styles = {
  page: {
    minHeight: '100vh',
    padding: '2rem 1rem',
    background: 'linear-gradient(180deg, #f7f9fc 0%, #eef6ff 100%)',
    display: 'grid',
    placeItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: '1200px',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '2rem',
    alignItems: 'start',
  },
  leftCard: {
    background: 'rgba(255,255,255,0.96)',
    borderRadius: '28px',
    boxShadow: '0 30px 90px rgba(15,23,42,0.08)',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  headline: {
    fontSize: '2.6rem',
    fontWeight: 800,
    color: '#0b1220',
    lineHeight: 1.02,
  },
  subheadline: {
    color: '#475569',
    fontSize: '1.05rem',
    lineHeight: 1.6,
    maxWidth: '620px',
  },
  benefits: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.9rem',
    marginTop: '0.6rem',
  },
  benefit: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    fontWeight: 700,
    color: '#0b1220',
  },
  illustration: {
    borderRadius: '20px',
    overflow: 'hidden',
    minHeight: '360px',
    background: '#e6eefc',
    boxShadow: '0 20px 60px rgba(15,23,42,0.06)',
  },
  illustrationImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  rightCard: {
    background: 'white',
    borderRadius: '28px',
    boxShadow: '0 40px 120px rgba(15,23,42,0.12)',
    padding: '2rem',
    display: 'grid',
    gap: '1rem',
  },
  formTitle: {
    fontSize: '1.9rem',
    fontWeight: 800,
    color: '#0b1220',
  },
  formSubtitle: {
    color: '#475569',
    fontSize: '0.98rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.45rem',
    color: '#334155',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  input: {
    width: '100%',
    padding: '0.95rem 1rem',
    borderRadius: '14px',
    border: '1px solid #d1dbe8',
    outline: 'none',
    fontSize: '1rem',
    color: '#0b1220',
  },
  primaryButton: {
    width: '100%',
    padding: '0.95rem 1.1rem',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg,#2563eb 0%,#4f46e5 100%)',
    color: 'white',
    fontWeight: 800,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 18px 40px rgba(37,99,235,0.18)',
  },
  secondaryButton: {
    width: '100%',
    padding: '0.9rem 1rem',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#0b1220',
    fontWeight: 700,
    fontSize: '0.98rem',
    cursor: 'pointer',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '0.9rem 0',
  },
  line: { flex: 1, height: '1px', background: '#e6eef8' },
  dividerText: { fontSize: '0.85rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.12em' },
  altOptions: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' },
  altButton: {
    padding: '0.65rem 0.85rem',
    borderRadius: '12px',
    border: '1px solid #dbe7ff',
    background: 'white',
    cursor: 'pointer',
    fontWeight: 700,
    color: '#0b1220',
  },
  security: {
    padding: '0.9rem 1rem',
    borderRadius: '12px',
    background: '#f1f8ff',
    color: '#0b1220',
    fontWeight: 700,
  },
  help: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' },
  successCard: {
    width: '100%',
    maxWidth: '720px',
    padding: '2.5rem',
    borderRadius: '24px',
    background: 'white',
    boxShadow: '0 40px 120px rgba(15,23,42,0.12)',
    textAlign: 'center',
  },
  successIcon: { fontSize: '3rem', marginBottom: '1rem' },
  successTitle: { fontSize: '1.6rem', fontWeight: 800, color: '#0b1220' },
  successText: { color: '#475569', marginTop: '0.6rem', lineHeight: 1.6 },
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('email');
  const [sent, setSent] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    if (sent) {
      const timer = setTimeout(() => {
        // auto action if desired
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [sent]);

  const handleSend = e => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
  };

  const handleResend = () => {
    setResendCount(c => c + 1);
    // simulate resend
  };

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.leftCard}>
            <div>
              <div style={styles.headline}>Forgot Your Password?</div>
              <p style={styles.subheadline}>Don't worry. Enter your registered email address and we'll help you regain access to your account.</p>
            </div>
            <div style={styles.benefits}>
              <div style={styles.benefit}><span>✓</span><span>Quick Recovery Process</span></div>
              <div style={styles.benefit}><span>✓</span><span>Secure Verification</span></div>
              <div style={styles.benefit}><span>✓</span><span>Protected Account Access</span></div>
              <div style={styles.benefit}><span>✓</span><span>Fast Password Reset</span></div>
            </div>
            <div style={styles.illustration}>
              <img style={styles.illustrationImg} alt="email sent" src="https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80" />
            </div>
          </div>

          <div style={styles.successCard}>
            <div style={styles.successIcon}>📧</div>
            <div style={styles.successTitle}>Check Your Email</div>
            <div style={styles.successText}>
              We've sent a password reset link to <strong>{email}</strong>.<br />Please check your inbox and follow the instructions to create a new password.
            </div>

            <div style={{ marginTop: '1.4rem', display: 'grid', gap: '0.8rem' }}>
              <button
                onClick={() => window.open('mailto:')}
                style={{ ...styles.primaryButton, padding: '0.9rem 1rem' }}
              >
                Open Email App
              </button>
              <button onClick={handleResend} style={styles.secondaryButton}>Resend Email</button>
              <button onClick={() => navigate('/login')} style={styles.secondaryButton}>Back to Login</button>
            </div>

            <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.95rem' }}>
              Didn't receive the email? Check your spam folder, verify your address, or wait a few minutes before requesting again.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.leftCard}>
          <div>
            <div style={styles.headline}>Forgot Your Password?</div>
            <p style={styles.subheadline}>Don't worry. Enter your registered email address and we'll help you regain access to your account.</p>
          </div>

          <div style={styles.benefits}>
            <div style={styles.benefit}><span>✓</span><span>Quick Recovery Process</span></div>
            <div style={styles.benefit}><span>✓</span><span>Secure Verification</span></div>
            <div style={styles.benefit}><span>✓</span><span>Protected Account Access</span></div>
            <div style={styles.benefit}><span>✓</span><span>Fast Password Reset</span></div>
          </div>

          <div style={styles.illustration}>
            <img style={styles.illustrationImg} alt="password recovery" src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80" />
          </div>
        </div>

        <div style={styles.rightCard}>
          <div>
            <div style={styles.formTitle}>Reset Password</div>
            <div style={styles.formSubtitle}>Enter your email to receive a password reset link.</div>
          </div>

          <form onSubmit={handleSend}>
            <label style={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              placeholder="Enter your registered email address"
              style={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <button type="submit" style={{ ...styles.primaryButton, marginTop: '0.6rem' }}>Send Reset Link</button>
            <button type="button" onClick={() => navigate('/login')} style={{ ...styles.secondaryButton, marginTop: '0.5rem' }}>Back to Login</button>
          </form>

          <div style={styles.dividerRow}>
            <span style={styles.line} />
            <span style={styles.dividerText}>OR</span>
            <span style={styles.line} />
          </div>

          <div>
            <div style={{ fontWeight: 800, color: '#0b1220', marginBottom: '0.6rem' }}>Recover Using:</div>
            <div style={styles.altOptions}>
              <button type="button" style={styles.altButton} onClick={() => setMethod('phone')}>Phone Number</button>
              <button type="button" style={styles.altButton} onClick={() => setMethod('email')}>Email Address</button>
            </div>
          </div>

          <div style={styles.security}>🔒 Secure Password Recovery — instructions sent only to your registered account.</div>

          <div style={styles.help}>
            <div>
              <div style={{ fontWeight: 800, color: '#0b1220' }}>Need Help?</div>
              <div style={{ color: '#475569', marginTop: '0.35rem' }}>
                <a href="mailto:support@servego.example" style={{ color: '#2563eb', fontWeight: 700 }}>Contact Support</a>
                <div style={{ marginTop: '0.35rem' }}><Link to="/faq" style={{ color: '#2563eb', fontWeight: 700 }}>FAQ</Link></div>
              </div>
            </div>
            <div style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Additional security measures keep your account safe during recovery.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

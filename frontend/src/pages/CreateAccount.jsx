import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];

const styles = {
  page: {
    minHeight: '100vh',
    padding: '2rem 1rem',
    background: 'linear-gradient(180deg, #f7f8fb 0%, #eef5ff 100%)',
    display: 'grid',
    placeItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: '1280px',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: '2rem',
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
  },
  infoCard: {
    background: 'rgba(255,255,255,0.88)',
    borderRadius: '32px',
    boxShadow: '0 40px 120px rgba(15, 23, 42, 0.1)',
    padding: '3rem',
    display: 'grid',
    gap: '1.8rem',
  },
  headline: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.02,
    marginBottom: '0.8rem',
  },
  subheadline: {
    fontSize: '1.05rem',
    maxWidth: '560px',
    color: '#334155',
    lineHeight: 1.75,
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '1rem',
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.85rem',
    color: '#0f172a',
    fontWeight: 600,
    fontSize: '0.97rem',
  },
  benefitIcon: {
    marginTop: '0.2rem',
    color: '#2563eb',
    fontSize: '1.1rem',
  },
  illustration: {
    width: '100%',
    borderRadius: '28px',
    overflow: 'hidden',
    minHeight: '420px',
    background: '#e2e8f0',
    boxShadow: '0 30px 80px rgba(15, 23, 42, 0.08)',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  formCard: {
    background: 'white',
    borderRadius: '32px',
    boxShadow: '0 40px 120px rgba(15, 23, 42, 0.12)',
    padding: '2.5rem',
    display: 'grid',
    gap: '1.75rem',
  },
  formHeader: {
    display: 'grid',
    gap: '0.5rem',
  },
  formTitle: {
    fontSize: '2.25rem',
    fontWeight: 800,
    color: '#111827',
  },
  formSubtitle: {
    color: '#475569',
    lineHeight: 1.7,
  },
  sectionTitle: {
    fontSize: '0.98rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '0.75rem',
  },
  fieldGrid: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#334155',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  input: {
    width: '100%',
    borderRadius: '18px',
    border: '1px solid #cbd5e1',
    padding: '1rem 1.1rem',
    fontSize: '1rem',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  textarea: {
    minHeight: '100px',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    borderRadius: '18px',
    border: '1px solid #cbd5e1',
    padding: '1rem 1.1rem',
    fontSize: '1rem',
    color: '#0f172a',
    background: 'white',
    outline: 'none',
  },
  passwordWrapper: {
    position: 'relative',
  },
  toggleButton: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    fontWeight: 700,
    cursor: 'pointer',
  },
  strengthBar: {
    height: '10px',
    borderRadius: '999px',
    background: '#e2e8f0',
    overflow: 'hidden',
    marginTop: '0.75rem',
  },
  strengthFill: strength => ({
    width: `${strength}%`,
    height: '100%',
    borderRadius: '999px',
    background: strength < 40 ? '#f97316' : strength < 70 ? '#fbbf24' : '#16a34a',
    transition: 'width 0.3s ease',
  }),
  strengthLabel: {
    marginTop: '0.5rem',
    fontSize: '0.88rem',
    color: '#475569',
    fontWeight: 600,
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.75rem',
  },
  categoryItem: selected => ({
    borderRadius: '18px',
    padding: '1rem 1rem',
    border: `1px solid ${selected ? '#2563eb' : '#cbd5e1'}`,
    background: selected ? 'rgba(37, 99, 235, 0.08)' : 'white',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
  checkboxRow: {
    display: 'grid',
    gap: '0.9rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#334155',
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  primaryButton: {
    width: '100%',
    borderRadius: '18px',
    padding: '1rem 1.2rem',
    border: 'none',
    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.24)',
  },
  secondaryButton: {
    width: '100%',
    borderRadius: '18px',
    padding: '1rem 1.2rem',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#0f172a',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '1rem 0',
  },
  line: {
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
  loginLine: {
    textAlign: 'center',
    color: '#475569',
    fontSize: '0.95rem',
  },
  signInLink: {
    color: '#2563eb',
    fontWeight: 700,
    textDecoration: 'none',
  },
  trustBanner: {
    padding: '1.25rem 1.5rem',
    borderRadius: '22px',
    background: '#eff6ff',
    color: '#0f172a',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  benefitsList: {
    display: 'grid',
    gap: '1rem',
  },
  benefitCard: {
    borderRadius: '24px',
    padding: '1.15rem 1.2rem',
    background: '#f8fafc',
    boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.12)',
  },
  benefitCardTitle: {
    fontSize: '0.98rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.45rem',
  },
  benefitCardText: {
    color: '#475569',
    fontSize: '0.92rem',
    lineHeight: 1.6,
  },
  successCard: {
    width: '100%',
    maxWidth: '720px',
    padding: '3rem',
    borderRadius: '32px',
    background: 'white',
    boxShadow: '0 40px 120px rgba(15, 23, 42, 0.12)',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '3.5rem',
    marginBottom: '1.2rem',
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
  '@media': {
    small: {
      wrapper: {
        gridTemplateColumns: '1fr',
      },
      fieldGrid: {
        gridTemplateColumns: '1fr',
      },
      benefitsGrid: {
        gridTemplateColumns: '1fr',
      },
      categoryGrid: {
        gridTemplateColumns: '1fr',
      },
    },
  },
};

const categories = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'AC Repair',
  'Cleaning',
  'Painting',
  'Appliance Repair',
  'Pest Control',
  'Water Purifier Service',
  'Home Maintenance',
];

const CreateAccount = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'Male',
    country: '',
    state: '',
    city: '',
    pincode: '',
    address: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
    agreePrivacy: false,
    promo: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(['Electrician', 'Cleaning']);
  const [submitted, setSubmitted] = useState(false);

  const passwordStrength = useMemo(() => {
    const value = form.password;
    let score = 0;
    if (value.length >= 8) score += 20;
    if (/[A-Z]/.test(value)) score += 20;
    if (/[a-z]/.test(value)) score += 20;
    if (/[0-9]/.test(value)) score += 20;
    if (/[^A-Za-z0-9]/.test(value)) score += 20;
    return score;
  }, [form.password]);

  const passwordLabel = strengthLabels[Math.min(4, Math.floor(passwordStrength / 20))];

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => navigate('/dashboard'), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [submitted, navigate]);

  const toggleCategory = category => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(item => item !== category)
        : [...prev, category]
    );
  };

  const handleChange = key => event => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    const name = form.firstName || form.username || (form.email ? form.email.split('@')[0] : 'Customer');
    localStorage.setItem('user', JSON.stringify({ name, email: form.email }));
    // notify navbar and other components
    window.dispatchEvent(new Event('userChange'));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>🎉</div>
          <div style={styles.successTitle}>Account Created Successfully!</div>
          <div style={styles.successText}>Welcome to ServeGo. Redirecting to your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.column}>
          <div style={styles.infoCard}>
            <div>
              <div style={styles.headline}>Join ServeGo Today</div>
              <p style={styles.subheadline}>
                Create your account and get access to trusted professionals, easy bookings, exclusive offers, and seamless service management.
              </p>
            </div>

            <div style={styles.benefitsGrid}>
              {[
                'Book Services Instantly',
                'Verified Professionals',
                'Secure Payments',
                'Real-Time Booking Updates',
                'Service History Tracking',
                '24/7 Customer Support',
              ].map(benefit => (
                <div key={benefit} style={styles.benefitItem}>
                  <span style={styles.benefitIcon}>✓</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.illustration}>
            <img
              style={styles.illustrationImage}
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
              alt="Premium service registration illustration"
            />
          </div>
        </div>

        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <div style={styles.formTitle}>Create Account</div>
            <div style={styles.formSubtitle}>Get started with ServeGo in less than a minute</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.sectionTitle}>Personal Information</div>
            <div style={styles.fieldGrid}>
              <div>
                <label style={styles.label} htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  style={styles.input}
                  value={form.firstName}
                  onChange={handleChange('firstName')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  style={styles.input}
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  style={styles.input}
                  value={form.phone}
                  onChange={handleChange('phone')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  style={styles.input}
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="dob">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  style={styles.input}
                  value={form.dob}
                  onChange={handleChange('dob')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="gender">Gender</label>
                <select id="gender" style={styles.select} value={form.gender} onChange={handleChange('gender')}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div style={styles.sectionTitle}>Address Information</div>
            <div style={styles.fieldGrid}>
              <div>
                <label style={styles.label} htmlFor="country">Country</label>
                <input
                  id="country"
                  style={styles.input}
                  value={form.country}
                  onChange={handleChange('country')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="state">State</label>
                <input
                  id="state"
                  style={styles.input}
                  value={form.state}
                  onChange={handleChange('state')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="city">City</label>
                <input
                  id="city"
                  style={styles.input}
                  value={form.city}
                  onChange={handleChange('city')}
                  required
                />
              </div>
              <div>
                <label style={styles.label} htmlFor="pincode">Pincode</label>
                <input
                  id="pincode"
                  style={styles.input}
                  value={form.pincode}
                  onChange={handleChange('pincode')}
                  required
                />
              </div>
              <div style={styles.fullWidth}>
                <label style={styles.label} htmlFor="address">Full Address</label>
                <textarea
                  id="address"
                  style={{ ...styles.input, ...styles.textarea }}
                  value={form.address}
                  onChange={handleChange('address')}
                  required
                />
              </div>
            </div>

            <div style={styles.sectionTitle}>Account Information</div>
            <div style={styles.fieldGrid}>
              <div style={styles.fullWidth}>
                <label style={styles.label} htmlFor="username">Username</label>
                <input
                  id="username"
                  style={styles.input}
                  value={form.username}
                  onChange={handleChange('username')}
                  required
                />
              </div>
              <div style={styles.passwordWrapper}>
                <label style={styles.label} htmlFor="password">Password</label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  style={styles.input}
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                />
                <button type="button" onClick={() => setShowPassword(prev => !prev)} style={styles.toggleButton}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                <div style={styles.strengthBar}>
                  <div style={styles.strengthFill(passwordStrength)} />
                </div>
                <div style={styles.strengthLabel}>{passwordLabel}</div>
              </div>
              <div style={styles.passwordWrapper}>
                <label style={styles.label} htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  style={styles.input}
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  style={styles.toggleButton}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={styles.sectionTitle}>Preferred Service Categories</div>
            <div style={styles.categoryGrid}>
              {categories.map(category => {
                const selected = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    style={styles.categoryItem(selected)}
                  >
                    <span>{category}</span>
                  </button>
                );
              })}
            </div>

            <div style={styles.checkboxRow}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={form.agreeTerms} onChange={handleChange('agreeTerms')} />
                I agree to the Terms & Conditions
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={form.agreePrivacy} onChange={handleChange('agreePrivacy')} />
                I agree to the Privacy Policy
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={form.promo} onChange={handleChange('promo')} />
                Receive promotional offers and updates
              </label>
            </div>

            <button type="submit" style={styles.primaryButton}>Create Account</button>
            <button type="button" style={styles.secondaryButton}>Continue with Google</button>
          </form>

          <div style={styles.dividerRow}>
            <span style={styles.line} />
            <span style={styles.dividerText}>OR</span>
            <span style={styles.line} />
          </div>

          <div style={styles.loginLine}>
            Already have an account? <Link to="/login" style={styles.signInLink}>Sign In</Link>
          </div>

          <div style={styles.trustBanner}>🔒 Your information is secure and protected.</div>

          <div style={styles.benefitsList}>
            {[
              'Track Bookings',
              'Manage Services',
              'Save Favorite Professionals',
              'Access Service History',
              'Receive Exclusive Offers',
            ].map(item => (
              <div key={item} style={styles.benefitCard}>
                <div style={styles.benefitCardTitle}>{item}</div>
                <div style={styles.benefitCardText}>A premium benefit designed to keep your home services running smoothly.</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;

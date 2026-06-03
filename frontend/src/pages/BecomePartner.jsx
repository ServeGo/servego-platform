import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const FORM_KEY = 'mock_provider_applications';

function safeParseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function BecomePartnerPage() {
  const formRef = useRef(null);
  const location = useLocation();

  const navbarHeight = 72;
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [statusMessage, setStatusMessage] = useState('');

  const scrollToFormWithOffset = () => {
    const el = formRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetTop = rect.top + scrollTop - navbarHeight - 10;

    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  useEffect(() => {
    // When route changes, keep things deterministic.
    setStatus('idle');
    setStatusMessage('');
  }, [location.pathname]);

  const heroStats = useMemo(
    () => [
      { value: '2,000+', label: 'Active Partners' },
      { value: '4.8★', label: 'Average Rating' },
      { value: '10,000+', label: 'Happy Customers' },
    ],
    []
  );

  const whyJoin = useMemo(
    () => [
      {
        title: 'Higher Earnings',
        desc: 'Competitive commissions and premium job matching',
        accent: '#f97316',
      },
      {
        title: 'Flexible Working Hours',
        desc: 'Work when you want, pick the jobs you like',
        accent: '#06b6d4',
      },
      {
        title: 'Professional Growth',
        desc: 'Training, upskilling and rating-based rewards',
        accent: '#8b5cf6',
      },
    ],
    []
  );

  const partnerCategories = useMemo(
    () => [
      'Electrician',
      'Plumber',
      'Carpenter',
      'AC Technician',
      'Cleaner',
      'Painter',
      'Appliance Repair',
      'Pest Control',
      'Water Purifier Service',
      'Home Maintenance',
    ],
    []
  );

  const howItWorks = useMemo(
    () => [
      { step: '01', title: 'Create Profile', desc: 'Sign up and list your services' },
      { step: '02', title: 'Complete Verification', desc: 'ID & background checks' },
      {
        step: '03',
        title: 'Receive Service Requests',
        desc: 'Get matched with local customers',
      },
      { step: '04', title: 'Complete Jobs', desc: 'Deliver quality service and earn ratings' },
      { step: '05', title: 'Get Paid', desc: 'Fast payouts and incentives' },
    ],
    []
  );

  const earnings = useMemo(
    () => [
      { title: 'Electrician', range: '₹25,000 – ₹60,000 / month' },
      { title: 'Plumber', range: '₹20,000 – ₹55,000 / month' },
      { title: 'AC Technician', range: '₹30,000 – ₹70,000 / month' },
      { title: 'Cleaner', range: '₹15,000 – ₹40,000 / month' },
      { title: 'Carpenter', range: '₹25,000 – ₹65,000 / month' },
    ],
    []
  );

  const testimonials = useMemo(
    () => [
      {
        name: 'Ravi Kumar',
        prof: 'Electrician',
        rating: 5,
        image: 'https://randomuser.me/api/portraits/men/45.jpg',
        story:
          'I doubled my monthly income within 3 months. ServeGo brings quality leads and on-time payments.',
      },
      {
        name: 'Sunita Rao',
        prof: 'Cleaner',
        rating: 5,
        image: 'https://randomuser.me/api/portraits/women/47.jpg',
        story: 'Flexible hours helped me balance family and work while increasing earnings.',
      },
      {
        name: 'Amit Shah',
        prof: 'AC Technician',
        rating: 5,
        image: 'https://randomuser.me/api/portraits/men/46.jpg',
        story: 'Customer demand is consistent and support helped resolve disputes quickly.',
      },
    ],
    []
  );

  const faqs = useMemo(
    () => [
      {
        q: 'How do I join ServeGo?',
        a: 'Sign up with your details, upload ID proof and profile photo, complete verification and start receiving service requests.',
      },
      {
        q: 'How long does verification take?',
        a: 'Verification typically completes within 24–72 hours depending on document clarity and background checks.',
      },
      {
        q: 'When do I receive payments?',
        a: 'Payments are processed after job completion and quality checks — typically within 3 business days to your registered payout method.',
      },
      {
        q: 'What documents are required?',
        a: 'A government ID, address proof, and a clear profile photo are required for verification.',
      },
      {
        q: 'Can I work part-time?',
        a: 'Yes — you can choose jobs that fit your schedule and work part-time or full-time.',
      },
    ],
    []
  );

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setStatus('sending');
      setStatusMessage('Submitting application (frontend-only)...');

      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());

      const existing = safeParseJSON(localStorage.getItem(FORM_KEY), []);

      const record = {
        id: Date.now(),
        data: payload,
        submittedAt: new Date().toISOString(),
      };

      localStorage.setItem(FORM_KEY, JSON.stringify([...existing, record]));

      setStatus('sent');
      setStatusMessage('Application saved locally. Our team will reach out soon.');
      e.target.reset();
    } catch (err) {
      setStatus('error');
      setStatusMessage(err?.message || 'Local submission failed');
    }
  }

  return (
    <main className="bp-page" aria-labelledby="bp-hero-title" data-page="become-partner">
      <section className="bp-hero" id="bp-hero">
        <div className="bp-hero-inner">
          <div className="bp-hero-copy">
            <h1 id="bp-hero-title">Grow Your Service Business With ServeGo</h1>
            <p>
              Join thousands of skilled professionals and receive more bookings, more customers, and higher earnings every
              month.
            </p>

            <div className="bp-hero-actions">
              <button onClick={scrollToFormWithOffset} type="button" className="btn-primary">
                Apply Now
              </button>
              <button className="btn-secondary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Learn More
              </button>
            </div>

            <ul className="bp-grid-3" style={{ listStyle: 'none', padding: 0, marginTop: 28 }}>
              {heroStats.map((item) => (
                <li key={item.label} style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 14, color: '#64748b' }}>{item.value}</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{item.label}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bp-hero-visual">
            <div className="bp-hero-visual-card bp-hero-visual-content">
              <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="0" y="0" width="220" height="140" rx="18" fill="#fff" />
                <g transform="translate(12,10)">
                  <circle cx="30" cy="50" r="18" fill="#f97316" />
                  <rect x="60" y="30" width="110" height="12" rx="6" fill="#e6eefc" />
                  <rect x="60" y="52" width="80" height="12" rx="6" fill="#e6eefc" />
                </g>
              </svg>

              <div className="bp-hero-visual-badge" style={{ border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', borderRadius: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>🔧 Professional</span>
                <span>⭐ 4.8+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bp-why bp-section">
        <div className="page-container">
          <h2 className="page-title" style={{ fontSize: 28 }}>
            Why Join ServeGo
          </h2>
          <p className="page-description">More bookings, better matching, and support that stays with you.</p>

          <div className="bp-grid-3" style={{ marginTop: 20 }}>
            {whyJoin.map((item) => (
              <div key={item.title} className="bp-feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: item.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                    }}
                  >
                    {item.title[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{item.title}</div>
                    <div style={{ marginTop: 6, color: '#64748b' }}>{item.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-how bp-section" style={{ background: 'linear-gradient(180deg,#fff,#f8fafc)' }}>
        <div className="page-container" style={{ textAlign: 'center', maxWidth: 960 }}>
          <h2 className="page-title" style={{ fontSize: 28 }}>
            How It Works
          </h2>
          <p className="page-description">Simple, transparent process so you start earning quickly.</p>

          <div className="bp-grid-3" style={{ marginTop: 24 }}>
            {howItWorks.map((s) => (
              <div key={s.step} className="bp-feature-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: '#111827',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                    }}
                  >
                    {s.step}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{s.title}</div>
                    <div style={{ marginTop: 6, color: '#64748b' }}>{s.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-categories bp-section">
        <div className="page-container">
          <h2 className="page-title" style={{ fontSize: 28 }}>
            Partner Categories
          </h2>
          <p className="page-description">Choose the category that matches your expertise.</p>

          <div className="bp-grid-3" style={{ marginTop: 20 }}>
            {partnerCategories.map((cat) => {
              const initials = cat
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .slice(0, 2)
                .join('');

              return (
                <div
                  key={cat}
                  className="bp-feature-card"
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: '#eef2ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#3730a3',
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{cat}</div>
                    <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>High demand in urban areas</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bp-earnings bp-section" style={{ background: 'linear-gradient(180deg,#ffffff,#f8fafc)' }}>
        <div className="page-container" style={{ maxWidth: 980 }}>
          <h2 className="page-title" style={{ fontSize: 28 }}>
            How Much Can You Earn?
          </h2>
          <p className="page-description">Estimated monthly earnings based on average bookings and city demand.</p>

          <div className="bp-grid-3" style={{ marginTop: 20 }}>
            {earnings.map((e) => (
              <div key={e.title} className="bp-earnings-card">
                <div style={{ fontWeight: 800, fontSize: 16 }}>{e.title}</div>
                <div style={{ marginTop: 8, color: '#0f172a', fontWeight: 800 }}>{e.range}</div>
                <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>
                  Top partners earn more with high ratings and availability.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-testimonials bp-section">
        <div className="page-container" style={{ maxWidth: 1100 }}>
          <h2 className="page-title">Success Stories</h2>
          <p className="page-description">Real partners, real growth.</p>

          <div className="bp-grid-3" style={{ marginTop: 20 }}>
            {testimonials.map((t) => (
              <figure key={t.name} className="bp-testimonial-card">
                <img src={t.image} alt={t.name} className="bp-testimonial-avatar" />
                <figcaption>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>{t.name}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{t.prof}</div>
                  </div>
                  <div style={{ marginTop: 8, color: '#f59e0b', fontWeight: 800 }}>{'★'.repeat(t.rating)}</div>
                  <blockquote style={{ marginTop: 10, color: '#475569' }}>{t.story}</blockquote>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-apply bp-section" style={{ background: 'linear-gradient(135deg,#eef2ff,#ffffff)' }}>
        <div className="bp-apply-grid page-container" style={{ maxWidth: 1000 }}>
          <div>
            <h2 className="page-title" style={{ fontSize: 28 }}>
              Become a ServeGo Partner
            </h2>
            <p className="page-description">
              Fill out the application and our partner support team will reach out within 24–48 hours.
            </p>

            <form
              id="apply"
              ref={formRef}
              onSubmit={handleSubmit}
              className="bp-form-grid"
              style={{ marginTop: 18 }}
            >
              <div className="bp-form-row">
                <label className="bp-form-control">
                  <span>Full Name</span>
                  <input name="name" type="text" required placeholder="Your full name" className="bp-form-field" />
                </label>
                <label className="bp-form-control">
                  <span>Phone Number</span>
                  <input name="phone" type="tel" required placeholder="+91 98765 43210" className="bp-form-field" />
                </label>
              </div>

              <div className="bp-form-row">
                <label className="bp-form-control">
                  <span>Email Address</span>
                  <input name="email" type="email" required placeholder="you@example.com" className="bp-form-field" />
                </label>
                <label className="bp-form-control">
                  <span>Service Category</span>
                  <select name="category" required className="bp-form-field">
                    <option>Electrician</option>
                    <option>Plumber</option>
                    <option>Carpenter</option>
                    <option>AC Technician</option>
                    <option>Cleaner</option>
                    <option>Painter</option>
                    <option>Appliance Repair</option>
                    <option>Pest Control</option>
                    <option>Water Purifier Service</option>
                    <option>Home Maintenance</option>
                  </select>
                </label>
              </div>

              <div className="bp-form-row">
                <label className="bp-form-control">
                  <span>Experience (years)</span>
                  <input name="experience" type="number" min="0" placeholder="e.g., 3" className="bp-form-field" />
                </label>
                <label className="bp-form-control">
                  <span>City</span>
                  <input name="city" type="text" placeholder="City" className="bp-form-field" />
                </label>
              </div>

              <label className="bp-form-control">
                <span>Address</span>
                <input name="address" type="text" placeholder="Full address" className="bp-form-field" />
              </label>

              <div className="bp-form-row">
                <label className="bp-form-control">
                  <span>Upload ID Proof</span>
                  <input name="idProof" type="file" accept=".pdf,.jpg,.png" className="bp-form-field" />
                </label>
                <label className="bp-form-control">
                  <span>Upload Profile Photo</span>
                  <input name="profilePhoto" type="file" accept="image/*" className="bp-form-field" />
                </label>
              </div>

              <label className="bp-form-control" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input name="agree" type="checkbox" required style={{ width: 18, height: 18 }} />
                <span style={{ color: '#475569' }}>I agree to the terms and conditions and background verification.</span>
              </label>

              <div style={{ marginTop: 12 }}>
                <button
                  disabled={status === 'sending'}
                  type="submit"
                  className="btn-apply"
                  style={{
                    background: '#111827',
                    color: '#fff',
                    padding: '12px 20px',
                    borderRadius: 10,
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {status === 'sending' ? 'Sending…' : 'Apply Now'}
                </button>
              </div>

              {status !== 'idle' && (
                <div aria-live="polite" style={{ marginTop: 8, color: status === 'sent' ? '#065f46' : '#b91c1c' }}>
                  {statusMessage}
                </div>
              )}
            </form>
          </div>

          <aside className="bp-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 800 }}>Need help?</div>
            <p className="page-description">
              Call Partner Support: <strong style={{ color: '#0f172a' }}>+91 12345 67890</strong>
            </p>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Documents to keep ready:</div>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                <li style={{ color: '#475569' }}>Government ID (Aadhaar/Passport/Driver’s License)</li>
                <li style={{ color: '#475569' }}>Address proof</li>
                <li style={{ color: '#475569' }}>Profile photo</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="bp-faq bp-section">
        <div className="page-container" style={{ maxWidth: 900 }}>
          <h2 className="page-title">Frequently Asked Questions</h2>
          <div className="bp-apply-grid" style={{ marginTop: 16 }}>
            {faqs.map((item) => (
              <details key={item.q} className="bp-faq-item">
                <summary>{item.q}</summary>
                <div style={{ marginTop: 8, color: '#64748b' }}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bp-cta-final bp-section" style={{ background: 'linear-gradient(135deg,#111827,#0f172a)', color: '#fff' }}>
        <div className="bp-cta-final-inner page-container" style={{ maxWidth: 1100 }}>
          <div>
            <h2 style={{ fontSize: 30, margin: 0, fontWeight: 900 }}>Ready To Grow Your Business?</h2>
            <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>
              Join ServeGo today and start receiving customer bookings.
            </p>
          </div>

          <div className="bp-cta-actions">
            <button onClick={scrollToFormWithOffset} type="button" className="btn-primary" style={{ background: '#f97316', color: '#fff' }}>
              Become A Partner
            </button>
            <button className="button-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.12)' }}>
              Contact Support
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}


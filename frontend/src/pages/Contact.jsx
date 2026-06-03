import React, { useState } from 'react';
import PageShell from '../components/PageShell';

const contactInfo = [
  {
    id: 1,
    icon: '📧',
    title: 'Email Support',
    label: 'Customer Support',
    value: 'support@servego.com',
  },
  {
    id: 2,
    icon: '👥',
    title: 'Partner Support',
    label: 'For Service Partners',
    value: 'partners@servego.com',
  },
  {
    id: 3,
    icon: '📞',
    title: 'Call Us',
    label: 'Phone Support',
    value: '+91 12345 67890',
  },
  {
    id: 4,
    icon: '🕐',
    title: 'Office Hours',
    label: 'Available',
    value: 'Mon – Sat, 09:00 – 19:00',
  },
];

const faqItems = [
  { id: 1, question: 'How do I contact support?', answer: 'Use our contact form or email us directly. Response time is typically within 24 hours.' },
  { id: 2, question: 'What are your office hours?', answer: 'We are available Monday to Saturday, 09:00 AM to 07:00 PM IST.' },
  { id: 3, question: 'Can I schedule a callback?', answer: 'Yes, submit your details via the contact form and mention your preferred time.' },
  { id: 4, question: 'How can I become a service partner?', answer: 'Visit our Become Partner page to apply. We review applications within 3-5 business days.' },
];

const Contact = () => {
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormState({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <PageShell
      title="Contact Us"
      description="Have a question? We're here to help. Reach out to our team anytime."
    >
      {submitted ? (
        <div className="page-card" style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '3rem 2rem',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(16, 185, 129, 0.15)',
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>✓ Message Sent Successfully!</h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.6, opacity: 0.95 }}>
            Thank you for reaching out. Our support team will review your message and get back to you within 24 hours.
          </p>
        </div>
      ) : (
        <>
          {/* Contact Info Cards */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem', color: '#0f172a' }}>Get in Touch</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
            }}>
              {contactInfo.map(info => (
                <div key={info.id} className="page-card" style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{info.icon}</div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{info.label}</h4>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{info.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Contact Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}>
            {/* Form */}
            <div className="page-card" style={{
              padding: '2rem',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.08)',
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a' }}>Send Us a Message</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Full Name</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Your name"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.95rem',
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Email Address</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.95rem',
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Subject</label>
                  <input
                    type="text"
                    value={formState.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="How can we help?"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.95rem',
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Message</label>
                  <textarea
                    value={formState.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    placeholder="Tell us more about your request..."
                    rows={5}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.95rem',
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <button type="submit" className="button-primary" style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}>Send Message</button>
              </form>
            </div>

            {/* FAQ */}
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', color: '#0f172a' }}>Frequently Asked Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {faqItems.map(item => (
                  <div key={item.id} className="page-card" style={{
                    padding: '1.2rem',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{item.question}</h4>
                      <span style={{ fontSize: '1.2rem', color: '#2563eb', flexShrink: 0 }}>{expandedFaq === item.id ? '−' : '+'}</span>
                    </div>
                    {expandedFaq === item.id && (
                      <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.8rem', marginBottom: 0 }}>{item.answer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
};

export default Contact;

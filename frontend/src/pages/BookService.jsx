import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const services = [
  { id: 1, icon: '🔧', label: 'Electrician' },
  { id: 2, icon: '🚿', label: 'Plumber' },
  { id: 3, icon: '🪚', label: 'Carpenter' },
  { id: 4, icon: '❄️', label: 'AC Repair' },
  { id: 5, icon: '🧹', label: 'Cleaning' },
  { id: 6, icon: '🎨', label: 'Painting' },
  { id: 7, icon: '🔧', label: 'Appliance Repair' },
  { id: 8, icon: '🪳', label: 'Pest Control' },
];

const timeSlots = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'];

const professionals = [
  {
    id: 1,
    name: 'Ramesh',
    service: 'Electrician',
    rating: 5.0,
    jobs: 150,
    price: 499,
  },
  {
    id: 2,
    name: 'Suresh',
    service: 'Electrician',
    rating: 5.0,
    jobs: 210,
    price: 529,
  },
  {
    id: 3,
    name: 'Anjali',
    service: 'Cleaner',
    rating: 4.9,
    jobs: 185,
    price: 399,
  },
];

const steps = [
  'Select Service',
  'Enter Details',
  'Pick Date & Time',
  'Enter Address',
  'Choose Professional',
  'Review & Confirm',
];

const initialAddress = {
  full: '',
  house: '',
  street: '',
  landmark: '',
  city: '',
  pincode: '',
};

const styles = {
  page: {
    padding: '2.5rem 1.25rem',
    background: '#f4f7fb',
    minHeight: '100vh',
  },
  wrapper: {
    maxWidth: '1040px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.65rem 1rem',
    borderRadius: '9999px',
    background: '#2563eb',
    color: 'white',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2.35rem',
    color: '#111827',
    lineHeight: 1.05,
    marginBottom: '1rem',
  },
  description: {
    color: '#52606d',
    fontSize: '1rem',
    lineHeight: 1.8,
  },
  progress: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '0.75rem',
    margin: '2rem 0',
  },
  stepBadge: active => ({
    padding: '0.9rem 0.85rem',
    borderRadius: '16px',
    background: active ? '#2563eb' : '#e5e7eb',
    color: active ? 'white' : '#64748b',
    fontSize: '0.78rem',
    fontWeight: 700,
    textAlign: 'center',
  }),
  card: {
    background: 'white',
    borderRadius: '28px',
    padding: '2rem',
    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)',
  },
  sectionTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '1.25rem',
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  serviceButton: selected => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.1rem',
    borderRadius: '20px',
    border: selected ? '2px solid #2563eb' : '1px solid #d1d5db',
    background: selected ? 'rgba(59, 130, 246, 0.1)' : 'white',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  }),
  iconBox: {
    width: '54px',
    height: '54px',
    borderRadius: '18px',
    background: '#eff6ff',
    display: 'grid',
    placeItems: 'center',
    fontSize: '1.45rem',
  },
  label: {
    fontSize: '0.98rem',
    fontWeight: 700,
    color: '#111827',
  },
  input: {
    width: '100%',
    padding: '1rem 1.1rem',
    borderRadius: '18px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    color: '#111827',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: '140px',
    padding: '1rem 1.1rem',
    borderRadius: '18px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    color: '#111827',
    outline: 'none',
    resize: 'vertical',
  },
  splitRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    marginTop: '1.75rem',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '1rem 1.6rem',
    borderRadius: '16px',
    border: 'none',
    background: '#2563eb',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '1rem 1.6rem',
    borderRadius: '16px',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#334155',
    fontWeight: 700,
    cursor: 'pointer',
  },
  profileGrid: {
    display: 'grid',
    gap: '1rem',
  },
  profileCard: selected => ({
    display: 'block',
    padding: '1.5rem',
    borderRadius: '22px',
    border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
    background: 'white',
    cursor: 'pointer',
  }),
  profileTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  badgeSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.45rem 0.75rem',
    borderRadius: '9999px',
    background: '#eef2ff',
    color: '#4338ca',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  metaList: {
    display: 'grid',
    gap: '0.85rem',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#475569',
  },
  confirmation: {
    padding: '2.5rem',
    borderRadius: '28px',
    background: 'white',
    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.08)',
    textAlign: 'center',
    marginTop: '2rem',
  },
  confirmationIcon: {
    fontSize: '3.5rem',
    marginBottom: '1.25rem',
  },
  confirmationTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '1rem',
    color: '#111827',
  },
  confirmationText: {
    color: '#475569',
    lineHeight: 1.8,
    maxWidth: '640px',
    margin: '0 auto 1.75rem',
  },
  confirmationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
  },
  confirmationCard: {
    padding: '1.25rem',
    borderRadius: '20px',
    background: '#f8fafc',
  },
  confirmationLabel: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '0.4rem',
  },
  confirmationValue: {
    fontWeight: 700,
    color: '#111827',
  },
};

const BookService = () => {
  const [step, setStep] = useState(1);
  const [service, setService] = useState('AC Repair');
  const [location, setLocation] = useState('Hyderabad');
  const [requirement, setRequirement] = useState('Need AC servicing for 2-ton split AC.');
  const [date, setDate] = useState('2026-06-15');
  const [time, setTime] = useState('11:00 AM');
  const [address, setAddress] = useState(initialAddress);
  const [selectedPro, setSelectedPro] = useState(professionals[0].id);
  const [confirmed, setConfirmed] = useState(false);

  const navigate = useNavigate();

  const selectedProfessional = useMemo(
    () => professionals.find(pro => pro.id === selectedPro) || professionals[0],
    [selectedPro],
  );

  const estimatedPrice = selectedProfessional.price;
  const platformFee = Math.round(estimatedPrice * 0.1);
  const totalPrice = estimatedPrice + platformFee;

  const nextStep = () => setStep(prev => Math.min(prev + 1, steps.length));
  const previousStep = () => setStep(prev => Math.max(prev - 1, 1));
  const detectLocation = () => setLocation('Hyderabad');

  const confirmBooking = () => {
    setConfirmed(true);
    setTimeout(() => navigate('/'), 800);
  };

  const handleField = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const summaryDate = new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div style={styles.badge}>Book a Service</div>
          <h1 style={styles.title}>Fast, clean booking for home services.</h1>
          <p style={styles.description}>
            Complete your service request step by step. The flow is simple, guided, and distraction-free.
          </p>
        </header>

        <div style={styles.progress}>
          {steps.map((label, index) => (
            <div key={label} style={styles.stepBadge(index + 1 === step)}>
              {index + 1}. {label}
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Step {step} · {steps[step - 1]}</div>

          {step === 1 && (
            <div>
              <p style={styles.description}>Choose the service category that best fits your need.</p>
              <div style={styles.serviceGrid}>
                {services.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setService(item.label)}
                    style={styles.serviceButton(item.label === service)}
                  >
                    <div style={styles.iconBox}>{item.icon}</div>
                    <span style={styles.label}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>Your location</label>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr auto' }}>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    style={styles.input}
                    placeholder="Hyderabad"
                  />
                  <button type="button" onClick={detectLocation} style={styles.secondaryButton}>
                    Detect location
                  </button>
                </div>
              </div>
              <div>
                <label style={styles.label}>Describe your requirement</label>
                <textarea
                  style={styles.textarea}
                  value={requirement}
                  onChange={e => setRequirement(e.target.value)}
                  placeholder="Need AC servicing for 2-ton split AC."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>Choose a date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Choose a time slot</label>
                <div style={styles.serviceGrid}>
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      style={styles.serviceButton(slot === time)}
                    >
                      <span style={styles.label}>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={styles.label}>Full address</label>
              <input
                type="text"
                value={address.full}
                onChange={e => handleField('full', e.target.value)}
                style={styles.input}
                placeholder="Apartment, floor, building name"
              />
              <div style={styles.splitRow}>
                <div>
                  <label style={styles.label}>House number</label>
                  <input
                    type="text"
                    value={address.house}
                    onChange={e => handleField('house', e.target.value)}
                    style={styles.input}
                    placeholder="12A"
                  />
                </div>
                <div>
                  <label style={styles.label}>Street</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={e => handleField('street', e.target.value)}
                    style={styles.input}
                    placeholder="Street or society"
                  />
                </div>
              </div>
              <div style={styles.splitRow}>
                <div>
                  <label style={styles.label}>Landmark</label>
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={e => handleField('landmark', e.target.value)}
                    style={styles.input}
                    placeholder="Near mall or park"
                  />
                </div>
                <div style={styles.splitRow}>
                  <div>
                    <label style={styles.label}>City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={e => handleField('city', e.target.value)}
                      style={styles.input}
                      placeholder="Hyderabad"
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Pincode</label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={e => handleField('pincode', e.target.value)}
                      style={styles.input}
                      placeholder="500001"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p style={styles.description}>Choose the professional you want to assign for the job.</p>
              <div style={styles.profileGrid}>
                {professionals.map(pro => (
                  <button
                    key={pro.id}
                    type="button"
                    onClick={() => setSelectedPro(pro.id)}
                    style={styles.profileCard(pro.id === selectedPro)}
                  >
                    <div style={styles.profileTop}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{pro.name}</div>
                        <div style={{ color: '#64748b', marginTop: '0.35rem' }}>{pro.service}</div>
                      </div>
                      <div style={styles.badgeSmall}>⭐⭐⭐⭐⭐</div>
                    </div>
                    <div style={styles.metaList}>
                      <div style={styles.metaRow}>
                        <span style={styles.label}>Jobs done</span>
                        <span style={styles.summaryValue}>{pro.jobs}</span>
                      </div>
                      <div style={styles.metaRow}>
                        <span style={styles.label}>Estimate</span>
                        <span style={styles.summaryValue}>₹{pro.price}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1.75rem', borderRadius: '20px', background: '#f8fafc' }}>
                <div style={styles.sectionTitle}>Booking summary</div>
                {[
                  ['Service', service],
                  ['Location', location],
                  ['Date', summaryDate],
                  ['Time', time],
                  ['Professional', selectedProfessional.name],
                  ['Address', `${address.full || 'N/A'}, ${address.house || 'N/A'}, ${address.street || 'N/A'}, ${address.city || 'N/A'} - ${address.pincode || 'N/A'}`],
                ].map(([label, value]) => (
                  <div key={label} style={styles.metaRow}>
                    <span style={styles.summaryLabel}>{label}</span>
                    <span style={styles.summaryValue}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1.75rem', borderRadius: '20px', background: '#f8fafc' }}>
                <div style={styles.sectionTitle}>Pricing</div>
                <div style={styles.metaRow}>
                  <span style={styles.summaryLabel}>Estimated Price</span>
                  <span style={styles.summaryValue}>₹{estimatedPrice}</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.summaryLabel}>Platform Fee</span>
                  <span style={styles.summaryValue}>₹{platformFee}</span>
                </div>
                <div style={{ ...styles.metaRow, marginTop: '1rem', fontSize: '1.02rem' }}>
                  <span style={styles.summaryLabel}>Total</span>
                  <span style={styles.summaryValue}>₹{totalPrice}</span>
                </div>
              </div>
            </div>
          )}

          <div style={styles.buttonRow}>
            {step > 1 ? (
              <button type="button" onClick={previousStep} style={styles.secondaryButton}>
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={step < steps.length ? nextStep : confirmBooking}
              style={styles.primaryButton}
            >
              {step < steps.length ? 'Continue' : 'Confirm Booking'}
            </button>
          </div>
        </div>

        {confirmed && (
          <div style={styles.confirmation}>
            <div style={styles.confirmationIcon}>✅</div>
            <div style={styles.confirmationTitle}>Booking Confirmed</div>
            <div style={styles.confirmationText}>
              Your request has been received. A verified professional will reach out to you shortly with the booking details.
            </div>
            <div style={styles.confirmationGrid}>
              {[
                ['Service', service],
                ['Professional', selectedProfessional.name],
                ['When', `${summaryDate} · ${time}`],
                ['Total', `₹${totalPrice}`],
              ].map(([label, value]) => (
                <div key={label} style={styles.confirmationCard}>
                  <div style={styles.confirmationLabel}>{label}</div>
                  <div style={styles.confirmationValue}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookService;

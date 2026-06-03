import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
  page: { padding: '2rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', minHeight: '80vh' },
  card: { background: 'white', borderRadius: '14px', padding: '1.2rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)', maxWidth: '720px' },
  field: { marginBottom: '0.8rem' },
  label: { fontWeight: 800, color: '#0b1220' },
  value: { color: '#475569' },
  button: { marginTop: '1rem', padding: '0.7rem 1rem', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 800 }
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || 'Customer';
  const email = user?.email || 'you@example.com';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>Profile</div>
        <div style={{ height: '0.6rem' }} />
        <div style={styles.field}><div style={styles.label}>Profile Photo</div><div style={styles.value}>👤</div></div>
        <div style={styles.field}><div style={styles.label}>Name</div><div style={styles.value}>{displayName}</div></div>
        <div style={styles.field}><div style={styles.label}>Email</div><div style={styles.value}>{email}</div></div>
        <div style={styles.field}><div style={styles.label}>Phone Number</div><div style={styles.value}>+91 98765 43210</div></div>
        <div style={styles.field}><div style={styles.label}>Address</div><div style={styles.value}>123 Example Street, City, State</div></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button type="button" style={styles.button} onClick={() => navigate('/edit-profile')}>Edit Profile</button>
          <button type="button" style={{ ...styles.button, background: '#ef4444' }} onClick={() => navigate('/settings')}>Change Password</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

import React from 'react';

const styles = {
  page: { padding: '2rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', minHeight: '80vh' },
  card: { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)', maxWidth: '840px' },
  section: { marginBottom: '1rem' },
  item: { padding: '0.6rem 0', borderBottom: '1px solid #eef2ff' }
};

const Settings = () => {
  return (
    <div style={styles.page}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Settings</div>
      <div style={styles.card}>
        <div style={styles.section}><div style={{ fontWeight: 800 }}>Account Settings</div><div style={styles.item}>Change email, username</div></div>
        <div style={styles.section}><div style={{ fontWeight: 800 }}>Notification Preferences</div><div style={styles.item}>Manage push and email notifications</div></div>
        <div style={styles.section}><div style={{ fontWeight: 800 }}>Privacy Settings</div><div style={styles.item}>Manage personal data and visibility</div></div>
        <div style={styles.section}><div style={{ fontWeight: 800 }}>Security Settings</div><div style={styles.item}>Two-factor authentication, device sessions</div></div>
        <div style={styles.section}><div style={{ fontWeight: 800 }}>Danger Zone</div><div style={{ color: '#ef4444' }}>Delete Account</div></div>
      </div>
    </div>
  );
};

export default Settings;

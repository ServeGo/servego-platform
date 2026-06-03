import React, { useState } from 'react';

const styles = {
  page: { padding: '2rem', background: 'linear-gradient(180deg,#f8fafc,#eef5ff)', minHeight: '80vh' },
  card: { background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 60px rgba(2,6,23,0.06)', maxWidth: '840px' },
  section: { marginBottom: '1rem' },
  item: { padding: '0.6rem 0', borderBottom: '1px solid #eef2ff' }
};

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  return (
    <div style={styles.page}>
      <div style={{ display: 'grid', gap: '1rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>Settings</div>
        <div style={styles.card}>
          <div style={styles.section}>
            <div style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Notification Preferences</div>
            <label style={styles.labelRow}>
              <span>Email notifications</span>
              <input type="checkbox" checked={emailNotifications} onChange={() => setEmailNotifications((prev) => !prev)} />
            </label>
            <label style={styles.labelRow}>
              <span>SMS notifications</span>
              <input type="checkbox" checked={smsNotifications} onChange={() => setSmsNotifications((prev) => !prev)} />
            </label>
            <label style={styles.labelRow}>
              <span>Marketing emails</span>
              <input type="checkbox" checked={marketingEmails} onChange={() => setMarketingEmails((prev) => !prev)} />
            </label>
          </div>

          <div style={styles.section}>
            <div style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Security Settings</div>
            <label style={styles.labelRow}>
              <span>Security alerts</span>
              <input type="checkbox" checked={securityAlerts} onChange={() => setSecurityAlerts((prev) => !prev)} />
            </label>
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '16px', background: '#eff6ff', color: '#1e3a8a' }}>
              Keep your account secure by reviewing your connected devices and authorization settings regularly.
            </div>
          </div>

          <div style={styles.section}>
            <div style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Privacy</div>
            <div style={styles.item}>Personal profile visibility settings.</div>
            <div style={styles.item}>Data sharing preferences.</div>
          </div>

          <div style={styles.section}>
            <div style={{ fontWeight: 800, color: '#ef4444' }}>Danger Zone</div>
            <button type="button" style={{ ...styles.button, background: '#ef4444', color: '#fff' }}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

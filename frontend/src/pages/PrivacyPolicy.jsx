import React from 'react';
import PageShell from '../components/PageShell';

const PrivacyPolicy = () => (
  <PageShell
    title="Privacy Policy"
    description="Read how ServeGo protects your personal information, booking data, and payment details."
    actions={[
      { label: 'Home', to: '/' },
      { label: 'Terms & Conditions', to: '/terms' },
    ]}
  />
);

export default PrivacyPolicy;

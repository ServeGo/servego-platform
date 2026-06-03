import React from 'react';
import PageShell from '../components/PageShell';

const Support = () => (
  <PageShell
    title="Support Center"
    description="Find answers to booking questions, provider help, and troubleshooting for your ServeGo account."
    actions={[
      { label: 'Contact Us', to: '/contact' },
      { label: 'Home', to: '/' },
    ]}
  />
);

export default Support;

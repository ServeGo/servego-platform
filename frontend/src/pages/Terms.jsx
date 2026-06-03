import React from 'react';
import PageShell from '../components/PageShell';

const Terms = () => (
  <PageShell
    title="Terms & Conditions"
    description="View the usage guidelines, partner agreements, and booking terms for ServeGo customers and providers."
    actions={[
      { label: 'Home', to: '/' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
    ]}
  />
);

export default Terms;

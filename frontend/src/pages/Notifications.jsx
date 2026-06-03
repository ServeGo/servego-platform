import React, { useState } from 'react';
import Loader from '../scaffold/common/Loader';
import EmptyState from '../scaffold/common/EmptyState';
import PageShell from '../components/PageShell';

const Notifications = () => {
  const [isLoading] = useState(false);
  const items = [
    'Booking confirmed for AC Repair — Tomorrow 10:00 AM',
    'Your invoice #12345 is ready',
    'New professional added in your area',
  ];

  if (isLoading) return <Loader />;

  return (
    <PageShell title="Notifications" description="Recent updates and alerts for your account">
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bp-card">
          {items.map((it, i) => (
            <div key={i} className="list-row">{it}</div>
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default Notifications;

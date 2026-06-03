import React from 'react';
import PageShell from '../components/PageShell';

const SavedServices = () => {
  const saved = [
    'Full Home Cleaning',
    'AC Repair (Trusted)',
    'Electrician - Shekhar'
  ];

  return (
    <PageShell title="Saved Services" description="Your favorite services and professionals for quick booking.">
      <div className="page-card">
        {saved.length === 0 ? (
          <div className="empty-state" role="status" aria-live="polite">
            <h3>No saved services</h3>
            <p>You haven't saved any services yet.</p>
          </div>
        ) : (
          <div className="page-list">
            {saved.map((s, i) => (
              <div key={i} className="page-list-item">
                <div className="page-list-item-main">{s}</div>
                <button className="button-primary">Quick Book</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default SavedServices;

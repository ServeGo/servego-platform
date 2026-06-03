import React from 'react';

export default function Loader() {
  return (
    <div className="loader-shell" role="status" aria-live="polite">
      <div className="loader-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="skeleton-line" style={{ width: '55%', marginTop: '1rem' }} />
      <div className="skeleton-line" style={{ width: '80%' }} />
    </div>
  );
}

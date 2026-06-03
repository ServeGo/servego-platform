import React from 'react';

export default function EmptyState() {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="40" cy="40" r="36" stroke="#c7d2fe" strokeWidth="8" fill="#eff6ff" />
        <path d="M28 42L36 50L52 34" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3>No items found</h3>
      <p>There is nothing to display here yet. Check back later or update your filters.</p>
    </div>
  );
}

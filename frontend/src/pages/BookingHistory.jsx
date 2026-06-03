import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../scaffold/common/Loader';
import EmptyState from '../scaffold/common/EmptyState';
import PageShell from '../components/PageShell';

const mockHistory = [
  { id: 'BK-10324', service: 'AC Repair', date: '2026-05-15', status: 'Paid', amount: 1099 },
  { id: 'BK-10310', service: 'Home Cleaning', date: '2026-04-22', status: 'Paid', amount: 799 },
  { id: 'BK-10288', service: 'Plumbing Service', date: '2026-03-30', status: 'Refunded', amount: 499 },
];

const BookingHistory = () => {
  const [isLoading] = useState(false);

  if (isLoading) return <Loader />;

  return (
    <PageShell title="Booking History" description="Review past bookings, invoices, and service details">
      <div className="page-card">
        <div className="page-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Booking History</h1>
            <p className="page-description">Review past bookings, invoices, and service details from your completed journeys.</p>
          </div>
          <Link to="/services" className="button-primary">Browse Services</Link>
        </div>

        <div className="page-list">
          {mockHistory.length === 0 ? (
            <EmptyState />
          ) : (
            mockHistory.map((booking) => (
              <div key={booking.id} className="page-list-item">
                <div className="page-list-item-main">
                  <div className="page-list-title">{booking.service}</div>
                  <div className="page-list-sub">{booking.id} • {booking.date}</div>
                </div>
                <div className="page-list-actions">
                  <div className="muted">{booking.status}</div>
                  <div className="font-bold">₹{booking.amount}</div>
                </div>
                <div className="page-list-below">
                  <Link to="/booking-history" className="link">View Invoice</Link>
                  {booking.status === 'Paid' && <Link to="/services" className="link">Book Again</Link>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default BookingHistory;

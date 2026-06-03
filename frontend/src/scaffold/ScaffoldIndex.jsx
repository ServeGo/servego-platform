import React from 'react';
import { Link } from 'react-router-dom';

const items = [
  { label: 'Auth: Google Login', to: '/scaffold/auth/google-login' },
  { label: 'Auth: OTP Verification', to: '/scaffold/auth/otp-verification' },
  { label: 'Auth: Reset Password Success', to: '/scaffold/auth/reset-password-success' },

  { label: 'Customer: Dashboard', to: '/scaffold/customer/dashboard' },
  { label: 'Customer: My Bookings', to: '/scaffold/customer/my-bookings' },
  { label: 'Customer: Booking Details', to: '/scaffold/customer/booking-details' },
  { label: 'Customer: Booking Tracking', to: '/scaffold/customer/booking-tracking' },
  { label: 'Customer: Notifications', to: '/scaffold/customer/notifications' },
  { label: 'Customer: Profile', to: '/scaffold/customer/profile' },
  { label: 'Customer: Settings', to: '/scaffold/customer/settings' },
  { label: 'Customer: Support Tickets', to: '/scaffold/customer/support-tickets' },
  { label: 'Customer: Reviews', to: '/scaffold/customer/reviews' },

  { label: 'Provider: Dashboard', to: '/scaffold/provider/dashboard' },
  { label: 'Provider: Available Jobs', to: '/scaffold/provider/available-jobs' },
  { label: 'Provider: Assigned Jobs', to: '/scaffold/provider/assigned-jobs' },
  { label: 'Provider: Completed Jobs', to: '/scaffold/provider/completed-jobs' },
  { label: 'Provider: Earnings', to: '/scaffold/provider/earnings' },
  { label: 'Provider: Withdraw Earnings', to: '/scaffold/provider/withdraw-earnings' },
  { label: 'Provider: Reviews', to: '/scaffold/provider/reviews' },
  { label: 'Provider: Availability', to: '/scaffold/provider/availability' },
  { label: 'Provider: Profile', to: '/scaffold/provider/profile' },
  { label: 'Provider: Settings', to: '/scaffold/provider/settings' },

  { label: 'Admin: Dashboard', to: '/scaffold/admin/dashboard' },
  { label: 'Admin: Customers', to: '/scaffold/admin/customers' },
  { label: 'Admin: Providers', to: '/scaffold/admin/providers' },
  { label: 'Admin: Services', to: '/scaffold/admin/services' },
  { label: 'Admin: Bookings', to: '/scaffold/admin/bookings' },
  { label: 'Admin: Payments', to: '/scaffold/admin/payments' },
  { label: 'Admin: Reviews', to: '/scaffold/admin/reviews' },
  { label: 'Admin: Analytics', to: '/scaffold/admin/analytics' },
  { label: 'Admin: Reports', to: '/scaffold/admin/reports' },

  { label: 'Common: Sidebar', to: '/scaffold/common/sidebar' },
  { label: 'Common: Notifications', to: '/scaffold/common/notifications' },
  { label: 'Common: Profile Dropdown', to: '/scaffold/common/profile' },
  { label: 'Common: Search', to: '/scaffold/common/search' },
  { label: 'Common: Filters', to: '/scaffold/common/filters' },
  { label: 'Common: Modal', to: '/scaffold/common/modal' },
  { label: 'Common: Loader', to: '/scaffold/common/loader' },
  { label: 'Common: Empty State', to: '/scaffold/common/empty' },
  { label: 'Common: Error State', to: '/scaffold/common/error' },

  { label: 'Legal: Privacy Policy', to: '/scaffold/legal/privacy' },
  { label: 'Legal: Terms', to: '/scaffold/legal/terms' },
  { label: 'Legal: FAQ', to: '/scaffold/legal/faq' },
  { label: 'Legal: Contact Us', to: '/scaffold/legal/contact' },

  { label: 'UX: Role Nav', to: '/scaffold/ux/role-nav' },
  { label: 'UX: Breadcrumbs', to: '/scaffold/ux/breadcrumbs' },
  { label: 'UX: Toasts', to: '/scaffold/ux/toasts' },
  { label: 'UX: Success Screen', to: '/scaffold/ux/success' },
  { label: 'UX: Confirmation Dialog', to: '/scaffold/ux/confirm' },
];

export default function ScaffoldIndex() {
  return (
    <div style={{padding:24}}>
      <h2>Scaffold Index</h2>
      <ul>
        {items.map((it) => (
          <li key={it.to}><Link to={it.to}>{it.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

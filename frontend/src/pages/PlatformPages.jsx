import React, { useState } from 'react';
import Loader from '../scaffold/common/Loader';
import EmptyState from '../scaffold/common/EmptyState';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';

const panelStyles = {
  display: 'grid',
  gap: '1rem',
  marginTop: '1.5rem',
};

const cardStyles = {
  padding: '1.4rem',
  borderRadius: '24px',
  background: 'white',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
};

const buttonStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.9rem 1.25rem',
  borderRadius: '999px',
  background: '#2563eb',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 700,
};

const sectionTitle = {
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: '0.75rem',
};

const SectionCard = ({ title, description, children }) => (
  <div style={cardStyles}>
    <h3 style={sectionTitle}>{title}</h3>
    <p style={{ color: '#475569', lineHeight: 1.8 }}>{description}</p>
    {children}
  </div>
);

const PageShellWithLoader = ({ title, description, actions = [], children }) => {
  const [isLoading] = useState(false);
  return (
    <PageShell title={title} description={description} actions={actions} loading={isLoading}>
      {children}
    </PageShell>
  );
};

const FAQ = () => (
  <PageShellWithLoader
    title="FAQ"
    description="Find answers to common questions about booking, service delivery, and your account."
    actions={[{ label: 'Contact Support', to: '/contact', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard
        title="How do I book a service?"
        description="Browse services, choose a provider, and confirm your appointment using the booking flow."
      />
      <SectionCard
        title="Can I change my booking date?"
        description="Yes. Visit your bookings page and select a booking to reschedule or cancel before the service date."
      />
      <SectionCard
        title="How do I become a partner?"
        description="Use the Become Partner page to sign up for provider access and start receiving job requests."
      />
      <SectionCard
        title="What payment methods do you support?"
        description="Payments are managed through the booking confirmation flow. For now, invoices are issued directly in the app."
      />
    </div>
  </PageShellWithLoader>
);

const UpcomingServices = () => (
  <PageShellWithLoader
    title="Upcoming Services"
    description="See all your scheduled service appointments and prepare for the visit."
    actions={[{ label: 'Book a Service', to: '/book-service', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard
        title="Electrician Visit"
        description="2026-06-14 · 10:00 AM · New Town Apartment · Status: Confirmed"
      />
      <SectionCard
        title="AC Repair"
        description="2026-06-18 · 2:30 PM · Green Valley Home · Status: Confirmed"
      />
    </div>
  </PageShellWithLoader>
);

const CancelledServices = () => (
  <PageShellWithLoader
    title="Cancelled Services"
    description="Review cancelled bookings and reschedule the services you need."
    actions={[{ label: 'Support', to: '/support-center', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard
        title="Carpentry Work"
        description="Cancelled on 2026-05-28. You can rebook the service from the Services page."
      />
      <SectionCard
        title="Home Cleaning"
        description="Cancelled on 2026-05-20. Contact support if you need a refund or help rescheduling."
      />
    </div>
  </PageShellWithLoader>
);

const EditProfile = () => (
  <PageShellWithLoader
    title="Edit Profile"
    description="Update your personal information, contact details, and service preferences."
    actions={[{ label: 'Profile', to: '/profile', primary: true }]}
  >
    <div style={cardStyles}>
      <form style={{ display: 'grid', gap: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          Full Name
          <input type="text" placeholder="Enter your name" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
        </label>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          Email Address
          <input type="email" placeholder="you@example.com" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
        </label>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          Phone Number
          <input type="tel" placeholder="+1 555 012 345" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
        </label>
        <button type="button" style={buttonStyles}>Save Changes</button>
      </form>
    </div>
  </PageShellWithLoader>
);

const AddressManagement = () => (
  <PageShellWithLoader
    title="Address Management"
    description="Manage your saved service locations for faster checkout and reliable service delivery."
    actions={[{ label: 'Book Service', to: '/book-service', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard
        title="Home Address"
        description="14 Orchard Lane, Greenfield, Floor 2. Default service address."
      >
        <Link to="/edit-profile" style={{ ...buttonStyles, background: '#475569' }}>Edit Address</Link>
      </SectionCard>
      <SectionCard
        title="Work Address"
        description="Office 22, Tech Park, Business District. Available on weekdays.">
        <Link to="/edit-profile" style={{ ...buttonStyles, background: '#475569' }}>Edit Address</Link>
      </SectionCard>
    </div>
  </PageShellWithLoader>
);

const FavoriteProviders = () => (
  <PageShellWithLoader
    title="Favorite Providers"
    description="Save your trusted professionals for quicker bookings and better service continuity."
    actions={[{ label: 'Services', to: '/services', primary: true }]}
  >
    <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
      {['Aman Electricians', 'Priya Plumbing', 'HomePure Cleaners'].map((provider) => (
        <div key={provider} style={cardStyles}>
          <h3 style={sectionTitle}>{provider}</h3>
          <p style={{ color: '#475569' }}>Top-rated partner with fast response time and 4.9-star reviews.</p>
        </div>
      ))}
    </div>
  </PageShellWithLoader>
);

const Reviews = () => (
  <PageShellWithLoader
    title="Reviews & Ratings"
    description="Share feedback on your completed services and help other customers choose the best providers."
    actions={[{ label: 'My Bookings', to: '/my-bookings', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard
        title="Electrician Service"
        description="Rated 5 stars: Great work and quick response. Provider arrived on time and fixed the issue efficiently."
      />
      <SectionCard
        title="Carpentry Repair"
        description="Rated 4 stars: Quality craftmanship, but the team took a little longer than expected."
      />
    </div>
  </PageShellWithLoader>
);

const CustomerSupport = () => (
  <PageShellWithLoader
    title="Support Center"
    description="Get help with bookings, refunds, cancellations, and service issues."
    actions={[{ label: 'Dashboard', to: '/dashboard', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Booking Help" description="Need support with a booking or cancellation?" />
      <SectionCard title="Payment Questions" description="Issues with payment status or invoices are resolved here." />
      <SectionCard title="Account Support" description="Update account details or report a problem with your profile." />
    </div>
  </PageShellWithLoader>
);

const ChooseProvider = () => (
  <PageShellWithLoader
    title="Choose Provider"
    description="Select the best available professional for your service based on reviews, pricing, and proximity."
    actions={[{ label: 'Select Date', to: '/select-date', primary: true }]}
  >
    <div style={panelStyles}>
      {['Aman Electricians', 'Priya Plumbing', 'CleanSweep Team'].map((provider) => (
        <div key={provider} style={cardStyles}>
          <h3 style={sectionTitle}>{provider}</h3>
          <p style={{ color: '#475569' }}>4.9 stars · 180 reviews · ₹350/hr</p>
          <Link to="/select-date" style={buttonStyles}>Select Provider</Link>
        </div>
      ))}
    </div>
  </PageShellWithLoader>
);

const SelectDate = () => (
  <PageShellWithLoader
    title="Select Date"
    description="Choose a convenient date for your service appointment."
    actions={[{ label: 'Select Time', to: '/select-time', primary: true }]}
  >
    <div style={cardStyles}>
      <label style={{ display: 'grid', gap: '0.75rem' }}>
        Preferred Date
        <input type="date" style={{ padding: '0.9rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <p style={{ color: '#475569' }}>Available slots depend on provider availability and service type.</p>
    </div>
  </PageShellWithLoader>
);

const SelectTime = () => (
  <PageShellWithLoader
    title="Select Time"
    description="Choose the time slot that works best for your schedule."
    actions={[{ label: 'Select Address', to: '/select-address', primary: true }]}
  >
    <div style={{ ...cardStyles, display: 'grid', gap: '1rem' }}>
      {['09:00 AM', '11:00 AM', '02:00 PM', '05:00 PM'].map((slot) => (
        <button key={slot} type="button" style={{ ...buttonStyles, background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}>{slot}</button>
      ))}
    </div>
  </PageShellWithLoader>
);

const SelectAddress = () => (
  <PageShellWithLoader
    title="Select Address"
    description="Confirm your service address or add a new location for the provider."
    actions={[{ label: 'Review Booking', to: '/booking-summary', primary: true }]}
  >
    <div style={{ ...cardStyles, display: 'grid', gap: '1rem' }}>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Service Address
        <input type="text" placeholder="Enter address" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Landmark
        <input type="text" placeholder="Near the mall or park" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
    </div>
  </PageShellWithLoader>
);

const BookingSummary = () => (
  <PageShellWithLoader
    title="Booking Summary"
    description="Review your booking details, pricing, and provider selection before confirmation."
    actions={[{ label: 'Confirm Booking', to: '/booking-confirmation', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard
        title="Service"
        description="AC Repair · Priya Plumbing · 18 June 2026 · 02:30 PM"
      />
      <SectionCard
        title="Address"
        description="42 Maple Street, Sunrise Apartments, Sector 12."
      />
      <SectionCard
        title="Total"
        description="₹2,450 · Includes service fee and travel charges."
      />
    </div>
  </PageShellWithLoader>
);

const BookingConfirmation = () => (
  <PageShellWithLoader
    title="Booking Confirmation"
    description="Your service booking is confirmed and the provider is scheduled."
    actions={[{ label: 'Dashboard', to: '/dashboard', primary: true }]}
  >
    <div style={cardStyles}>
      <h3 style={sectionTitle}>Booking #SG-2026-0921</h3>
      <p style={{ color: '#475569' }}>Your provider will arrive on 18 June 2026 at 02:30 PM. You will receive updates in notifications.</p>
    </div>
  </PageShellWithLoader>
);

const BookingTracking = () => (
  <PageShellWithLoader
    title="Booking Tracking"
    description="Track the arrival of your service provider and stay updated in real time."
    actions={[{ label: 'Booking History', to: '/booking-history', primary: true }]}
  >
    <div style={{ ...cardStyles, display: 'grid', gap: '1rem' }}>
      <p style={{ color: '#475569' }}>Provider en route · Expected arrival in 25 minutes.</p>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {['Confirmed', 'Provider Assigned', 'En Route', 'Arriving'].map((step) => (
          <div key={step} style={{ padding: '1rem', borderRadius: '20px', background: '#f8fafc' }}>{step}</div>
        ))}
      </div>
    </div>
  </PageShellWithLoader>
);

const RescheduleBooking = () => (
  <PageShellWithLoader
    title="Reschedule Booking"
    description="Change the booking date or time if your plans have changed."
    actions={[{ label: 'Booking Summary', to: '/booking-summary', primary: true }]}
  >
    <div style={cardStyles}>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        New Date
        <input type="date" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        New Time
        <select style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <option>09:00 AM</option>
          <option>11:00 AM</option>
          <option>02:00 PM</option>
          <option>05:00 PM</option>
        </select>
      </label>
    </div>
  </PageShellWithLoader>
);

const CancelBooking = () => (
  <PageShellWithLoader
    title="Cancel Booking"
    description="Cancel a booking and review refund options if applicable."
    actions={[{ label: 'Support Center', to: '/support-center', primary: true }]}
  >
    <div style={cardStyles}>
      <p style={{ color: '#475569' }}>You can cancel your booking up to 2 hours before the scheduled time. Refunds are subject to provider policy.</p>
      <button type="button" style={{ ...buttonStyles, background: '#dc2626' }}>Request Cancellation</button>
    </div>
  </PageShellWithLoader>
);

const Invoice = () => (
  <PageShellWithLoader
    title="Invoice"
    description="View and download the invoice for your completed service."
    actions={[{ label: 'Booking History', to: '/booking-history', primary: true }]}
  >
    <div style={cardStyles}>
      <h3 style={sectionTitle}>Invoice #INV-2026-1074</h3>
      <p style={{ color: '#475569' }}>Service: AC Repair · Total: ₹2,450 · Paid: Yes</p>
      <button type="button" style={buttonStyles}>Download Invoice</button>
    </div>
  </PageShellWithLoader>
);

const ProviderDashboard = () => {
  const [isLoading] = useState(false);

  if (isLoading) return <Loader />;

  const stats = [
    { label: 'New Jobs', value: '8' },
    { label: 'Assigned Today', value: '3' },
    { label: 'Earnings This Week', value: '₹18,900' },
  ];

  return (
    <PageShellWithLoader
      title="Provider Dashboard"
      description="Your daily overview of job requests, active assignments, and earnings."
      actions={[{ label: 'Available Jobs', to: '/available-jobs', primary: true }]}
    >
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: '1.5rem' }}>
        {stats.map((stat) => (
          <div key={stat.label} style={cardStyles}>
            <div style={{ fontSize: '0.9rem', color: '#475569' }}>{stat.label}</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </PageShellWithLoader>
  );
};

const AvailableJobs = () => (
  <PageShellWithLoader
    title="Available Jobs"
    description="Browse service requests that are waiting for assignment."
    actions={[{ label: 'Accepted Jobs', to: '/accepted-jobs', primary: true }]}
  >
    <div style={panelStyles}>
        {(() => {
          const availableJobs = ['Electrician at Greenside', 'Plumber at Riverside', 'Painter at West End'];
          return availableJobs.length === 0 ? (
            <EmptyState />
          ) : (
            availableJobs.map((job) => (
              <div key={job} style={cardStyles}>
                <h3 style={sectionTitle}>{job}</h3>
                <p style={{ color: '#475569' }}>Request received 12 minutes ago · ₹1,200 estimated</p>
                <Link to="/accepted-jobs" style={buttonStyles}>Accept Job</Link>
              </div>
            ))
          );
        })()}
    </div>
  </PageShellWithLoader>
);

const AcceptedJobs = () => (
  <PageShellWithLoader
    title="Accepted Jobs"
    description="Manage the jobs you have already accepted and prepare for each assignment."
    actions={[{ label: 'Assigned Jobs', to: '/assigned-jobs', primary: true }]}
  >
    <div style={panelStyles}>
      {(() => {
        const accepted = [
          { title: 'AC Service - Elite Towers', desc: 'Scheduled for tomorrow at 10:00 AM. Customer request: full unit inspection.' },
          { title: 'Home Cleaning - Oak Villa', desc: 'Scheduled for later today at 4:30 PM. Bring disinfectant supplies and extra masks.' },
        ];
        return accepted.length === 0 ? (
          <EmptyState />
        ) : (
          accepted.map((it) => <SectionCard key={it.title} title={it.title} description={it.desc} />)
        );
      })()}
    </div>
  </PageShellWithLoader>
);

const AssignedJobs = () => (
  <PageShellWithLoader
    title="Assigned Jobs"
    description="Track the jobs that are currently scheduled for your service team."
    actions={[{ label: 'In Progress Jobs', to: '/in-progress-jobs', primary: true }]}
  >
    <div style={panelStyles}>
      {(() => {
        const assigned = [
          { title: 'Kitchen Plumbing', desc: 'Assigned on 2026-06-12 · Customer: Sheela · Location: Lake View Apartments.' },
          { title: 'Wardrobe Repair', desc: 'Assigned on 2026-06-11 · Customer: Rahul · Location: Midtown Residences.' },
        ];
        return assigned.length === 0 ? (
          <EmptyState />
        ) : (
          assigned.map((it) => <SectionCard key={it.title} title={it.title} description={it.desc} />)
        );
      })()}
    </div>
  </PageShellWithLoader>
);

const InProgressJobs = () => (
  <PageShellWithLoader
    title="In Progress Jobs"
    description="Update the current status for jobs that are underway."
    actions={[{ label: 'Completed Jobs', to: '/completed-jobs', primary: true }]}
  >
    <div style={panelStyles}>
      {(() => {
        const inProgress = [
          { title: 'Generator Service', desc: 'Start time: 09:15 AM · Status: In progress · Customer: Priya.' },
          { title: 'Bathroom Tile Repair', desc: 'Start time: 10:00 AM · Status: In progress · Customer: Sanjay.' },
        ];
        return inProgress.length === 0 ? (
          <EmptyState />
        ) : (
          inProgress.map((it) => <SectionCard key={it.title} title={it.title} description={it.desc} />)
        );
      })()}
    </div>
  </PageShellWithLoader>
);

const CompletedJobs = () => (
  <PageShellWithLoader
    title="Completed Jobs"
    description="Review jobs you have completed recently and request customer feedback."
    actions={[{ label: 'Earnings Dashboard', to: '/earnings', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="AC Repair" description="Completed on 2026-06-10 · Customer: Meera · Earned ₹1,800." />
      <SectionCard title="Electrical Safety Check" description="Completed on 2026-06-09 · Customer: Vikram · Earned ₹1,350." />
    </div>
  </PageShellWithLoader>
);

const Earnings = () => (
  <PageShellWithLoader
    title="Earnings Dashboard"
    description="Monitor your earnings, payouts, and partner performance."
    actions={[{ label: 'Withdraw Earnings', to: '/withdraw-earnings', primary: true }]}
  >
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: '1.5rem' }}>
      {[
        { label: 'Total Revenue', value: '₹72,400' },
        { label: 'Pending Payouts', value: '₹9,500' },
        { label: 'Last Payment', value: '₹24,000' },
      ].map((item) => (
        <div key={item.label} style={cardStyles}>
          <div style={{ fontSize: '0.9rem', color: '#475569' }}>{item.label}</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>{item.value}</div>
        </div>
      ))}
    </div>
  </PageShellWithLoader>
);

const WithdrawEarnings = () => (
  <PageShellWithLoader
    title="Withdraw Earnings"
    description="Request payouts and manage your partner account balance."
    actions={[{ label: 'Earnings', to: '/earnings', primary: true }]}
  >
    <div style={cardStyles}>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Withdrawal Amount
        <input type="number" placeholder="₹0" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <button type="button" style={buttonStyles}>Request Payout</button>
    </div>
  </PageShellWithLoader>
);

const CustomerHistory = () => (
  <PageShellWithLoader
    title="Customer History"
    description="View the record of customers you have served and their service requests."
    actions={[{ label: 'Provider Profile', to: '/provider-profile', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Amit Sharma" description="5 completed bookings · Electrical, Plumbing, and Home Repairs." />
      <SectionCard title="Nisha Patel" description="3 completed bookings · AC, Carpentry, and Cleaning." />
    </div>
  </PageShellWithLoader>
);

const ProviderReviews = () => (
  <PageShellWithLoader
    title="Ratings & Reviews"
    description="Read customer feedback and improve your partner rating."
    actions={[{ label: 'Provider Profile', to: '/provider-profile', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Excellent service" description="5 stars · Fast response and reliable repair work." />
      <SectionCard title="Highly recommended" description="5 stars · Professional and polite technician." />
    </div>
  </PageShellWithLoader>
);

const Availability = () => (
  <PageShellWithLoader
    title="Availability Management"
    description="Set the hours and locations where you are available for bookings."
    actions={[{ label: 'Provider Dashboard', to: '/provider-dashboard', primary: true }]}
  >
    <div style={cardStyles}>
      <p style={{ color: '#475569' }}>Update your service availability for the next 7 days to receive the best jobs.</p>
      <button type="button" style={buttonStyles}>Update Availability</button>
    </div>
  </PageShellWithLoader>
);

const ProviderProfile = () => (
  <PageShellWithLoader
    title="Provider Profile"
    description="Manage your public partner profile and service descriptions."
    actions={[{ label: 'Edit Profile', to: '/edit-provider-profile', primary: true }]}
  >
    <div style={cardStyles}>
      <h3 style={sectionTitle}>Bright Home Services</h3>
      <p style={{ color: '#475569' }}>Level 2 partner · 4.9 rating · 1,240 completed jobs</p>
    </div>
  </PageShellWithLoader>
);

const EditProviderProfile = () => (
  <PageShellWithLoader
    title="Edit Provider Profile"
    description="Update your contact details, service offerings, and pricing information."
    actions={[{ label: 'Provider Profile', to: '/provider-profile', primary: true }]}
  >
    <div style={cardStyles}>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Business Name
        <input type="text" placeholder="Service provider name" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Service Description
        <textarea placeholder="Describe your services" rows="4" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <button type="button" style={buttonStyles}>Save Profile</button>
    </div>
  </PageShellWithLoader>
);

const ProviderSettings = () => (
  <PageShellWithLoader
    title="Provider Settings"
    description="Configure your partner experience, notification preferences, and business details."
    actions={[{ label: 'Provider Support', to: '/provider-support', primary: true }]}
  >
    <div style={cardStyles}>
      <p style={{ color: '#475569' }}>Keep your profile current and control the notifications you receive for new jobs and bookings.</p>
      <button type="button" style={buttonStyles}>Update Settings</button>
    </div>
  </PageShellWithLoader>
);

const ProviderSupport = () => (
  <PageShellWithLoader
    title="Provider Support"
    description="Get help with payouts, jobs, account issues, and partner policies."
    actions={[{ label: 'Provider Dashboard', to: '/provider-dashboard', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Payments" description="Questions about payouts, commissions, or invoices." />
      <SectionCard title="Jobs" description="Need help with a job request or assignment?" />
      <SectionCard title="Account" description="Update your account, credentials, or profile settings." />
    </div>
  </PageShellWithLoader>
);

const AdminDashboard = () => {
  const [isLoading] = useState(false);

  if (isLoading) return <Loader />;

  const cards = [
    { label: 'Active Customers', value: '4,320' },
    { label: 'Active Providers', value: '980' },
    { label: 'Weekly Bookings', value: '1,250' },
  ];

  return (
    <PageShellWithLoader
      title="Admin Dashboard"
      description="Monitor platform activity, bookings, provider health, and customer engagement." 
      actions={[{ label: 'Customers', to: '/customers', primary: true }]}
    >
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginTop: '1.5rem' }}>
        {cards.map((card) => (
          <div key={card.label} style={cardStyles}>
            <div style={{ fontSize: '0.9rem', color: '#475569' }}>{card.label}</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>
    </PageShellWithLoader>
  );
};

const Customers = () => (
  <PageShellWithLoader
    title="Manage Customers"
    description="Search and manage customer records across the platform."
    actions={[{ label: 'Providers', to: '/providers', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Neha Kapoor" description="Joined 2025 · 16 bookings · Active" />
      <SectionCard title="Rahul Mehta" description="Joined 2024 · 11 bookings · Frequent user" />
    </div>
  </PageShellWithLoader>
);

const CustomerDetails = () => (
  <PageShellWithLoader
    title="Customer Details"
    description="Review individual customer profiles and booking history."
    actions={[{ label: 'Customers', to: '/customers', primary: true }]}
  >
    <div style={cardStyles}>
      <h3 style={sectionTitle}>Neha Kapoor</h3>
      <p style={{ color: '#475569' }}>Email: neha.kapoor@example.com · 16 bookings · 5 stars average rating</p>
    </div>
  </PageShellWithLoader>
);

const Providers = () => (
  <PageShellWithLoader
    title="Manage Providers"
    description="Review partner profiles, performance metrics, and active service categories."
    actions={[{ label: 'Services', to: '/services-management', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Bright Home Services" description="4.9 rating · 1,240 jobs completed." />
      <SectionCard title="CleanSweep Team" description="4.8 rating · 980 jobs completed." />
    </div>
  </PageShellWithLoader>
);

const ProviderDetails = () => (
  <PageShellWithLoader
    title="Provider Details"
    description="Inspect provider credentials, earnings, and support history."
    actions={[{ label: 'Providers', to: '/providers', primary: true }]}
  >
    <div style={cardStyles}>
      <h3 style={sectionTitle}>Bright Home Services</h3>
      <p style={{ color: '#475569' }}>Verified partner · Electrical, Plumbing, Cleaning · Active since 2023</p>
    </div>
  </PageShellWithLoader>
);

const ServicesManagement = () => (
  <PageShellWithLoader
    title="Manage Services"
    description="Add, update, or archive service categories and pricing structures."
    actions={[{ label: 'Add Service', to: '/add-service', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Electrician" description="Electrician services for repairs, installations, and maintenance." />
      <SectionCard title="Cleaning" description="Home and office cleaning packages with trusted service providers." />
    </div>
  </PageShellWithLoader>
);

const AddService = () => (
  <PageShellWithLoader
    title="Add Service"
    description="Create a new service offering for the platform."
    actions={[{ label: 'Services', to: '/services-management', primary: true }]}
  >
    <div style={cardStyles}>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Service Name
        <input type="text" placeholder="e.g. Gardening" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <button type="button" style={buttonStyles}>Create Service</button>
    </div>
  </PageShellWithLoader>
);

const EditService = () => (
  <PageShellWithLoader
    title="Edit Service"
    description="Update service details, descriptions, and pricing."
    actions={[{ label: 'Services', to: '/services-management', primary: true }]}
  >
    <div style={cardStyles}>
      <label style={{ display: 'grid', gap: '0.35rem' }}>
        Service Description
        <textarea placeholder="Update the service details" rows="4" style={{ padding: '0.95rem', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
      </label>
      <button type="button" style={buttonStyles}>Save Service</button>
    </div>
  </PageShellWithLoader>
);

const BookingsManagement = () => (
  <PageShellWithLoader
    title="Manage Bookings"
    description="Track all bookings across customers and providers."
    actions={[{ label: 'Booking Details', to: '/booking-details', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Booking #SG-2026-0921" description="Electrician service · Scheduled · Customer: Neha Kapoor" />
      <SectionCard title="Booking #SG-2026-0874" description="AC repair · Completed · Customer: Amit Sharma" />
    </div>
  </PageShellWithLoader>
);

const BookingDetails = () => (
  <PageShellWithLoader
    title="Booking Details"
    description="Inspect the booking lifecycle and customer/provider notes."
    actions={[{ label: 'Bookings', to: '/bookings-management', primary: true }]}
  >
    <div style={cardStyles}>
      <h3 style={sectionTitle}>Booking #SG-2026-0921</h3>
      <p style={{ color: '#475569' }}>Service: Electrical Repair · Status: Scheduled · Provider: Bright Home Services</p>
    </div>
  </PageShellWithLoader>
);

const ReviewsManagement = () => (
  <PageShellWithLoader
    title="Manage Reviews"
    description="Moderate customer feedback and partner ratings."
    actions={[{ label: 'Analytics', to: '/analytics', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Review from Neha" description="Excellent service, fast response." />
      <SectionCard title="Review from Amit" description="Good work but arrived 10 minutes late." />
    </div>
  </PageShellWithLoader>
);

const PaymentsManagement = () => (
  <PageShellWithLoader
    title="Manage Payments"
    description="Handle payout schedules, refunds, and transaction reports."
    actions={[{ label: 'Revenue', to: '/revenue', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Pending Payouts" description="₹9,500 waiting to be released." />
      <SectionCard title="Refund Requests" description="Review recent customer refund requests." />
    </div>
  </PageShellWithLoader>
);

const SupportTickets = () => (
  <PageShellWithLoader
    title="Support Tickets"
    description="Resolve platform support requests and partner issues."
    actions={[{ label: 'Customers', to: '/customers', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Ticket #1012" description="Customer question about booking cancellation." />
      <SectionCard title="Ticket #1015" description="Provider needs help with payout setup." />
    </div>
  </PageShellWithLoader>
);

const Analytics = () => (
  <PageShellWithLoader
    title="Analytics Dashboard"
    description="View platform trends, booking volume, and performance metrics." 
    actions={[{ label: 'Revenue', to: '/revenue', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Bookings Growth" description="+18% week-over-week." />
      <SectionCard title="Top Category" description="Home Cleaning" />
    </div>
  </PageShellWithLoader>
);

const Revenue = () => (
  <PageShellWithLoader
    title="Revenue Dashboard"
    description="Analyze revenue performance across services and regions." 
    actions={[{ label: 'Reports', to: '/reports', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Monthly Revenue" description="₹14.2L" />
      <SectionCard title="Top Performing Service" description="Electrical Repair" />
    </div>
  </PageShellWithLoader>
);

const Reports = () => (
  <PageShellWithLoader
    title="Reports"
    description="Download platform reports for bookings, payouts, and activity." 
    actions={[{ label: 'Analytics', to: '/analytics', primary: true }]}
  >
    <div style={panelStyles}>
      <SectionCard title="Weekly Booking Report" description="Download a CSV of the latest booking activity." />
      <SectionCard title="Revenue Summary" description="Download revenue performance by service category." />
    </div>
  </PageShellWithLoader>
);

const AdminSettings = () => (
  <PageShellWithLoader
    title="Admin Settings"
    description="Configure admin preferences, platform policies, and access controls."
    actions={[{ label: 'Admin Dashboard', to: '/admin-dashboard', primary: true }]}
  >
    <div style={cardStyles}>
      <p style={{ color: '#475569' }}>Manage platform settings, role permissions, and review automated workflows.</p>
      <button type="button" style={buttonStyles}>Update Settings</button>
    </div>
  </PageShellWithLoader>
);

export {
  FAQ,
  UpcomingServices,
  CancelledServices,
  EditProfile,
  AddressManagement,
  FavoriteProviders,
  Reviews,
  ChooseProvider,
  SelectDate,
  SelectTime,
  SelectAddress,
  BookingSummary,
  BookingConfirmation,
  BookingTracking,
  RescheduleBooking,
  CancelBooking,
  Invoice,
  CustomerSupport,
  ProviderDashboard,
  AvailableJobs,
  AcceptedJobs,
  AssignedJobs,
  InProgressJobs,
  CompletedJobs,
  Earnings,
  WithdrawEarnings,
  CustomerHistory,
  ProviderReviews,
  Availability,
  ProviderProfile,
  EditProviderProfile,
  ProviderSettings,
  ProviderSupport,
  AdminDashboard,
  Customers,
  CustomerDetails,
  Providers,
  ProviderDetails,
  ServicesManagement,
  AddService,
  EditService,
  BookingsManagement,
  BookingDetails,
  ReviewsManagement,
  PaymentsManagement,
  SupportTickets,
  Analytics,
  Revenue,
  Reports,
  AdminSettings,
};


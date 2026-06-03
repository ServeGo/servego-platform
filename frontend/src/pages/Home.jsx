import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Hero from '../components/Hero/Hero';
import PopularServices from '../components/PopularServices/PopularServices';
import WhyChoose from '../components/WhyChoose/WhyChoose';
import HowItWorks from '../components/HowItWorks/HowItWorks';
import Testimonials from '../components/Testimonials/Testimonials';
import PartnerCTA from '../components/PartnerCTA/PartnerCTA';
import PageShell from '../components/PageShell';

const roleContent = {
  customer: {
    title: 'Your home care is waiting.',
    subtitle: 'Book services faster, revisit your favorites, and keep your home running smoothly.',
    actions: [
      { label: 'Book a Service', to: '/book-service' },
      { label: 'My Bookings', to: '/my-bookings' },
      { label: 'Saved Services', to: '/saved-services' },
    ],
    highlight: 'Personalized recommendations for you',
  },
  provider: {
    title: 'Your partner workspace is ready.',
    subtitle: 'Manage requests, respond to bookings, and grow your service business with confidence.',
    actions: [
      { label: 'Go to Dashboard', to: '/dashboard' },
      { label: 'New Booking Requests', to: '/book-service' },
      { label: 'Profile Settings', to: '/profile' },
    ],
    highlight: 'Your service pipeline starts here',
  },
  admin: {
    title: 'Admin control center.',
    subtitle: 'Review platform activity, keep the marketplace safe, and support all users at a glance.',
    actions: [
      { label: 'Open Dashboard', to: '/dashboard' },
      { label: 'Notifications', to: '/notifications' },
      { label: 'Support Inbox', to: '/support' },
    ],
    highlight: 'Platform health and insights in one place',
  },
};

const LoggedInHome = ({ user }) => {
  const role = user?.role || 'customer';
  const content = roleContent[role] || roleContent.customer;
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <section className="hero welcome-hero">
      <div className="hero-container">
        <div className="hero-content">
          <span className="hero-eyebrow">Welcome back, {displayName}!</span>
          <h1 className="hero-title">{content.title}</h1>
          <p className="hero-subtitle">{content.subtitle}</p>

          <div className="welcome-actions">
            {content.actions.map((action) => (
              <Link key={action.to} to={action.to} className="btn-primary">
                {action.label}
              </Link>
            ))}
          </div>

          <div className="welcome-highlight">
            <span>{content.highlight}</span>
          </div>
        </div>

        <div className="hero-visual welcome-visual">
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Fast checkout</h3>
              <p>Jump straight into service booking without starting over.</p>
            </div>
            <div className="feature-card">
              <h3>Saved preferences</h3>
              <p>See your favorite services, locations, and trusted partners first.</p>
            </div>
            <div className="feature-card">
              <h3>Action center</h3>
              <p>Keep track of requests, bookings, and updates in one place.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    const role = user?.role || 'customer';
    const content = role === 'provider'
      ? { title: 'Your partner workspace is ready.' }
      : role === 'admin'
      ? { title: 'Admin control center.' }
      : { title: 'Your home care is waiting.' };

    return (
      <PageShell title={content.title} description="Welcome back">
        <LoggedInHome user={user} />
      </PageShell>
    );
  }

  return (
    <>
      <Hero />
      <PopularServices />
      <WhyChoose />
      <HowItWorks />
      <Testimonials />
      <PartnerCTA />
    </>
  );
};

export default Home;

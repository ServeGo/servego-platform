import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Route-level code splitting: each admin tab loads on demand instead of being
// bundled into the single initial chunk (Feature 25 — lazy loading).
const AdminDashboardTab = lazy(() => import('./Tabs/AdminDashboardTab'));
const AdminCustomersTab = lazy(() => import('./Tabs/AdminCustomersTab'));
const AdminProvidersTab = lazy(() => import('./Tabs/AdminProvidersTab'));
const AdminServiceRequestsTab = lazy(() => import('./Tabs/AdminServiceRequestsTab'));
const AdminServicesTab = lazy(() => import('./Tabs/AdminServicesTab'));
const AdminBookingsTab = lazy(() => import('./Tabs/AdminBookingsTab'));
const AdminTicketsTab = lazy(() => import('./Tabs/AdminTicketsTab'));
const AdminAnalyticsTab = lazy(() => import('./Tabs/AdminAnalyticsTab'));
const AdminSettingsTab = lazy(() => import('./Tabs/AdminSettingsTab'));
const AdminReviewsTab = lazy(() => import('./Tabs/AdminReviewsTab'));
const AdminReportsTab = lazy(() => import('./Tabs/AdminReportsTab'));
const AdminServeGoTab = lazy(() => import('./Tabs/AdminServeGoTab'));
const AdminPermanentServicesTab = lazy(() => import('./Tabs/AdminPermanentServicesTab'));
const AdminDisputesTab = lazy(() => import('./Tabs/AdminDisputesTab'));
const AdminFeatureFlagsTab = lazy(() => import('./Tabs/AdminFeatureFlagsTab'));
const AdminBackupsTab = lazy(() => import('./Tabs/AdminBackupsTab'));

function TabFallback() {
  return (
    <div className="flex items-center gap-2 text-slate-400 text-xs py-16 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </div>
  );
}

function LazyTab({ children }) {
  return <Suspense fallback={<TabFallback />}>{children}</Suspense>;
}

export default function AdminPanelTabsRouter({ activeTab, tabProps }) {
  switch (activeTab) {
    case 'dashboard':
      return <LazyTab><AdminDashboardTab {...tabProps} /></LazyTab>;
    case 'customers':
      return <LazyTab><AdminCustomersTab {...tabProps} /></LazyTab>;
    case 'providers':
      return <LazyTab><AdminProvidersTab {...tabProps} /></LazyTab>;
    case 'providerServiceRequests':
      return <LazyTab><AdminServiceRequestsTab /></LazyTab>;
    case 'services':
      return <LazyTab><AdminServicesTab {...tabProps} /></LazyTab>;
    case 'bookings':
      return <LazyTab><AdminBookingsTab {...tabProps} /></LazyTab>;
    case 'tickets':
      return <LazyTab><AdminTicketsTab {...tabProps} /></LazyTab>;
    case 'analytics':
      return <LazyTab><AdminAnalyticsTab /></LazyTab>;
    case 'settings':
      return <LazyTab><AdminSettingsTab {...tabProps} /></LazyTab>;
    case 'servego':
      return <LazyTab><AdminServeGoTab /></LazyTab>;

    case 'permanentServiceRequests':
      return <LazyTab><AdminPermanentServicesTab {...tabProps} /></LazyTab>;

    case 'disputes':
      return <LazyTab><AdminDisputesTab /></LazyTab>;

    case 'featureFlags':
      return <LazyTab><AdminFeatureFlagsTab /></LazyTab>;

    case 'backups':
      return <LazyTab><AdminBackupsTab /></LazyTab>;

    // Optional sidebar entries that currently have no dedicated implementation.
    // Keeping them mapped to existing tabs prevents the UI from appearing broken/blank.
    case 'reviews':
      return <LazyTab><AdminReviewsTab {...tabProps} /></LazyTab>;
    case 'reports':
      return <LazyTab><AdminReportsTab {...tabProps} /></LazyTab>;


    default:
      return <LazyTab><AdminDashboardTab {...tabProps} /></LazyTab>;
  }
}

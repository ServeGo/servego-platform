import React, { Suspense, lazy, Component } from 'react';
import { Loader2 } from 'lucide-react';

// Route-level code splitting: each admin tab loads on demand instead of being
// bundled into the single initial chunk (Feature 25 — lazy loading).

// A failed tab `import()` is almost always NOT a code bug: it's either a
// transient network blip or a stale deployment (the browser still holds an old
// index.html that references asset hashes the CDN no longer serves). Auto-retry
// once so a blip self-heals; if it still fails, the error boundary recognises
// the failure as a chunk-load error and offers a hard reload that pulls the
// current app shell instead of a "Retry" that re-requests the same dead hash.
const CHUNK_FAILURE_RE = /failed to fetch dynamically imported module|loading chunk|error loading chunk/i;

export function isChunkLoadError(error) {
  return (
    (error && error.name === 'ChunkLoadError') ||
    CHUNK_FAILURE_RE.test((error && error.message) || '')
  );
}

function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((error) => {
      if (!isChunkLoadError(error) || typeof window === 'undefined') throw error;
      return new Promise((resolve) => {
        window.setTimeout(() => resolve(factory()), 1500);
      });
    })
  );
}

const AdminDashboardTab = lazyWithRetry(() => import('./Tabs/AdminDashboardTab'));
const AdminCustomersTab = lazyWithRetry(() => import('./Tabs/AdminCustomersTab'));
const AdminProvidersTab = lazyWithRetry(() => import('./Tabs/AdminProvidersTab'));
const AdminServiceRequestsTab = lazyWithRetry(() => import('./Tabs/AdminServiceRequestsTab'));
const AdminServicesTab = lazyWithRetry(() => import('./Tabs/AdminServicesTab'));
const AdminBookingsTab = lazyWithRetry(() => import('./Tabs/AdminBookingsTab'));
const AdminTicketsTab = lazyWithRetry(() => import('./Tabs/AdminTicketsTab'));
const AdminAnalyticsTab = lazyWithRetry(() => import('./Tabs/AdminAnalyticsTab'));
const AdminSettingsTab = lazyWithRetry(() => import('./Tabs/AdminSettingsTab'));
const AdminReviewsTab = lazyWithRetry(() => import('./Tabs/AdminReviewsTab'));
const AdminReportsTab = lazyWithRetry(() => import('./Tabs/AdminReportsTab'));
const AdminServeGoTab = lazyWithRetry(() => import('./Tabs/AdminServeGoTab'));
const AdminPermanentServicesTab = lazyWithRetry(() => import('./Tabs/AdminPermanentServicesTab'));
const AdminManualBookingRequestsTab = lazyWithRetry(() => import('./Tabs/AdminManualBookingRequestsTab'));
const AdminFeatureFlagsTab = lazyWithRetry(() => import('./Tabs/AdminFeatureFlagsTab'));

function TabFallback() {
  return (
    <div className="flex items-center gap-2 text-slate-400 text-xs py-16 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </div>
  );
}

// A tab crash must never blank the whole admin panel. This boundary renders a
// friendly, actionable message + retry instead of unmounting the app tree.
class TabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, isChunkLoadError: false };
  }

  static getDerivedStateFromError(error) {
    return { error, isChunkLoadError: isChunkLoadError(error) };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Admin tab crashed:', error, info);
  }

  handleRetry = () => {
    if (this.state.isChunkLoadError) {
      // The chunk hash is gone from the deployment — re-rendering would just
      // re-request the same dead URL. Reloading the shell pulls fresh assets.
      window.location.reload();
      return;
    }
    this.setState({ error: null, isChunkLoadError: false });
  };

  render() {
    if (this.state.error) {
      const isStaleChunk = this.state.isChunkLoadError;
      return (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-extrabold text-rose-700">This section failed to load.</p>
          <p className="text-xs text-slate-500">
            {isStaleChunk
              ? 'The app was updated while this page was open. Reloading will load the latest version.'
              : 'Something went wrong rendering this tab. Your data is safe — refresh the page or retry.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="text-xs font-black px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            {isStaleChunk ? 'Reload page' : 'Retry'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LazyTab({ children }) {
  return (
    <TabErrorBoundary>
      <Suspense fallback={<TabFallback />}>{children}</Suspense>
    </TabErrorBoundary>
  );
}

export default function AdminPanelTabsRouter({ activeTab, tabProps }) {
  let tabContent;
  switch (activeTab) {
    case 'dashboard':
      tabContent = <AdminDashboardTab {...tabProps} />;
      break;
    case 'customers':
      tabContent = <AdminCustomersTab {...tabProps} />;
      break;
    case 'providers':
      tabContent = <AdminProvidersTab {...tabProps} />;
      break;
    case 'providerServiceRequests':
      tabContent = <AdminServiceRequestsTab />;
      break;
    case 'services':
      tabContent = <AdminServicesTab {...tabProps} />;
      break;
    case 'bookings':
      tabContent = <AdminBookingsTab {...tabProps} />;
      break;
    case 'tickets':
      tabContent = <AdminTicketsTab {...tabProps} />;
      break;
    case 'analytics':
      tabContent = <AdminAnalyticsTab />;
      break;
    case 'settings':
      tabContent = <AdminSettingsTab {...tabProps} />;
      break;
    case 'featureFlags':
      tabContent = <AdminFeatureFlagsTab />;
      break;
    case 'servego':
      tabContent = <AdminServeGoTab />;
      break;
    case 'permanentServiceRequests':
      tabContent = <AdminPermanentServicesTab {...tabProps} />;
      break;
    case 'manualBookingRequests':
      tabContent = <AdminManualBookingRequestsTab {...tabProps} />;
      break;

    // Optional sidebar entries that currently have no dedicated implementation.
    // Keeping them mapped to existing tabs prevents the UI from appearing broken/blank.
    case 'reviews':
      tabContent = <AdminReviewsTab {...tabProps} />;
      break;
    case 'reports':
      tabContent = <AdminReportsTab {...tabProps} />;
      break;

    default:
      tabContent = <AdminDashboardTab {...tabProps} />;
      break;
  }

  return (
    // Key by activeTab so each tab mount gets a FRESH error boundary. If the
    // boundary were shared across tabs, one tab's crash would leave it in the
    // error state forever and every subsequent tab would show
    // "This section failed to load." — the exact bug that made one failing tab
    // take down the whole admin panel.
    <LazyTab key={activeTab}>{tabContent}</LazyTab>
  );
}

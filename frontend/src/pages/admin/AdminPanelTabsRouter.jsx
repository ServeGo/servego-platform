import React from 'react';

import AdminDashboardTab from './Tabs/AdminDashboardTab';
import AdminCustomersTab from './Tabs/AdminCustomersTab';
import AdminProvidersTab from './Tabs/AdminProvidersTab';
import AdminServiceRequestsTab from './Tabs/AdminServiceRequestsTab';
import AdminServicesTab from './Tabs/AdminServicesTab';
import AdminBookingsTab from './Tabs/AdminBookingsTab';
import AdminTicketsTab from './Tabs/AdminTicketsTab';
import AdminAnalyticsTab from './Tabs/AdminAnalyticsTab';
import AdminSettingsTab from './Tabs/AdminSettingsTab';
import AdminReviewsTab from './Tabs/AdminReviewsTab';
import AdminReportsTab from './Tabs/AdminReportsTab';
import AdminServeGoTab from './Tabs/AdminServeGoTab';
import AdminPermanentServicesTab from './Tabs/AdminPermanentServicesTab';
import AdminDisputesTab from './Tabs/AdminDisputesTab';


export default function AdminPanelTabsRouter({ activeTab, tabProps }) {
  switch (activeTab) {
    case 'dashboard':
      return <AdminDashboardTab {...tabProps} />;
    case 'customers':
      return <AdminCustomersTab {...tabProps} />;
    case 'providers':
      return <AdminProvidersTab {...tabProps} />;
    case 'providerServiceRequests':
      return <AdminServiceRequestsTab />;
    case 'services':
      return <AdminServicesTab {...tabProps} />;
    case 'bookings':
      return <AdminBookingsTab {...tabProps} />;
    case 'tickets':
      return <AdminTicketsTab {...tabProps} />;
    case 'analytics':
      return <AdminAnalyticsTab />;
    case 'settings':
      return <AdminSettingsTab {...tabProps} />;
    case 'servego':
      return <AdminServeGoTab />;

    case 'permanentServiceRequests':
      return <AdminPermanentServicesTab {...tabProps} />;

    case 'disputes':
      return <AdminDisputesTab />;

    // Optional sidebar entries that currently have no dedicated implementation.
    // Keeping them mapped to existing tabs prevents the UI from appearing broken/blank.
    case 'reviews':
      return <AdminReviewsTab {...tabProps} />;
    case 'reports':
      return <AdminReportsTab {...tabProps} />;


    default:
      return <AdminDashboardTab {...tabProps} />;
  }
}



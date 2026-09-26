import React, { useState } from 'react';

import { useAdminPanelController } from '../hooks/useAdminPanelController';
import AdminPanelTabsRouter from './admin/AdminPanelTabsRouter';

export const AdminPanel = ({ activeTab: activeTabProp, setActiveTabExternal }) => {
  const {

    // data
    providers,
    providersList,
    // manual booking requests use the same provider directory for assignment
    bookings,
    tickets,
    services,
    customersList,

    // dashboard stats
    adminCommission,
    adminSummaryLoading,
    pendingPartnersCount,
    activeTicketsCount,

    // tickets
    activeTicketId,
    ticketResponse,
    setTicketResponse,
    setActiveTicketId,
    handleTicketResolveSubmit,

    // providers
    handlePartnerApproval,

    // services
    isAdmin,
    isAddingService,
    isEditingService,
    isSubmittingService,
    servicesLoading,
    newServiceForm,
    editServiceForm,
    serviceAddError,
    serviceAddSuccess,
    serviceEditError,
    serviceEditSuccess,
    submitNewService,
    submitEditService,
    openAddService,
    closeAddService,
    openEditService,
    closeEditService,
    setNewServiceForm,
    setEditServiceForm,
    deleteService,
    hideService,
    updateService,
    editServiceId,
    partnerCountForService,

    // misc
    updateBookingStatus,
  } = useAdminPanelController();

  const [internalActiveTab, setInternalActiveTab] = useState('dashboard');

  const isControlledTabs = activeTabProp !== undefined && activeTabProp !== null;

  // Single source of truth:
  // - Controlled mode: always read activeTabProp and always write via setActiveTabExternal.
  // - Uncontrolled mode: always read/write internalActiveTab.
  if (isControlledTabs && typeof setActiveTabExternal !== 'function') {
    // Strict mode: avoid mixed state desync (UI may render one tab but handlers update another).
    // eslint-disable-next-line no-console
    console.warn(
      'AdminPanel: activeTab prop provided without setActiveTabExternal. ' +
        'Tab control should be controlled (prop) OR uncontrolled (internal), not both.'
    );
  }

  const activeTab = isControlledTabs ? activeTabProp : internalActiveTab;
  const setActiveTab = isControlledTabs
    ? (typeof setActiveTabExternal === 'function' ? setActiveTabExternal : undefined)
    : setInternalActiveTab;

  const onOverrideCancel = async (bookingId) => {
    const result = await updateBookingStatus(bookingId, 'cancelled', 'Cancelled by administrator override.');
    if (result?.error) {
      // Show error via toast (assuming ToastContext is available)
      console.error('Admin cancel failed:', result.error);
      alert(`Failed to cancel booking: ${result.error}`);
    }
  };

  const tabProps = {
    // customers
    customersList,

    // dashboard
    adminCommission,
    adminSummaryLoading,
    pendingPartnersCount,
    activeTicketsCount,
    bookings,
    providers,
    handlePartnerApproval,
    setActiveTab,
    activeTab,

    // providers
    providersList,

    // services
    isAdmin,
    isAddingService,
    isEditingService,
    isSubmittingService,
    servicesLoading,
    newServiceForm,
    editServiceForm,
    serviceAddError,
    serviceAddSuccess,
    serviceEditError,
    serviceEditSuccess,
    submitNewService,
    submitEditService,
    openAddService,
    closeAddService,
    openEditService,
    closeEditService,
    setNewServiceForm,
    setEditServiceForm,
    services,
    hideService,
    deleteService,
    updateService,
    editServiceId,
    partnerCountForService,

    // bookings
    onOverrideCancel,

    // tickets
    tickets,
    activeTicketId,
    ticketResponse,
    setTicketResponse,
    setActiveTicketId,
    handleTicketResolveSubmit,
  };

  return (
    <div id="admin-panel-page" className="bg-slate-50 min-h-screen py-8 px-4 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        <AdminPanelTabsRouter activeTab={activeTab} tabProps={tabProps} />
      </div>
    </div>
  );
};



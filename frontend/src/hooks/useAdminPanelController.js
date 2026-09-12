import { useEffect, useMemo, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';
import { isOpenTicket } from '../utils/normalizeAdminData';


const normalize = (s) => (s || '').toString().trim().toLowerCase();

export function useAdminPanelController() {
  const { currentUser } = useAuth();
  const {
    providers,
    bookings,
    tickets,
    respondToTicket,
    verifyProvider,
    updateBookingStatus,
    users,
    services,
    adminServices,
    fetchAdminServices,
    createService,
    updateService,
    deleteService,
    hideService,
    providerServiceRequests,
    fetchProviderServiceRequests,
    approveProviderServiceRequest,
    denyProviderServiceRequest,
  } = useData();

  const isAdmin = currentUser?.role === 'admin';

  // Admin ops console shows every category, including hidden ones. The public
  // catalog (services) never returns hidden rows, so we fetch the admin list on
  // mount and fall back to the catalog while it loads. The data context also
  // refreshes it after every create/update/hide/delete.
  useEffect(() => {
    fetchAdminServices();
  }, [fetchAdminServices]);

  const serviceList = Array.isArray(adminServices) && adminServices.length
    ? adminServices
    : services;

  const [activeTicketId, setActiveTicketId] = useState(null);
  const [ticketResponse, setTicketResponse] = useState('');

  // SERVICES admin form
  const [isAddingService, setIsAddingService] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);

  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    description: '',
    popularIssuesText: '',
    imageUrl: '',
  });

  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    description: '',
    popularIssuesText: '',
    imageUrl: '',
  });

  const [serviceAddError, setServiceAddError] = useState('');
  const [serviceAddSuccess, setServiceAddSuccess] = useState('');
  const [serviceEditError, setServiceEditError] = useState('');
  const [serviceEditSuccess, setServiceEditSuccess] = useState('');

  const customersList = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    return list.filter((u) => u?.role === 'customer');
  }, [users]);

  const providersList = useMemo(() => {
    return providers || [];
  }, [providers]);

  const totalVolume = useMemo(() => {
    const bookingList = Array.isArray(bookings) ? bookings : [];
    return bookingList.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  }, [bookings]);

  const pendingPartnersCount = useMemo(() => {
    return (Array.isArray(providerServiceRequests) ? providerServiceRequests : []).filter(r => r.status === 'PENDING').length;
  }, [providerServiceRequests]);

  const activeTicketsCount = useMemo(() => {
    return (Array.isArray(tickets) ? tickets : []).filter((t) => isOpenTicket(t)).length;
  }, [tickets]);



  const handleTicketResolveSubmit = (tId) => {
    if (!ticketResponse.trim()) return;
    respondToTicket(tId, ticketResponse);
    setActiveTicketId(null);
    setTicketResponse('');
  };

  const handlePartnerApproval = (pId) => {
    verifyProvider(pId);
  };

  const partnerCountForService = (serviceName) => {
    const sn = normalize(serviceName);
    const svc = (Array.isArray(serviceList) ? serviceList : []).find(s => normalize(s.name) === sn);
    // Prefer the derived activeSpecialistCount from the backend (correct per spec)
    if (svc && typeof svc.activeSpecialistCount === 'number') return svc.activeSpecialistCount;
    // Fallback: count providers whose category matches
    return (providers || []).filter((p) => normalize(p.category) === sn).length;
  };

  const openAddService = () => {
    setIsSubmittingService(false);
    setServiceAddError('');
    setServiceAddSuccess('');
    setNewServiceForm({ name: '', description: '', popularIssuesText: '', imageUrl: '' });
    setIsAddingService(true);
  };

  const closeAddService = () => {
    setIsSubmittingService(false);
    setIsAddingService(false);
    setServiceAddError('');
    setServiceAddSuccess('');
  };

  const openEditService = (cat) => {
    setIsSubmittingService(false);
    setServiceEditError('');
    setServiceEditSuccess('');
    setEditServiceId(cat.id);
    setEditServiceForm({
      name: cat.name || '',
      description: cat.description || '',
      popularIssuesText: Array.isArray(cat.popularIssues) ? cat.popularIssues.join(', ') : '',
      imageUrl: cat.image || '',
    });
    setIsEditingService(true);
  };

  const closeEditService = () => {
    setIsSubmittingService(false);
    setIsEditingService(false);
    setEditServiceId(null);
    setServiceEditError('');
    setServiceEditSuccess('');
    setEditServiceForm({ name: '', description: '', popularIssuesText: '', imageUrl: '' });
  };

  const submitNewService = async (e) => {
    e.preventDefault();
    setServiceAddError('');
    setServiceAddSuccess('');

    const { name, description, popularIssuesText, imageUrl } = newServiceForm;

    if (!name.trim()) {
      setServiceAddError('Service name is required.');
      return;
    }
    if (!imageUrl.trim()) {
      setServiceAddError('A service photo is required — upload one before saving the service.');
      return;
    }

    const popularIssues = popularIssuesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      role: 'admin',
      name: name.trim(),
      description: (description || '').trim(),
      popularIssues,
      image: imageUrl.trim(),
    };

    setIsSubmittingService(true);
    const resp = await createService(payload);

    if (!resp?.id && !resp?.createdAt) {
      setServiceAddError(resp?.message || resp?.error || 'Failed to create service.');
      setIsSubmittingService(false);
      return;
    }

    // Keep the button locked on "Submitting…" until the modal auto-closes so
    // there is never a silent gap between the request finishing and the close.
    setServiceAddSuccess('Service added successfully.');
    setTimeout(() => {
      setServiceAddSuccess('');
      closeAddService();
    }, 650);
  };

  const submitEditService = async (e) => {
    e.preventDefault();
    setServiceEditError('');
    setServiceEditSuccess('');

    const { name, description, popularIssuesText, imageUrl } = editServiceForm;
    if (!name.trim()) {
      setServiceEditError('Service name is required.');
      return;
    }

    const popularIssues = popularIssuesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      role: 'admin',
      name: name.trim(),
      description: (description || '').trim(),
      popularIssues,
    };
    if (imageUrl.trim()) payload.image = imageUrl.trim();

    setIsSubmittingService(true);
    const resp = await updateService(editServiceId, payload);

    const updated = resp?.service || resp?.data?.service || resp;
    if (resp?.error || !updated?.id) {
      setServiceEditError(resp?.message || resp?.error || 'Failed to update service.');
      setIsSubmittingService(false);
      return;
    }

    setServiceEditSuccess('Service updated successfully.');
    setTimeout(() => {
      setServiceEditSuccess('');
      closeEditService();
    }, 650);
  };

  return {
    // data
    isAdmin,
    currentUser,
    users,
    providers,
    providersList,
    services: serviceList,
    bookings: Array.isArray(bookings) ? bookings : [],
    tickets: Array.isArray(tickets) ? tickets : [],
    customersList,

    // dashboard stats
    totalVolume,
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
    isAddingService,
    isEditingService,
    isSubmittingService,
    editServiceId,

    newServiceForm,
    editServiceForm,
    serviceAddError,
    serviceAddSuccess,
    serviceEditError,
    serviceEditSuccess,

    openAddService,
    closeAddService,
    openEditService,
    closeEditService,
    setNewServiceForm,
    setEditServiceForm,
    submitNewService,
    submitEditService,

    partnerCountForService,

    hideService,

    // misc admin
    fetchProviderServiceRequests,
    providerServiceRequests,
    approveProviderServiceRequest,
    denyProviderServiceRequest,
    updateBookingStatus,
  };
}


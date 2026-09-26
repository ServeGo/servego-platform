import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useData } from '../context/AppContext';
import { api as apiClient } from '../utils/apiClient';
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
    servicesLoading,
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

  // Self-contained admin commission fetch — the shared DataContext stays
  // untouched. `GET /admin/dashboard` is admin-only and already returns
  // `aggregates.platformEarnings` (sum of customer + provider platform charges
  // over non-cancelled bookings = what the platform actually earns).
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminSummaryLoading, setAdminSummaryLoading] = useState(isAdmin);
  // Guard so React StrictMode's dev double-mount does not fire the same request
  // twice (real panel re-mounts get a fresh ref).
  const dashboardFetchedRef = useRef(false);
  useEffect(() => {
    console.log('[AdminDashboard] Effect running, isAdmin:', isAdmin, 'currentUser:', currentUser?.role, 'fetched:', dashboardFetchedRef.current);
    if (!isAdmin) {
      console.log('[AdminDashboard] Not admin, skipping fetch');
      setAdminSummary(null);
      setAdminSummaryLoading(false);
      return undefined;
    }
    if (dashboardFetchedRef.current) {
      console.log('[AdminDashboard] Already fetched, skipping');
      return undefined;
    }
    dashboardFetchedRef.current = true;
    setAdminSummaryLoading(true);
    console.log('[AdminDashboard] Fetching /admin/dashboard...');
    apiClient.get('/admin/dashboard')
      .then((res) => { 
        console.log('[AdminDashboard] API response:', { ok: res.ok, status: res.status, data: res.data });
        setAdminSummary(res.ok ? res.data : null); 
      })
      .catch((err) => { 
        console.error('[AdminDashboard] API error:', err); 
        setAdminSummary(null); 
      })
      .finally(() => setAdminSummaryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Admin ops console shows every category, including hidden ones. The public
  // catalog (services) never returns hidden rows, so the Services tab fetches
  // the admin list itself on first mount (see AdminServicesTab) and the data
  // context refreshes it after every create/update/hide/delete.
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
    imageUrl: '',
  });

  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    description: '',
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

  // Admin commission = platform earnings from the dedicated dashboard endpoint.
  // Falls back to 0 while the summary loads or on error.
  const adminCommission = useMemo(() => {
    return Number(adminSummary?.aggregates?.platformEarnings) || 0;
  }, [adminSummary]);

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
    setNewServiceForm({ name: '', description: '', imageUrl: '' });
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
    setEditServiceForm({ name: '', description: '', imageUrl: '' });
  };

  const submitNewService = async (e) => {
    e.preventDefault();
    setServiceAddError('');
    setServiceAddSuccess('');

    const { name, description, imageUrl } = newServiceForm;

    if (!name.trim()) {
      setServiceAddError('Service name is required.');
      return;
    }
    if (!description.trim()) {
      setServiceAddError('Service description is required.');
      return;
    }
    if (!imageUrl.trim()) {
      setServiceAddError('A service photo is required — upload one before saving the service.');
      return;
    }

    const payload = {
      role: 'admin',
      name: name.trim(),
      description: (description || '').trim(),
      image: imageUrl.trim(),
    };

    setIsSubmittingService(true);
    const resp = await createService(payload);

    if (resp?.error || (!resp?.data?.id && !resp?.id)) {
      setServiceAddError(resp?.message || resp?.error || 'Failed to create service.');
      setIsSubmittingService(false);
      return;
    }

    closeAddService();
  };

  const submitEditService = async (e) => {
    e.preventDefault();
    setServiceEditError('');
    setServiceEditSuccess('');

    const { name, description, imageUrl } = editServiceForm;
    if (!name.trim()) {
      setServiceEditError('Service name is required.');
      return;
    }
    if (!description.trim()) {
      setServiceEditError('Service description is required.');
      return;
    }

    const payload = {
      role: 'admin',
      name: name.trim(),
      description: (description || '').trim(),
    };
    if (imageUrl.trim()) payload.image = imageUrl.trim();

    setIsSubmittingService(true);
    const resp = await updateService(editServiceId, payload);

    // apiClient unwraps { success, data } → data is { service: { id } } for updates
    if (resp?.error || (!resp?.service?.id && !resp?.data?.id && !resp?.id)) {
      setServiceEditError(resp?.message || resp?.error || 'Failed to update service.');
      setIsSubmittingService(false);
      return;
    }

    closeEditService();
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
    isAddingService,
    isEditingService,
    isSubmittingService,
    servicesLoading,
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

